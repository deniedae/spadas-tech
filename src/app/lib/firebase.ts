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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildOnly123456789",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "spadas-ai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "spadas-ai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "spadas-ai.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "108405876085",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:108405876085:web:a1b2c3d4e5f6g7h8",
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
