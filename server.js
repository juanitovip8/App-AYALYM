/* ═══════════════════════════════════════════════════════
   AYALYM — Servidor Express
   Sirve archivos estáticos + endpoint /api/push
   Usa Web Push con VAPID (independiente de FCM legacy)
   ═══════════════════════════════════════════════════════ */
const express  = require('express');
const webpush  = require('web-push');
const path     = require('path');
const app      = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ── Configurar VAPID ───────────────────────────────────
   Variables de entorno en Railway:
     VAPID_PUBLIC_KEY  = BODy9QBNnNx_TyTwD62uDqYfszR9dBtz_qO6umCLHcqUHPza6cuJIj_9enoiY-wdR2L6JLQWtjmbUsjL7mzHRZ8
     VAPID_PRIVATE_KEY = Ik7C30Kfw4QhpQz1AMb8UwrBjGtBh8XZ1FnMPJ9tMgU
   ──────────────────────────────────────────────────────── */
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BODy9QBNnNx_TyTwD62uDqYfszR9dBtz_qO6umCLHcqUHPza6cuJIj_9enoiY-wdR2L6JLQWtjmbUsjL7mzHRZ8';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:app@ayalym.com', VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn('[push] VAPID_PRIVATE_KEY no configurada — push deshabilitado');
}

/* ── /api/push ──────────────────────────────────────────
   Body: {
     subscriptions: [{endpoint, keys:{p256dh, auth}}, ...],
     title: string,
     body:  string
   }
   ──────────────────────────────────────────────────────── */
app.post('/api/push', async (req, res) => {
  if (!VAPID_PRIVATE) return res.json({ ok: false, reason: 'no-vapid-key' });

  const { subscriptions, title, body } = req.body || {};
  if (!Array.isArray(subscriptions) || !subscriptions.length) {
    return res.json({ ok: true, sent: 0, reason: 'no-subscriptions' });
  }

  const payload = JSON.stringify({
    title: title || 'AYALYM',
    body:  body  || '',
    icon:  '/img/logo.png',
    badge: '/img/logo.png'
  });

  let sent = 0, failed = 0;
  await Promise.all(subscriptions.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      /* 410 Gone = suscripción expirada/eliminada → ignorar */
      if (e.statusCode !== 410) console.warn('[push] error sub:', e.statusCode, e.message);
      failed++;
    }
  }));

  console.log(`[push] enviado: ${sent} ok, ${failed} fallidos`);
  res.json({ ok: true, sent, failed });
});

/* SPA fallback */
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'app.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AYALYM corriendo en puerto ${PORT}`));
