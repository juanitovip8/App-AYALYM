/* ═══════════════════════════════════════════════════════
   AYALYM — Service Worker
   1. Caché de activos estáticos (cache-first)
   2. Web Push notifications
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'ayalym-v7';

/* ── Instalar: activar inmediatamente sin pre-cachear (evita fallos de instalación) ── */
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

/* ── Activar: limpiar cachés viejas ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

/* ── Fetch: network-first con caché de respaldo ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Siempre red para: Firestore, Firebase Auth, Firebase Storage, APIs externas */
  const isExternal = url.hostname.includes('googleapis.com')
    || url.hostname.includes('firebaseio.com')
    || url.hostname.includes('firebasestorage.googleapis.com')
    || url.hostname.includes('identitytoolkit.googleapis.com')
    || url.hostname.includes('maps.googleapis.com')
    || url.hostname.includes('gstatic.com')
    || url.pathname.includes('/api/');

  /* Ignorar peticiones no-GET y externas: el navegador las maneja normalmente */
  if (isExternal || e.request.method !== 'GET') return;

  /* Network-first: intenta red, si falla usa caché, si no hay caché deja fallar limpiamente */
  e.respondWith(
    fetch(e.request)
      .then(response => {
        /* Cachear solo respuestas válidas del mismo origen */
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

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
