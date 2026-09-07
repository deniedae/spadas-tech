/**
 * Spadas Instant Guest Scan Tracker
 * Enables zero-friction, unauthenticated live scanning for new users.
 * Allows up to MAX_GUEST_SCANS (3) scans before prompting account creation.
 */

export const MAX_GUEST_SCANS = 3;
const GUEST_STORAGE_KEY = "spadas_guest_scan_v1";
const GUEST_ITEMS_KEY = "spadas_guest_saved_items";

export interface GuestScanState {
  count: number;
  remaining: number;
  isLimitReached: boolean;
  firstScanAt: number | null;
  lastScanAt: number | null;
}

export function getGuestScanState(): GuestScanState {
  if (typeof window === "undefined") {
    return {
      count: 0,
      remaining: MAX_GUEST_SCANS,
      isLimitReached: false,
      firstScanAt: null,
      lastScanAt: null,
    };
  }

  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) {
      return {
        count: 0,
        remaining: MAX_GUEST_SCANS,
        isLimitReached: false,
        firstScanAt: null,
        lastScanAt: null,
      };
    }

    const parsed = JSON.parse(raw);
    const count = typeof parsed.count === "number" ? parsed.count : 0;

    // Auto-reset if last scan was more than 24 hours ago (fresh daily session)
    const lastScanAt = parsed.lastScanAt || null;
    const isStale = lastScanAt && (Date.now() - lastScanAt > 24 * 60 * 60 * 1000);
    if (isStale) {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      document.cookie = "spadas_guest_count=0; path=/; max-age=0; SameSite=Lax";
      return {
        count: 0,
        remaining: MAX_GUEST_SCANS,
        isLimitReached: false,
        firstScanAt: null,
        lastScanAt: null,
      };
    }

    const remaining = Math.max(0, MAX_GUEST_SCANS - count);

    return {
      count,
      remaining,
      isLimitReached: count >= MAX_GUEST_SCANS,
      firstScanAt: parsed.firstScanAt || null,
      lastScanAt,
    };
  } catch {
    return {
      count: 0,
      remaining: MAX_GUEST_SCANS,
      isLimitReached: false,
      firstScanAt: null,
      lastScanAt: null,
    };
  }
}

export function recordGuestScan(): GuestScanState {
  if (typeof window === "undefined") {
    return {
      count: 1,
      remaining: MAX_GUEST_SCANS - 1,
      isLimitReached: false,
      firstScanAt: Date.now(),
      lastScanAt: Date.now(),
    };
  }

  const current = getGuestScanState();
  const newCount = current.count + 1;
  const newRemaining = Math.max(0, MAX_GUEST_SCANS - newCount);
  const now = Date.now();

  const nextState: GuestScanState = {
    count: newCount,
    remaining: newRemaining,
    isLimitReached: newCount >= MAX_GUEST_SCANS,
    firstScanAt: current.firstScanAt || now,
    lastScanAt: now,
  };

  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(nextState));
    // Set lightweight cookie for SSR & middleware awareness
    document.cookie = `spadas_guest_count=${newCount}; path=/; max-age=2592000; SameSite=Lax`;
  } catch (err) {
    console.warn("[GuestScanTracker] Failed to persist state:", err);
  }

  return nextState;
}

export function saveGuestScannedItem(item: any): void {
  if (typeof window === "undefined" || !item) return;
  try {
    const existingRaw = localStorage.getItem(GUEST_ITEMS_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [item, ...(Array.isArray(existing) ? existing : [])].slice(0, 10);
    localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("[GuestScanTracker] Failed to save item:", err);
  }
}

export function getGuestScannedItems(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function resetGuestScanState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(GUEST_ITEMS_KEY);
    document.cookie = "spadas_guest_count=0; path=/; max-age=0; SameSite=Lax";
  } catch {}
}
