
/**
 * Firebase configuration object.
 * Replace the placeholder strings below with your actual project values from the Firebase Console.
 * (Settings > Project Settings > General > Your apps)
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

/**
 * Validates if the Firebase configuration is set up.
 */
export const isFirebaseConfigValid = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.apiKey.length > 10
);

if (typeof window !== 'undefined') {
  if (!isFirebaseConfigValid) {
    console.warn("Firebase Studio: Manual configuration required. Update src/firebase/config.ts with your credentials.");
  } else {
    console.log("Firebase Studio: Initialized with project:", firebaseConfig.projectId);
  }
}
