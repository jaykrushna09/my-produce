
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/**
 * Checks if the Firebase configuration is valid and not using placeholder strings.
 */
export const isFirebaseConfigValid = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'undefined' &&
  firebaseConfig.apiKey.length > 10 &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'undefined'
);

if (typeof window !== 'undefined') {
  if (!isFirebaseConfigValid) {
    console.warn("Firebase Studio: Project not connected. Please use the sidebar 'Connect' button to sync your environment variables.");
  } else {
    console.log("Firebase Studio: Successfully connected to project:", firebaseConfig.projectId);
  }
}
