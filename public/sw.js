// =============================================================
// SERVICE WORKER - PWA SHELL ISOLATION & CACHE
// =============================================================
const CACHE_NAME = 'pwa-shell-v5';
const SHELL_ASSETS = [
  '/app.html',
  '/Site/app.html',
  '/manifest.json',
  '/Site/manifest.json',
  '/icon.png',
  '/icon-512.png',
  '/favicon.png',
  '/apple-touch-icon.png'
];

// 1. Install Event - Cache Static Shell Assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW Shell] Alguns assets estáticos não puderam ser pre-cacheados:', err);
      });
    })
  );
});

// 2. Activate Event - Purge ALL stale caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW Shell] Deletando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch Event - Zero Intervention for JS Modules, CSS, and API requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ONLY handle requests for Shell assets or shell navigation
  const isShellAsset = SHELL_ASSETS.includes(url.pathname);
  const isShellNav = event.request.mode === 'navigate' && url.pathname.includes('app.html');

  if (!isShellAsset && !isShellNav) {
    // Return immediately -> native browser network handling, ZERO interference
    return;
  }

  // Network-First strategy for Shell HTML & Shell icons
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return new Response('Off-line', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

// 4. Native Push Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'SchoolVan - Notificação';
  const options = {
    body: data.body || 'Você recebeu uma nova atualização no transporte escolar.',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [100, 50, 100],
    data: data.url || '/app.html'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/app.html');
      }
    })
  );
});
