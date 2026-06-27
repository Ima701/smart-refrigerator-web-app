import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
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
