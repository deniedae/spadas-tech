import { createClient } from "@supabase/supabase-js";

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

const BUCKET_NAME = "listing-images";
const TICKETS_DIR = "_tickets";

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  return createClient(url, key);
}

// In-memory cache for fast local reads and resilient fallback
const memoryCache = new Map<string, SupportTicketRecord>();

/**
 * Save a new or escalated support ticket to persistent Supabase storage + memory cache.
 */
export async function saveSupportTicket(
  ticket: Omit<SupportTicketRecord, "createdAt" | "updatedAt"> & { createdAt?: number; updatedAt?: number }
): Promise<SupportTicketRecord> {
  const now = Date.now();
  const record: SupportTicketRecord = {
    ...ticket,
    createdAt: ticket.createdAt || now,
    updatedAt: now,
  };

  memoryCache.set(ticket.ticketId, record);

  try {
    const supabase = getStorageClient();
    const filePath = `${TICKETS_DIR}/${ticket.ticketId}.json`;
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, Buffer.from(JSON.stringify(record, null, 2)), {
        upsert: true,
        contentType: "application/json",
      });
  } catch (err) {
    console.warn("[SupportTickets] Storage upload error (cached in-memory):", err);
  }

  return record;
}

/**
 * Retrieve a specific support ticket by ticketId.
 */
export async function getSupportTicketById(ticketId: string): Promise<SupportTicketRecord | null> {
  if (!ticketId) return null;
  if (memoryCache.has(ticketId)) {
    return memoryCache.get(ticketId)!;
  }

  try {
    const supabase = getStorageClient();
    const filePath = `${TICKETS_DIR}/${ticketId}.json`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(filePath);
    if (error || !data) return null;

    const text = await data.text();
    const parsed = JSON.parse(text) as SupportTicketRecord;
    memoryCache.set(ticketId, parsed);
    return parsed;
  } catch (err) {
    console.error("[SupportTickets] Error fetching ticket:", err);
    return null;
  }
}

/**
 * Fetch all support tickets for the developer inbox.
 */
export async function getAllSupportTickets(max: number = 50): Promise<SupportTicketRecord[]> {
  const resultsMap = new Map<string, SupportTicketRecord>();
  memoryCache.forEach((rec, id) => resultsMap.set(id, rec));

  try {
    const supabase = getStorageClient();
    const { data: fileList, error } = await supabase.storage.from(BUCKET_NAME).list(TICKETS_DIR, {
      limit: max,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (!error && Array.isArray(fileList)) {
      await Promise.all(
        fileList.map(async (file) => {
          if (!file.name.endsWith(".json")) return;
          const ticketId = file.name.replace(/\.json$/, "");
          if (resultsMap.has(ticketId)) return;

          try {
            const { data } = await supabase.storage.from(BUCKET_NAME).download(`${TICKETS_DIR}/${file.name}`);
            if (data) {
              const text = await data.text();
              const parsed = JSON.parse(text) as SupportTicketRecord;
              resultsMap.set(ticketId, parsed);
              memoryCache.set(ticketId, parsed);
            }
          } catch {}
        })
      );
    }
  } catch (err) {
    console.warn("[SupportTickets] Storage list error, falling back to cache:", err);
  }

  return Array.from(resultsMap.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, max);
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
    const existing = await getSupportTicketById(ticketId);
    if (!existing) return null;

    const now = Date.now();
    const updated: SupportTicketRecord = {
      ...existing,
      developerReply: replyMessage,
      repliedAt: now,
      repliedBy: developerEmail,
      status,
      updatedAt: now,
    };

    return await saveSupportTicket(updated);
  } catch (err) {
    console.error("[SupportTickets] Failed to reply to ticket:", err);
    return null;
  }
}
