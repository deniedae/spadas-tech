import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db, FirebaseUser } from "./firebase";

export interface FirestoreListing {
  id?: string;
  userId: string;
  product: string;
  description: string;
  price: number;
  cost: number;
  image?: string;
  status: "Active" | "Draft" | "Sold";
  category?: string;
  brand?: string;
  source?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreScan {
  id?: string;
  userId: string;
  barcode?: string;
  productName: string;
  brand?: string;
  category?: string;
  estimatedResale: number;
  estimatedCost: number;
  netProfit: number;
  roiPercentage: number;
  copVerdict?: string;
  image?: string;
  timestamp: any;
}

/**
 * Sync user profile to Firestore `users` collection.
 * Preserves Pro access rules for DeniedAE@gmail.com.
 */
export async function syncUserProfileToFirestore(user: FirebaseUser): Promise<void> {
  if (!user || !user.uid) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    const isProEmail = (user.email || "").toLowerCase() === "deniedae@gmail.com";

    const baseData = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "Reseller",
      photoURL: user.photoURL || null,
      isPro: isProEmail || snap.data()?.isPro || false,
      lastLoginAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(userRef, {
        ...baseData,
        createdAt: serverTimestamp(),
        plan: isProEmail ? "PRO_UNLIMITED" : "FREE_BETA",
      });
    } else {
      await setDoc(userRef, baseData, { merge: true });
    }
  } catch (err) {
    console.warn("[Firestore] User profile sync warning:", err);
  }
}

/**
 * Save a new listing to Firestore `listings` collection.
 */
export async function saveListingToFirestore(
  userId: string,
  listing: Omit<FirestoreListing, "userId">
): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const listingsCol = collection(db, "listings");
    const newDocRef = doc(listingsCol);

    const docData: FirestoreListing = {
      ...listing,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newDocRef, docData);
    return { id: newDocRef.id, success: true };
  } catch (err: any) {
    console.error("[Firestore] saveListingToFirestore error:", err);
    return { id: "", success: false, error: err?.message || "Failed to save listing to Firestore." };
  }
}

/**
 * Fetch all listings for a specific user from Firestore.
 */
export async function fetchUserListings(userId: string): Promise<FirestoreListing[]> {
  try {
    const listingsCol = collection(db, "listings");
    const q = query(
      listingsCol,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<FirestoreListing, "id">),
    }));
  } catch (err) {
    console.warn("[Firestore] fetchUserListings warning:", err);
    return [];
  }
}

/**
 * Delete a listing from Firestore.
 */
export async function deleteListingFromFirestore(
  listingId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, "listings", listingId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error("[Firestore] deleteListingFromFirestore error:", err);
    return { success: false, error: err?.message || "Failed to delete listing from Firestore." };
  }
}

/**
 * Record a Spadas Lens AR or Barcode Scan to Firestore `scans` collection.
 */
export async function saveScanToFirestore(
  userId: string,
  scanData: Omit<FirestoreScan, "userId" | "timestamp">
): Promise<{ id: string; success: boolean }> {
  try {
    const scansCol = collection(db, "scans");
    const newDocRef = doc(scansCol);

    const payload: FirestoreScan = {
      ...scanData,
      userId,
      timestamp: serverTimestamp(),
    };

    await setDoc(newDocRef, payload);
    return { id: newDocRef.id, success: true };
  } catch (err) {
    console.warn("[Firestore] saveScanToFirestore warning:", err);
    return { id: "", success: false };
  }
}
