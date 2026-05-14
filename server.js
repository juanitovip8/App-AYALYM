/* ═══════════════════════════════════════════════════════
   AYALYM — Servidor Express
   Sirve archivos estáticos + endpoint /api/push
   Usa Web Push con VAPID (independiente de FCM legacy)
   ═══════════════════════════════════════════════════════ */
const express = require('express');
const webpush = require('web-push');
const path    = require('path');
const app     = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ── VAPID ──────────────────────────────────────────────
   Configurar en Railway:
     VAPID_PUBLIC_KEY  = BODy9QBNnNx_TyTwD62uDqYfszR9dBtz_qO6umCLHcqUHPza6cuJIj_9enoiY-wdR2L6JLQWtjmbUsjL7mzHRZ8
     VAPID_PRIVATE_KEY = Ik7C30Kfw4QhpQz1AMb8UwrBjGtBh8XZ1FnMPJ9tMgU
   ──────────────────────────────────────────────────────── */
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BODy9QBNnNx_TyTwD62uDqYfszR9dBtz_qO6umCLHcqUHPza6cuJIj_9enoiY-wdR2L6JLQWtjmbUsjL7mzHRZ8';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

const FIREBASE_PROJECT = 'ayalym-app';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCPOysCjAn45mIYNX9L0ePrwIPOHRh56MM';
const FIRESTORE_BASE   = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

if (VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:app@ayalym.com', VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('[push] VAPID configurado correctamente ✅');
} else {
  console.error('[push] ❌ VAPID_PRIVATE_KEY no configurada — las notificaciones push NO funcionarán');
}

/* ── Leer suscripciones de Firestore (server-side) ──── */
async function getPushSubs(role) {
  try {
    const url = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'push_subs' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'role' },
              op:    'EQUAL',
              value: { stringValue: role }
            }
          }
        }
      })
    });
    if (!res.ok) {
      console.warn('[push] Firestore query HTTP', res.status);
      return [];
    }
    const docs = await res.json();
    const subs = [];
    for (const d of docs) {
      if (!d.document) continue;
      const fields = d.document.fields || {};
      const subField = fields.sub;
      if (!subField) continue;
      /* El campo sub se guardó como mapValue */
      const sub = firestoreValueToJS(subField);
      if (sub && sub.endpoint) subs.push(sub);
    }
    console.log(`[push] ${subs.length} suscripción(es) para rol "${role}"`);
    return subs;
  } catch (e) {
    console.error('[push] Error leyendo Firestore:', e.message);
    return [];
  }
}

/* Convierte un valor Firestore REST a JS */
function firestoreValueToJS(val) {
  if (!val) return null;
  if (val.stringValue  !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue);
  if (val.doubleValue  !== undefined) return parseFloat(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue    !== undefined) return null;
  if (val.mapValue) {
    const out = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) out[k] = firestoreValueToJS(v);
    return out;
  }
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map(firestoreValueToJS);
  }
  return null;
}

/* ── /api/push ──────────────────────────────────────────
   Body: { role, title, body }   ← cliente solo manda el rol
   El servidor lee subs de Firestore y envía el push.
   ──────────────────────────────────────────────────────── */
app.post('/api/push', async (req, res) => {
  if (!VAPID_PRIVATE) {
    console.error('[push] Rechazado: VAPID_PRIVATE_KEY no configurada');
    return res.json({ ok: false, reason: 'no-vapid-key' });
  }

  const { role, title, body } = req.body || {};
  if (!role) return res.json({ ok: false, reason: 'missing-role' });

  const subscriptions = await getPushSubs(role);
  if (!subscriptions.length) {
    console.log(`[push] Sin suscripciones para rol "${role}" — notificación interna guardada en Firebase`);
    return res.json({ ok: true, sent: 0, reason: 'no-subscriptions' });
  }

  const payload = JSON.stringify({
    title: title || 'AYALYM',
    body:  body  || '',
    icon:  '/img/logo.png',
    badge: '/img/logo.png'
  });

  let sent = 0, failed = 0, expired = 0;
  await Promise.all(subscriptions.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        expired++; /* Suscripción expirada — ignorar */
      } else {
        console.warn(`[push] Error enviando a ${sub.endpoint?.slice(0,60)}... código:`, e.statusCode, e.message);
        failed++;
      }
    }
  }));

  console.log(`[push] "${title}" → rol "${role}": ${sent} enviadas, ${failed} fallidas, ${expired} expiradas`);
  res.json({ ok: true, sent, failed, expired });
});

/* ── /api/push-status — Diagnóstico ────────────────────── */
app.get('/api/push-status', async (req, res) => {
  const roles = ['admin', 'supervisor', 'trabajador', 'personal_inm', 'cliente', 'cliente_inm'];
  const result = { vapidOk: !!VAPID_PRIVATE, subscriptions: {} };
  for (const r of roles) {
    const subs = await getPushSubs(r);
    result.subscriptions[r] = subs.length;
  }
  res.json(result);
});

/* SPA fallback */
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'app.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AYALYM corriendo en puerto ${PORT}`));
