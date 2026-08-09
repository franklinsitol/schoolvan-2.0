// NOME DO ARQUIVO: sw.js
const CACHE_NAME = 'schoolvan-v9'; 
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.png',
    '/icon-512.png',
    '/favicon.png',
    '/apple-touch-icon.png'
];

// 1. Instalação
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando nova versão v9');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Ativação (Limpa caches antigos)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removendo cache antigo', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. Interceptação (Fetch)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Ignora chamadas para APIs externas ou rotas de dev HMR
    if (
        url.origin !== location.origin ||
        url.pathname.startsWith('/api') ||
        url.pathname.includes('script.google.com') ||
        url.pathname.includes('/@') ||
        url.pathname.includes('hot-update')
    ) {
        return;
    }

    // Estratégia: Tenta Rede primeiro, depois Cache (Network First)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((response) => {
                    if (response) return response;

                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html') || caches.match('/');
                    }
                });
            })
    );
});

// 4. Push Notifications
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


