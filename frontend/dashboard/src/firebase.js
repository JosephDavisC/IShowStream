import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config - Get these values from Firebase Console
// Go to: https://console.firebase.google.com/ > Your Project > Project Settings > General > Your apps > Web app
// Uses runtime config (injected at container startup via config.js) or build-time env vars
const getFirebaseConfig = () => {
  // Priority 1: Runtime config (injected by entrypoint.sh at container startup)
  const runtimeConfig = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__;
  
  if (runtimeConfig && runtimeConfig.REACT_APP_FIREBASE_API_KEY) {
    return {
      apiKey: runtimeConfig.REACT_APP_FIREBASE_API_KEY,
      authDomain: runtimeConfig.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: runtimeConfig.REACT_APP_FIREBASE_PROJECT_ID || "streamsense-476705",
      storageBucket: runtimeConfig.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: runtimeConfig.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: runtimeConfig.REACT_APP_FIREBASE_APP_ID
    };
  }
  
  // Priority 2: Build-time environment variables (for local development)
  // Note: In production builds, these are baked in at build time
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "streamsense-476705",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
};

const firebaseConfig = getFirebaseConfig();

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
  console.error('⚠️ Firebase configuration missing!');
  console.error('Please create a .env file in frontend/dashboard/ with your Firebase config.');
  console.error('See frontend/dashboard/.env.example for reference.');
  console.error('');
  console.error('Get your Firebase config from:');
  console.error('https://console.firebase.google.com/ > Your Project > Project Settings > General');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

export default app;

