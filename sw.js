const CACHE_NAME = 'restaurante-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

// Instala o Service Worker e salva os arquivos no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta as requisições para carregar rápido do cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});