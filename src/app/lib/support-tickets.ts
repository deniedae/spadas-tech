import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

export interface SupportTicketRecord {
  ticketId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  issueDescription: string;
  recentChatSnippet?: string;
  status: "open" | "awaiting_human" | "answered" | "resolved";
  createdAt: number;
  updatedAt: number;
  developerReply?: string;
  repliedAt?: number;
  repliedBy?: string;
  metadata?: Record<string, any>;
}

const COLLECTION_NAME = "support_tickets";

/**
 * Save a new or escalated support ticket to Firestore.
 */
export async function saveSupportTicket(
  ticket: Omit<SupportTicketRecord, "createdAt" | "updatedAt">
): Promise<SupportTicketRecord> {
  const now = Date.now();
  const record: SupportTicketRecord = {
    ...ticket,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, COLLECTION_NAME, ticket.ticketId);
  await setDoc(docRef, record);
  return record;
}

/**
 * Retrieve a specific support ticket by ticketId.
 */
export async function getSupportTicketById(ticketId: string): Promise<SupportTicketRecord | null> {
  if (!ticketId) return null;
  try {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as SupportTicketRecord;
  } catch (err) {
    console.error("[SupportTickets] Error fetching ticket:", err);
    return null;
  }
}

/**
 * Fetch all support tickets for the developer inbox.
 * Falls back to in-memory sorting if composite indices are building.
 */
export async function getAllSupportTickets(max: number = 50): Promise<SupportTicketRecord[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(q);
    const results: SupportTicketRecord[] = [];
    snap.forEach((d) => {
      results.push(d.data() as SupportTicketRecord);
    });
    return results;
  } catch (err) {
    console.warn("[SupportTickets] Query fallback sorting in-memory:", err);
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      const results: SupportTicketRecord[] = [];
      snap.forEach((d) => {
        results.push(d.data() as SupportTicketRecord);
      });
      return results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, max);
    } catch (e) {
      console.error("[SupportTickets] Failed to read tickets:", e);
      return [];
    }
  }
}

/**
 * Record a developer response to a support ticket.
 */
export async function replyToSupportTicket(
  ticketId: string,
  replyMessage: string,
  developerEmail: string = "deniedae@gmail.com",
  status: "answered" | "resolved" = "answered"
): Promise<SupportTicketRecord | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const now = Date.now();
    const updates: Partial<SupportTicketRecord> = {
      developerReply: replyMessage,
      repliedAt: now,
      repliedBy: developerEmail,
      status,
      updatedAt: now,
    };

    await updateDoc(docRef, updates);
    const updatedSnap = await getDoc(docRef);
    return updatedSnap.data() as SupportTicketRecord;
  } catch (err) {
    console.error("[SupportTickets] Failed to reply to ticket:", err);
    return null;
  }
}
