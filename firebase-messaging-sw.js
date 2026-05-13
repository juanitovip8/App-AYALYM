/* ═══════════════════════════════════════════════════════
   AYALYM — Service Worker para Web Push
   Muestra notificaciones push aunque la app esté cerrada.
   No depende de FCM legacy — usa el protocolo Web Push.
   ═══════════════════════════════════════════════════════ */

/* ── Recibir push desde el servidor ── */
self.addEventListener('push', e => {
  let data = { title: 'AYALYM', body: '' };
  try { data = e.data ? e.data.json() : data; } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title || 'AYALYM', {
      body:    data.body  || '',
      icon:    data.icon  || '/img/logo.png',
      badge:   data.badge || '/img/logo.png',
      vibrate: [200, 100, 200],
      data:    { url: '/app.html' }
    })
  );
});

/* ── Al hacer clic en la notificación: enfocar/abrir la app ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/app.html') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('/app.html');
    })
  );
});

/* ── Activar inmediatamente sin esperar a recargar ── */
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('install',  () => self.skipWaiting());
