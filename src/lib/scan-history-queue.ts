/**
 * Spadas Lens Scan History Persistent Queue & Background Sync Engine
 * Guarantees zero dropped scans across network drops, thrift store basements, and app restarts.
 * Decouples instantaneous valuation card mounting from background Supabase Storage and DB persistence.
 */

import { toast } from "sonner";
import { saveScanOffline, getOfflineScans, removeOfflineScan } from "@/app/lib/offline-storage";
import { supabase } from "@/app/lib/supabase";

export interface QueuedScanRecord {
  id: string;
  timestamp: number;
  imageUrl?: string | null;
  resultJson: any;
  tokenCount?: number;
  status: "pending" | "completed" | "failed";
  retryCount?: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = "spadas_pending_scans_queue";
const HITS_CACHE_KEY = "spadas_cached_lens_hits";
const MAX_QUEUE_SIZE = 50;

/**
 * Safely retrieve the current pending queue from LocalStorage.
 */
export function getLocalPendingQueue(): QueuedScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Safely persist the pending queue to LocalStorage.
 */
export function setLocalPendingQueue(queue: QueuedScanRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch (e) {
    console.warn("[ScanQueue] LocalStorage setItem warning:", e);
  }
}

/**
 * Enqueue a completed scan to both high-capacity IndexedDB and LocalStorage,
 * then immediately trigger background upload without blocking the UI.
 */
export async function enqueueScanForBackgroundUpload(record: QueuedScanRecord): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Save binary payload to unlimited IndexedDB (guarantees offline resilience in basements)
  await saveScanOffline({
    id: record.id,
    timestamp: record.timestamp,
    data: record,
  });

  // 2. Save metadata to LocalStorage queue for fast synchronous access
  const current = getLocalPendingQueue();
  const existingIdx = current.findIndex((q) => q.id === record.id);
  if (existingIdx >= 0) {
    current[existingIdx] = record;
  } else {
    current.push(record);
  }
  setLocalPendingQueue(current);

  // 3. Immediately attempt background upload if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    void processSingleScanUpload(record);
  }
}

/**
 * Upload a single scan record to /api/scans/save (Supabase Storage + scans DB table).
 */
export async function processSingleScanUpload(record: QueuedScanRecord): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch("/api/scans/save", {
      method: "POST",
      headers,
      body: JSON.stringify({
        scanId: record.id,
        imageUrl: record.imageUrl,
        resultJson: record.resultJson,
        tokenCount: record.tokenCount || 2600,
      }),
    });

    if (!res.ok) {
      throw new Error(`Upload returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Save rejected by server");
    }

    // Success: remove scan from offline queues
    await removeOfflineScan(record.id);
    const updatedQueue = getLocalPendingQueue().filter((q) => q.id !== record.id);
    setLocalPendingQueue(updatedQueue);

    // If permanent storage URL was returned, update the local hits cache
    if (data.imageUrl && !data.imageUrl.startsWith("data:")) {
      try {
        const hitsRaw = localStorage.getItem(HITS_CACHE_KEY);
        if (hitsRaw) {
          const hits = JSON.parse(hitsRaw);
          if (Array.isArray(hits)) {
            const hitIdx = hits.findIndex(
              (h) => h.id === record.id || h.name === record.resultJson?.product_name
            );
            if (hitIdx >= 0) {
              hits[hitIdx].image = data.imageUrl;
              localStorage.setItem(HITS_CACHE_KEY, JSON.stringify(hits));
            }
          }
        }
      } catch {}
    }

    return true;
  } catch (err: any) {
    console.warn(`[ScanQueue] Background upload failed for scan ${record.id}:`, err?.message || err);

    // Mark as failed in queue and increment retry count
    const current = getLocalPendingQueue();
    const item = current.find((q) => q.id === record.id);
    if (item) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.status = "failed";
      item.lastError = err?.message || "Upload failed";
      setLocalPendingQueue(current);
    }

    // Show non-blocking toast with retry action
    toast.error("Couldn't save to history — retry", {
      id: "history-upload-fail",
      duration: 6000,
      action: {
        label: "Retry",
        onClick: () => {
          void flushScanHistoryQueue(true);
        },
      },
    });

    return false;
  }
}

let isFlushing = false;

/**
 * Flush all pending scans in queue to Supabase.
 */
export async function flushScanHistoryQueue(showFeedback = false): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine || isFlushing) return;
  isFlushing = true;

  try {
    const queue = getLocalPendingQueue();
    if (queue.length === 0) {
      // Check IndexedDB for orphaned items
      const idbScans = await getOfflineScans();
      if (idbScans && idbScans.length > 0) {
        for (const item of idbScans) {
          if (item.data) queue.push(item.data);
        }
      }
    }

    if (queue.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const scan of queue) {
      const ok = await processSingleScanUpload(scan);
      if (ok) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (showFeedback && successCount > 0) {
      toast.success(`Saved ${successCount} scan${successCount > 1 ? "s" : ""} to history!`);
    }
  } finally {
    isFlushing = false;
  }
}

let isAutoSyncInitialized = false;

/**
 * Initialize auto-sync listeners for device reconnect and app start.
 */
export function initScanHistoryQueue(): void {
  if (typeof window === "undefined" || isAutoSyncInitialized) return;
  isAutoSyncInitialized = true;

  window.addEventListener("online", () => {
    console.log("[ScanQueue] Device online — flushing scan queue...");
    void flushScanHistoryQueue(false);
  });

  // Delayed flush on page mount so UI hydration finishes first
  setTimeout(() => {
    void flushScanHistoryQueue(false);
  }, 2500);
}
