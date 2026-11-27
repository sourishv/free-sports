import type { FirebaseOptions } from 'firebase/app';

/**
 * 👉 To play with friends across devices, paste your Firebase web config here
 * (Firebase console → Project settings → Your apps → Web app → "Config"),
 * or set the VITE_FIREBASE_* variables (see .env.example / README).
 * Firebase web config is NOT secret – it's safe to commit. Security comes from firestore.rules.
 *
 * Leave it empty and the app runs in Demo Mode: everything stays on this device
 * and a few bot friends join your duels so you can try it out.
 */
const PASTED_CONFIG: FirebaseOptions = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

const env = import.meta.env;
export const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || PASTED_CONFIG.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || PASTED_CONFIG.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || PASTED_CONFIG.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || PASTED_CONFIG.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || PASTED_CONFIG.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || PASTED_CONFIG.appId,
};

export const hasFirebase = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

export const GAME = {
  startingCoins: 1000,
  dailyRewards: [100, 150, 200, 250, 300, 400, 750],
  bailoutAmount: 500,
  bailoutBelow: 50,
  maxStake: 100_000,
  minStake: 1,
};
