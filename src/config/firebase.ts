import { initializeApp } from 'firebase/app';
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDNpSo9IlspwMck8idEqiBYc-qMO9fl2mY",
  authDomain: "shelter-65f31.firebaseapp.com",
  projectId: "shelter-65f31",
  storageBucket: "shelter-65f31.firebasestorage.app",
  messagingSenderId: "146788927999",
  appId: "1:146788927999:web:d28e22e33b424d4fb37fca",
  measurementId: "G-VR35202W23",
  databaseURL: "https://shelter-65f31-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with optimized settings for Vercel
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel') || 
    window.location.hostname.includes('app')
  )
});
export const auth = getAuth(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Log Firebase initialization for debugging
console.log('🔥 Firebase inicializado:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  databaseURL: firebaseConfig.databaseURL,
  environment: typeof window !== 'undefined' ? window.location.hostname : 'server'
});

export default app;