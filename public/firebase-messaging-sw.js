importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBHPGnVPCmUay8s9JtQtqNoJCKnEQ3dInk',
  authDomain: 'smart-refrigerator-app-d2962.firebaseapp.com',
  projectId: 'smart-refrigerator-app-d2962',
  storageBucket: 'smart-refrigerator-app-d2962.firebasestorage.app',
  messagingSenderId: '40347297084',
  appId: '1:1:40347297084:web:c0c96b6f59fa277d2baa39',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload?.notification?.title || 'Smart Fridge Alert';
  const notificationOptions = {
    body: payload?.notification?.body || 'New alert received.',
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
