/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for ChatPulse

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDeDEh7v_hHzHADR-mZQLDl9Nue1NN6ahk",
  authDomain: "chatpulse-35264.firebaseapp.com",
  projectId: "chatpulse-35264",
  storageBucket: "chatpulse-35264.firebasestorage.app",
  messagingSenderId: "488110670262",
  appId: "1:488110670262:web:ab46bf0df873d211d08117"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);

  const title = payload.notification?.title || payload.data?.title || 'ChatPulse Message';
  const body = payload.notification?.body || payload.data?.body || 'You have received a new message.';
  const icon = payload.notification?.icon || payload.data?.icon || '/pwa-192x192.png';
  const conversationId = payload.data?.conversationId || '';
  const url = payload.data?.url || (conversationId ? `/?c=${conversationId}` : '/');

  const notificationOptions = {
    body,
    icon,
    badge: '/pwa-192x192.png',
    tag: conversationId ? `conv_${conversationId}` : 'chatpulse_msg',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url,
      conversationId,
    },
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
