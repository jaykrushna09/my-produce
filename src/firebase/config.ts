
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const isFirebaseConfigValid = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'undefined' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'undefined'
);

if (typeof window !== 'undefined') {
  if (!isFirebaseConfigValid) {
    console.warn("Firebase configuration is missing or incomplete. Please ensure your project is connected in the Firebase Studio sidebar.");
  } else {
    console.log("Firebase initialized for project:", firebaseConfig.projectId);
  }
}
