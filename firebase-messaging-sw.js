/* ═══════════════════════════════════════════════════════
   AYALYM — Firebase Messaging Service Worker
   Maneja notificaciones push cuando la app está cerrada.
   Este archivo DEBE estar en la raíz del dominio.
   ═══════════════════════════════════════════════════════ */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCPOysCjAn45mIYNX9L0ePrwIPOHRh56MM',
  authDomain:        'ayalym-app.firebaseapp.com',
  projectId:         'ayalym-app',
  storageBucket:     'ayalym-app.firebasestorage.app',
  messagingSenderId: '848723036056',
  appId:             '1:848723036056:web:9db6343868afe7f9838ded'
});

const messaging = firebase.messaging();

/* ── Notificaciones en background (app cerrada/en segundo plano) ── */
messaging.onBackgroundMessage(payload => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || 'AYALYM', {
    body:    n.body  || '',
    icon:    '/img/logo.png',
    badge:   '/img/logo.png',
    vibrate: [200, 100, 200],
    data:    { url: '/app.html' }
  });
});

/* ── Al hacer clic en la notificación: abrir/enfocar la app ── */
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
