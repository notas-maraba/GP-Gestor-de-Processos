// Service Worker - GP Gestor de Processos
// Estrategia: network-first para o HTML (sempre tenta buscar a versao mais nova)
// cache-first para assets estaticos (icones)

var CACHE_NAME = 'gp-cache-v1';
var PRECACHE_URLS = ['./index.html', './manifest.json'];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).catch(function(){});
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Network-first for the main HTML so updates are picked up quickly
  if (req.mode === 'navigate' || req.url.indexOf('index.html') >= 0) {
    event.respondWith(
      fetch(req).then(function(res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, resClone); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Cache-first for everything else (icons, manifest)
  event.respondWith(
    caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, resClone); });
        return res;
      }).catch(function() { return cached; });
    })
  );
});
