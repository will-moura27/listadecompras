// Mudamos a versão para v2. O celular vai perceber essa mudança!
const CACHE_NAME = 'stoka-pwa-v2.1'; 
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './icone.svg'
];

// Instala a nova versão e força ela a assumir o controle
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Limpa o lixo da versão antiga (Gestão Restaurante v1)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Apagando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Responde com o cache novo ou busca na rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});