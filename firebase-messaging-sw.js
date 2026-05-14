/* ═══════════════════════════════════════════════════════
   AYALYM — Service Worker
   1. Caché de activos estáticos (cache-first)
   2. Web Push notifications
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'ayalym-v5';
const STATIC_ASSETS = [
  '/app.html',
  '/css/style.css',
  '/css/dark.css',
  '/css/theme-toggle.css',
  '/css/landing-light.css',
  '/js/app.js',
  '/js/firebase-db.js',
  '/js/theme.js',
  '/img/logo.png',
  '/img/hero-bg.jpg',
  '/img/hero-bg2.jpg',
  '/firebase-messaging-sw.js'
];

/* ── Instalar: pre-cachear activos estáticos ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activar: limpiar cachés viejas ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

/* ── Fetch: cache-first para estáticos, network para Firestore/Firebase ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Siempre red para: Firestore, Firebase Auth, Firebase Storage, APIs externas */
  const isFirebase = url.hostname.includes('googleapis.com')
    || url.hostname.includes('firebaseio.com')
    || url.hostname.includes('firebasestorage.googleapis.com')
    || url.hostname.includes('identitytoolkit.googleapis.com')
    || url.pathname.includes('/api/');

  if (isFirebase || e.request.method !== 'GET') return;

  /* Cache-first para el resto (JS, CSS, HTML, imágenes) */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        /* Cachear respuestas válidas de mismo origen */
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
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
