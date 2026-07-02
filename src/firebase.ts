import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: 'AIzaSyBHPGnVPCmUay8s9JtQtqNoJCKnEQ3dInk',
  authDomain: 'smart-refrigerator-app-d2962.firebaseapp.com',
  projectId: 'smart-refrigerator-app-d2962',
  storageBucket: 'smart-refrigerator-app-d2962.firebasestorage.app',
  messagingSenderId: '40347297084',
  appId: '1:1:40347297084:web:c0c96b6f59fa277d2baa39',
  databaseURL: 'https://smart-refrigerator-app-d2962-default-rtdb.firebaseio.com/',
};

// Primary app — used for the signed-in user session
const app = initializeApp(firebaseConfig);

// Realtime Database — used by App.tsx for /live and /events subscriptions
export const db = getDatabase(app);

// Primary Auth — used by Login.tsx for Email/Password sign-in
export const auth = getAuth(app);

// Secondary app — used ONLY by UserManagement to create new accounts
// without disturbing the admin's own session.
const secondaryApp = initializeApp(firebaseConfig, 'user-provisioning');
export const secondaryAuth = getAuth(secondaryApp);

// Firestore — used for storing FCM device tokens
export const firestore = getFirestore(app);

// Messaging — used for FCM push notifications
export const messaging = getMessaging(app);
