// SchoolVan Service Worker - Clean & Reliable PWA
const CACHE_NAME = 'schoolvan-pwa-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/favicon.png',
  '/favicon.ico',
  '/apple-touch-icon.png'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('PWA precache warning for:', asset, e);
        }
      }
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First with Graceful Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Do NOT intercept API calls or dev server HMR
  if (
    url.origin !== location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/@') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const indexCached = await caches.match('/index.html') || await caches.match('/');
          if (indexCached) return indexCached;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SchoolVan Notificação';
  const options = {
    body: data.body || 'Sua van escolar enviou um aviso.',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

