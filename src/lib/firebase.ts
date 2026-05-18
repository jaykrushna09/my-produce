
// This file is now deprecated. Please use imports from '@/firebase' instead.
import { initializeFirebase } from '@/firebase';

const firebase = initializeFirebase();
export const auth = firebase.auth;
export const firestore = firebase.firestore;
