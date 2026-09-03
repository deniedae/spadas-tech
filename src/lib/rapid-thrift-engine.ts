/**
 * SPADAS RAPID THRIFT ENGINE
 * High-velocity thrift shelf/rack scanning with:
 * 1. Zero Base64 in LocalStorage (Blobs stored in IndexedDB keyed by photoId)
 * 2. Non-blocking asynchronous shutter capture
 * 3. Max 2-worker background request concurrency
 * 4. Dual-vibration haptics + Web Audio API chime fallback (iOS Safari compatible)
 */

export interface RapidThriftItem {
  id: string;
  photoId: string;
  timestamp: number;
  status: "queued" | "analyzing" | "completed" | "error";
  productName?: string;
  brand?: string;
  category?: string;
  condition?: string;
  estimatedValue?: number;
  thriftCost?: number;
  trueNetProfit?: number;
  roiPercentage?: number;
  copVerdict?: "MUST_COP" | "QUICK_FLIP" | "PASS_RISKY";
  isGrail?: boolean;
  needsVerification?: boolean;
  notes?: string;
  errorMessage?: string;
}

export interface RapidSessionStats {
  totalItems: number;
  completedItems: number;
  queuedItems: number;
  profitableCount: number;
  totalProfit: number;
  grailsCount: number;
}

const LOCAL_STORAGE_SESSION_KEY = "spadas_rapid_thrift_session";
const IDB_NAME = "spadas_thrift_db";
const IDB_STORE = "photos";
const IDB_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* IndexedDB Zero-Base64 Photo Storage Layer                                  */
/* -------------------------------------------------------------------------- */

let idbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is unavailable in this environment."));
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return idbPromise;
}

export async function savePhotoBlob(photoId: string, blob: Blob): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(blob, photoId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Rapid Thrift Engine] Failed to store photo in IndexedDB:", err);
  }
}

export async function getPhotoBlob(photoId: string): Promise<Blob | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(photoId);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Rapid Thrift Engine] Failed to retrieve photo from IndexedDB:", err);
    return null;
  }
}

export async function deletePhotoBlob(photoId: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(photoId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Rapid Thrift Engine] Failed to delete photo from IndexedDB:", err);
  }
}

export async function clearAllPhotoBlobs(): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Rapid Thrift Engine] Failed to clear IndexedDB photos:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* Lightweight LocalStorage Session Metadata Layer                            */
/* -------------------------------------------------------------------------- */

export function loadRapidSession(): RapidThriftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRapidSession(items: RapidThriftItem[]): void {
  if (typeof window === "undefined") return;
  try {
    // Strip any accidental blobs or giant strings — strictly lightweight metadata
    const lightweight = items.map((item) => ({
      id: item.id,
      photoId: item.photoId,
      timestamp: item.timestamp,
      status: item.status,
      productName: item.productName,
      brand: item.brand,
      category: item.category,
      condition: item.condition,
      estimatedValue: item.estimatedValue,
      thriftCost: item.thriftCost,
      trueNetProfit: item.trueNetProfit,
      roiPercentage: item.roiPercentage,
      copVerdict: item.copVerdict,
      isGrail: item.isGrail,
      needsVerification: item.needsVerification,
      errorMessage: item.errorMessage,
    }));
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(lightweight));
  } catch (err) {
    console.warn("[Rapid Thrift Engine] Failed to save session metadata:", err);
  }
}

export async function clearRapidSession(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    } catch {}
  }
  await clearAllPhotoBlobs();
}

export function computeSessionStats(items: RapidThriftItem[]): RapidSessionStats {
  let totalProfit = 0;
  let profitableCount = 0;
  let grailsCount = 0;
  let completedItems = 0;
  let queuedItems = 0;

  for (const item of items) {
    if (item.status === "completed") {
      completedItems++;
      const profit = item.trueNetProfit || 0;
      if (profit > 5) {
        profitableCount++;
        totalProfit += profit;
      }
      if (profit >= 50 || item.isGrail) {
        grailsCount++;
      }
    } else if (item.status === "queued" || item.status === "analyzing") {
      queuedItems++;
    }
  }

  return {
    totalItems: items.length,
    completedItems,
    queuedItems,
    profitableCount,
    totalProfit: Math.round(totalProfit * 100) / 100,
    grailsCount,
  };
}

/* -------------------------------------------------------------------------- */
/* Web Audio API Dual-Tone Chime Fallback (iOS Safari Compatible)             */
/* -------------------------------------------------------------------------- */

let audioCtx: AudioContext | null = null;

export function playDualToneChime(profit = 50): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Pitch adjusts slightly higher for grails (> $50 profit)
    const baseFreq = profit >= 50 ? 880 : 587.33; // A5 vs D5
    const secondFreq = profit >= 50 ? 1318.51 : 880; // E6 vs A5

    // Tone 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(baseFreq, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2 (Harmonic alert)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(secondFreq, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn("[Rapid Thrift Engine] Audio chime fallback error:", err);
  }
}

/**
 * Pocket Dual-Vibration + Audio Alert
 * Triggers strong double pulse ([400, 150, 400]) on profit >= $50 AUD or counterfeit risk
 */
export function triggerPocketAlert(profit: number, isHighRisk: boolean, soundEnabled = true): void {
  if (profit >= 50 || isHighRisk) {
    // 1. Dual vibration pulse
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([400, 150, 400]);
    }
    // 2. Audible chime
    if (soundEnabled) {
      playDualToneChime(profit);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Non-blocking Image Capture Helper                                          */
/* -------------------------------------------------------------------------- */

export async function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}
