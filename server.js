/* ═══════════════════════════════════════════════════════
   AYALYM — Servidor Express
   Sirve los archivos estáticos + endpoint /api/push
   para enviar notificaciones FCM a dispositivos móviles
   ═══════════════════════════════════════════════════════ */
const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ── /api/push ──────────────────────────────────────────
   Body: { tokens: string[], title: string, body: string }
   Usa FCM Legacy HTTP API para entregar la notificación
   incluso con la app cerrada en móvil.
   ──────────────────────────────────────────────────────── */
app.post('/api/push', async (req, res) => {
  const FCM_KEY = process.env.FCM_SERVER_KEY || '';
  const { tokens, title, body } = req.body || {};

  if (!Array.isArray(tokens) || !tokens.length) {
    return res.json({ ok: true, sent: 0, reason: 'no-tokens' });
  }
  if (!FCM_KEY) {
    return res.json({ ok: false, reason: 'no-fcm-key' });
  }

  try {
    const payload = {
      registration_ids: tokens.slice(0, 500),
      notification: {
        title: title || 'AYALYM',
        body:  body  || '',
        icon:  '/img/logo.png'
      },
      webpush: {
        notification: {
          title: title || 'AYALYM',
          body:  body  || '',
          icon:  '/img/logo.png',
          badge: '/img/logo.png',
          requireInteraction: false,
          vibrate: [200, 100, 200]
        },
        fcm_options: { link: '/app.html' }
      },
      android: {
        notification: {
          icon:  'ic_notification',
          color: '#185FA5',
          sound: 'default'
        }
      }
    };

    const r = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `key=${FCM_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await r.json();
    console.log('[push] sent to', tokens.length, 'devices →', result.success, 'ok,', result.failure, 'fail');
    res.json({ ok: true, sent: tokens.length, result });
  } catch (e) {
    console.error('[push] error:', e.message);
    res.json({ ok: false, error: e.message });
  }
});

/* SPA fallback: todas las rutas sin archivo sirven app.html */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AYALYM corriendo en puerto ${PORT}`));
