
/**
 * Firebase configuration object.
 * Replace the placeholder strings below with your actual project values from the Firebase Console.
 * (Settings > Project Settings > General > Your apps)
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBeGHaSfwA5G3_MVtb5KEoXw4bb8yu1E3Q",
  authDomain: "studio-1509262531-2336b.firebaseapp.com",
  projectId: "studio-1509262531-2336b",
  storageBucket: "studio-1509262531-2336b.firebasestorage.app",
  messagingSenderId: "1082020993784",
  appId: "1:1082020993784:web:ad140434e9594aae3bf90d"
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
