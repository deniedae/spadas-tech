/**
 * Spadas Offline Thrift Vault
 *
 * Provides persistent IndexedDB storage for full-fidelity photo captures
 * when thrifting in dead cellular zones (concrete bunkers, metal thrift warehouses).
 * Automatically detects network reconnection and dispatches queued items
 * with an exponential backoff retry policy.
 */

export interface QueuedVaultItem {
  id: string;
  created_at: string;
  product_name: string;
  brand: string;
  category: string;
  thrift_cost_aud?: number;
  captured_images: string[];
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  retry_count: number;
  error_message?: string;
  result?: any;
}

const DB_NAME = "spadas_thrift_vault";
const STORE_NAME = "pending_inspections";
const DB_VERSION = 1;

/**
 * Open or upgrade the IndexedDB database safely
 */
export function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open vault DB"));
  });
}

/**
 * Enqueue a multi-angle inspection into the offline vault
 */
export async function saveToVault(
  item: Omit<QueuedVaultItem, "id" | "created_at" | "status" | "retry_count">
): Promise<string> {
  const id = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: QueuedVaultItem = {
    ...item,
    id,
    created_at: new Date().toISOString(),
    status: "PENDING",
    retry_count: 0,
  };

  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error || new Error("Failed to save to vault"));
  });
}

/**
 * Retrieve all pending or active vault items
 */
export async function getPendingVaultItems(): Promise<QueuedVaultItem[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items: QueuedVaultItem[] = req.result || [];
      const pending = items
        .filter((i) => i.status === "PENDING" || i.status === "FAILED" || i.status === "SYNCING")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      resolve(pending);
    };
    req.onerror = () => reject(req.error || new Error("Failed to read pending items"));
  });
}

/**
 * Update the status, retry count, or result of a vault item
 */
export async function updateVaultItem(
  id: string,
  updates: Partial<QueuedVaultItem>
): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (!getReq.result) {
        return resolve();
      }
      const updated = { ...getReq.result, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Remove an item from the vault
 */
export async function removeVaultItem(id: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear all synced items to save space
 */
export async function clearSyncedVaultItems(): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items: QueuedVaultItem[] = req.result || [];
      items
        .filter((i) => i.status === "SYNCED")
        .forEach((i) => store.delete(i.id));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Dispatch queued offline items sequentially with exponential backoff retry
 */
export async function syncVaultQueue(
  onProgress?: (synced: number, total: number, latestResult?: any) => void
): Promise<{ processed: number; successful: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, successful: 0, failed: 0 };
  }

  const pending = await getPendingVaultItems();
  if (pending.length === 0) {
    return { processed: 0, successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      break;
    }

    if (item.retry_count > 0) {
      const delayMs = Math.min(1000 * Math.pow(2, item.retry_count - 1), 10000);
      await sleep(delayMs);
    }

    await updateVaultItem(item.id, { status: "SYNCING" });

    try {
      const res = await fetch("/api/deep-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: item.captured_images,
          productName: item.product_name,
          brand: item.brand,
          category: item.category,
        }),
      });

      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }

      const data = await res.json();
      await updateVaultItem(item.id, {
        status: "SYNCED",
        result: data,
        error_message: undefined,
      });

      successful++;
      if (onProgress) {
        onProgress(successful, pending.length, data);
      }
    } catch (err: any) {
      failed++;
      await updateVaultItem(item.id, {
        status: "FAILED",
        retry_count: item.retry_count + 1,
        error_message: err?.message || "Sync failed",
      });
    }
  }

  return { processed: pending.length, successful, failed };
}

/**
 * Register network online listener to automatically drain the offline vault
 */
export function initVaultNetworkListener(onSyncComplete?: (result: { successful: number }) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => {
    void syncVaultQueue().then((res) => {
      if (res.successful > 0 && onSyncComplete) {
        onSyncComplete({ successful: res.successful });
      }
    });
  };

  window.addEventListener("online", handleOnline);
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
