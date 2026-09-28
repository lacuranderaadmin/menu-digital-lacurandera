const CACHE_NAME = 'lacurandera-v8';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './data/catalog.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/menu.css',
  './css/physical-menu.css',
  './js/i18n.js',
  './js/ui.js',
  './js/menu.js',
  './js/culinary-translator.js',
  './js/animations.js',
  './assets/fonts/Gotham-Bold.ttf',
  './assets/logo/logo.png',
  './assets/logo/curandera-emblem-lineart.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
