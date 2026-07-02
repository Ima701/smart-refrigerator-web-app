import { getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, firestore } from '../firebase';

const VAPID_KEY = 'BHHSbcnXrbMZyI_h2V4o21xDItLDL9rfXJ-YOEldu12v6kFLJbx8eNo1thHqOoMfVPN0lxwMTlIfc3plLZfXuyo';

export const requestFCMToken = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY 
      });

      if (token) {
        console.log('FCM Token generated:', token);
        // Save the token to Firestore under the user's document
        await setDoc(doc(firestore, 'users', userId), {
          fcmToken: token,
          updatedAt: Date.now()
        }, { merge: true });
        
        return token;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
      }
    } else {
      console.warn('Notification permission not granted.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
  return null;
};
