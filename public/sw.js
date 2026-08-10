// =============================================================
// SERVICE WORKER - PWA SHELL ISOLATION & CACHE
// =============================================================
const CACHE_NAME = 'pwa-shell-v2';
const SHELL_ASSETS = [
  '/app.html',
  '/Site/app.html',
  '/manifest.json',
  '/Site/manifest.json',
  '/sw.js',
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
      console.log('[SW Shell] Cacheando arquivos estáticos da casca PWA...');
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

// 3. Fetch Event - Strict Isolation Bypass for JS Modules & Application Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // STRICT BYPASS: Let native browser handle ALL code modules, Vite assets, and backend APIs
  if (
    url.origin !== location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/src') ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/node_modules') ||
    url.pathname.startsWith('/@') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.map') ||
    url.pathname.includes('script.google.com') ||
    url.pathname.includes('firestore') ||
    url.pathname.includes('firebase') ||
    url.pathname.includes('hot-update')
  ) {
    return; // Pass through to native network, zero SW intervention
  }

  // Network-First strategy for Shell HTML & Shell icons only
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

        if (event.request.mode === 'navigate') {
          const shellFallback = (await caches.match('/app.html')) || (await caches.match('/Site/app.html'));
          if (shellFallback) return shellFallback;
        }

        return new Response('Modo Offline', { status: 503, statusText: 'Service Unavailable' });
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
