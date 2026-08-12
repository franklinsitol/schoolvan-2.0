// NOME DO ARQUIVO: sw.js
const CACHE_NAME = 'schoolvan-v10'; 
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.png',
    '/icon-512.png',
    '/favicon.png',
    '/apple-touch-icon.png'
];

// 1. Instalação (Força o novo SW a assumir o controle imediatamente)
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando nova versão v10');
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('[SW] Falha ao pre-cachear ativos estáticos:', err);
            });
        })
    );
});

// 2. Ativação (Limpa caches antigos e toma o controle)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. Interceptação (Fetch) - Estratégia Network First com Fallback para Cache
self.addEventListener('fetch', (event) => {
    // Ignora requisições não-GET ou chamadas de API externas e Firebase
    if (
        event.request.method !== 'GET' ||
        event.request.url.includes('script.google.com') ||
        event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com')
    ) {
        return; // Deixa o navegador lidar normalmente
    }

    // Estratégia: Tenta Rede primeiro, depois Cache (Network First)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Se a rede respondeu com sucesso, atualiza o cache e retorna
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
                // Se estiver offline ou a rede falhar, tenta buscar no cache
                return caches.match(event.request).then((response) => {
                    if (response) return response;

                    // Se for uma navegação e não achar nada no cache, retorna a home (SPA Fallback)
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html') || caches.match('/');
                    }
                });
            })
    );
});

// 4. Suporte a Notificações Push
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
        data: data.url || '/'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Clique em Notificações
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
                return clients.openWindow('/');
            }
        })
    );
});

