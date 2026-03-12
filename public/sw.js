/* FitChef PWA service worker (minimal, safe defaults) */
const CACHE_NAME = 'fitchef-pwa-v4';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/js/script.js',
  '/manifest.webmanifest',
  '/images/pwa/icon-192.png',
  '/images/pwa/icon-512.png',
  '/images/pwa/apple-touch-icon.png',
  '/images/Fitchef%20logo2.png',
  '/css/style.css',
  '/css/fitchef-mobile-pro.css',
  '/admin/css/admin.css',
  '/chef/css/chef-dashboard.css',
  '/user/css/user-dashboard.css',
  '/logistics/css/logistics-dashboard.css',
  '/js/pwa-common.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations, cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Always go network-first for API.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Navigations: network-first so latest app loads, fallback to cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || 'FitChef';
    const options = data.options || {};
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

