const CACHE_NAME = 'lacurandera-v19';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './data/catalog.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/menu.css',
  './js/i18n.js',
  './js/ui.js',
  './js/menu.js',
  './js/culinary-translator.js',
  './js/animations.js',
  './assets/fonts/Gotham-Bold.woff2',
  './assets/fonts/Gotham-Bold.woff',
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

  // Bypassear absolutamente el panel administrativo /admin/ y editores para reflejo inmediato en tiempo real
  if (url.pathname.includes('/admin') || url.pathname.includes('admin-dashboard') || url.pathname.includes('physical-menu')) {
    return;
  }

  // Network-First para páginas (document / navigation) y archivos de código/datos para reflejar cambios en tiempo real
  if (
    e.request.mode === 'navigate' ||
    e.request.destination === 'document' ||
    e.request.destination === 'script' ||
    e.request.destination === 'style' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json')
  ) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Para imágenes, fuentes y medios: Cache-First con fallback a red
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => null);
    })
  );
});

