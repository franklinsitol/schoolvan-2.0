// =============================================================
// SERVICE WORKER - PWA SHELL ISOLATION & CACHE (/Site/sw.js)
// =============================================================
const CACHE_NAME = 'pwa-shell-site-v1';
const SHELL_ASSETS = [
  '/Site/app.html',
  '/manifest.json',
  '/sw.js',
  '/icon.png',
  '/icon-512.png',
  '/favicon.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch(err => console.warn(err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (
    requestUrl.origin !== location.origin ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.includes('script.google.com') ||
    requestUrl.pathname.includes('firestore') ||
    requestUrl.pathname.includes('firebase')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/Site/app.html') || caches.match('/app.html');
          }
        });
      })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }
  }

  const title = data.title || 'SchoolVan - Notificação';
  const options = {
    body: data.body || 'Você recebeu uma nova atualização no transporte escolar.',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [100, 50, 100],
    data: data.url || '/Site/app.html'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/Site/app.html');
    })
  );
});
