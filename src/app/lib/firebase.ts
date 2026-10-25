import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB5LaEV8s9y048_1nq68wEvfZ8qvkn3JPQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0310816582.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0310816582",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0310816582.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "395950472132",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:395950472132:web:cdd8b3e068f8f7efb80291",
};

// Initialize Firebase safely for SSR/Edge/Client
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * 1-Click Google Sign-In
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser | null; error: Error | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (err: any) {
    console.error("[Firebase] Google Sign-In Error:", err);
    return { user: null, error: err };
  }
}

/**
 * Email & Password Sign In
 */
export async function signInWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser | null; error: Error | null }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user, error: null };
  } catch (err: any) {
    console.error("[Firebase] Email Sign-In Error:", err);
    return { user: null, error: err };
  }
}

/**
 * Email & Password Sign Up
 */
export async function signUpWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser | null; error: Error | null }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return { user: result.user, error: null };
  } catch (err: any) {
    console.error("[Firebase] Email Sign-Up Error:", err);
    return { user: null, error: err };
  }
}

/**
 * Sign Out
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error("[Firebase] Sign Out Error:", err);
  }
}

export { fbOnAuthStateChanged as onAuthStateChanged };
export type { FirebaseUser };
