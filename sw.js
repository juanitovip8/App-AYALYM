/* ═══════════════════════════════════════════════════════════
   AYALYM — Service Worker v1
   Estrategia: Cache-first para assets estáticos (JS/CSS/fonts)
               Network-first para HTML (siempre versión fresca)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'ayalym-v154';

/* Assets a pre-cachear en la instalación */
const PRECACHE = [
  '/app.html',
  '/index.html',
  '/css/style.min.css',
  '/js/app.min.js',
  '/js/firebase-db.js',
  '/js/data.js',
  '/js/site-config.js',
  '/js/landing-promos.js',
  '/manifest.json'
];

/* ── Install: pre-cachear assets críticos ── */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE.map(function(url){
        return new Request(url, { cache: 'no-cache' });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

/* ── Activate: limpiar cachés viejas ── */
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

/* ── Fetch: estrategia según tipo de recurso ── */
self.addEventListener('fetch', function(e){
  const url = new URL(e.request.url);

  /* Ignorar Firebase, Google APIs y Chrome extensions */
  if(url.origin !== location.origin) return;
  if(url.pathname.startsWith('/firebase-messaging-sw')) return;

  /* JS y CSS → Cache-first (el versionado en query string garantiza frescura) */
  if(/\.(js|css|woff2?|ttf|eot)(\?.*)?$/.test(url.pathname)){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        if(cached) return cached;
        return fetch(e.request).then(function(resp){
          if(resp && resp.status === 200){
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
          }
          return resp;
        });
      })
    );
    return;
  }

  /* Imágenes → Cache-first con expiración implícita por nombre */
  if(/\.(png|jpg|jpeg|webp|gif|svg|ico)(\?.*)?$/.test(url.pathname)){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        if(cached) return cached;
        return fetch(e.request).then(function(resp){
          if(resp && resp.status === 200){
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
          }
          return resp;
        });
      })
    );
    return;
  }

  /* HTML → Network-first (siempre la versión más reciente) */
  if(e.request.mode === 'navigate' || /\.html$/.test(url.pathname)){
    e.respondWith(
      fetch(e.request).then(function(resp){
        if(resp && resp.status === 200){
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
        }
        return resp;
      }).catch(function(){
        /* Sin red → servir desde caché */
        return caches.match(e.request) || caches.match('/app.html');
      })
    );
    return;
  }
});
