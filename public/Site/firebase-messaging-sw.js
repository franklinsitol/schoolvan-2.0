// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSy_SchoolVanPWA",
  projectId: "ai-studio-9eca5ba4-dbd5-4ede-be1a-468092702bcf",
  messagingSenderId: "539698289921",
  appId: "1:539698289921:web:schoolvan"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const title = payload.notification?.title || 'SchoolVan';
  const options = {
    body: payload.notification?.body || 'Nova notificação de transporte escolar.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: payload.data?.url || '/'
  };

  self.registration.showNotification(title, options);
});
