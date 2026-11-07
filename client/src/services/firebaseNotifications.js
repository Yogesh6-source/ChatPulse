import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { initializeApp, getApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

let messagingInstance = null;
let messagingSupportedPromise = null;

export const checkMessagingSupport = async () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;

  if (!messagingSupportedPromise) {
    messagingSupportedPromise = isSupported().catch(() => false);
  }
  return messagingSupportedPromise;
};

export const getMessagingClient = async () => {
  const supported = await checkMessagingSupport();
  if (!supported) return null;

  if (!messagingInstance) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

// Generates a consistent, safe document ID for an FCM token
const getTokenDocId = (token) => {
  return token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-64);
};

export const saveUserFCMToken = async (userId, token) => {
  if (!db || !userId || !token) return;
  try {
    const docId = getTokenDocId(token);
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', docId);
    await setDoc(
      tokenRef,
      {
        token,
        userAgent: navigator.userAgent,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to save FCM token to Firestore:', error);
  }
};

export const removeUserFCMToken = async (userId, token) => {
  if (!db || !userId || !token) return;
  try {
    const docId = getTokenDocId(token);
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', docId);
    await deleteDoc(tokenRef);
  } catch (error) {
    console.error('Failed to remove FCM token:', error);
  }
};

export const registerForPushNotifications = async (userId) => {
  const supported = await checkMessagingSupport();
  if (!supported) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'denied', permission };
    }

    // Register or ensure service worker is active
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    const messaging = await getMessagingClient();
    if (!messaging) {
      return { success: false, reason: 'unsupported' };
    }

    const tokenOptions = {
      serviceWorkerRegistration: registration,
    };

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (vapidKey) {
      tokenOptions.vapidKey = vapidKey;
    }

    const token = await getToken(messaging, tokenOptions);
    if (token) {
      await saveUserFCMToken(userId, token);
      localStorage.setItem('chatpulse_fcm_token', token);
      return { success: true, token, permission };
    }

    return { success: false, reason: 'no-token', permission };
  } catch (error) {
    console.error('Error enabling push notifications:', error);
    return { success: false, error: error.message };
  }
};

export const setupForegroundNotifications = async (onNotificationReceived) => {
  const messaging = await getMessagingClient();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('[ChatPulse] Foreground notification received:', payload);
    if (onNotificationReceived) {
      onNotificationReceived(payload);
    }
  });
};
