"use client";

import { resetGuestScanState } from "./guest-scan-tracker";
import { haulStore } from "./haul-store";
import { clearRapidSession } from "./rapid-thrift-engine";

export const PRIME_RESET_EVENT = "spadas:prime-reset";
export const USER_SCANS_UPDATED_EVENT = "spadas:user-scans-updated";
export const MAX_FREE_SCANS = 3;

const ACTIVE_USER_KEY = "spadas_active_user_id";

export interface UserScanState {
  count: number;
  remaining: number;
  limitReached: boolean;
  userId: string;
}

/**
 * Prime Reset: Strict purge of all residual scan, comp, haul, and find data.
 * Guarantees that new accounts and guest sessions always start with a clean slate.
 */
export function performPrimeReset(options?: {
  newUserId?: string | null;
  preserveAuth?: boolean;
  resetWelcomeModal?: boolean;
}): void {
  if (typeof window === "undefined") return;

  const newUserId = options?.newUserId || null;

  try {
    // 1. Purge legacy unscoped cache keys
    const unscopedKeysToRemove = [
      "spadas_cached_lens_hits",
      "spadas_guest_saved_items",
      "spadas_guest_scan_v1",
      "spadas_saved_hit_ids",
      "spadas_pending_scans_queue",
      "spadas_pending_listings_queue",
      "spadas_rapid_thrift_session",
      "spadas_recent_scans",
      "spadas_recent_scanned_grail",
      "spadas_lru_comps",
      "spadas_widget_profit",
      "spadas_widget_items",
      "spadas_spatial_memory",
    ];

    if (options?.resetWelcomeModal) {
      unscopedKeysToRemove.push("spadas_first_launch_welcome_v1", "hasCompletedOnboarding", "hasSeenOnboarding");
    }

    unscopedKeysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });

    // 2. Purge other users' scoped hits if switching accounts
    try {
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (k.startsWith("spadas_hits_") && (!newUserId || k !== `spadas_hits_${newUserId}`)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    // 3. Reset cookies
    document.cookie = "spadas_guest_count=0; path=/; max-age=0; SameSite=Lax";

    // 4. Reset guest tracker
    resetGuestScanState();

    // 5. Clear Haul Store memory and IndexedDB photo blobs
    void haulStore.clearHaul();
    void clearRapidSession();

    // 6. Set or clear active user ID tracking
    if (newUserId) {
      localStorage.setItem(ACTIVE_USER_KEY, newUserId);
      // Initialize fresh 3 free scans for new account if not already tracked
      const existingUserScans = getUserScanState(newUserId);
      if (!existingUserScans || existingUserScans.count === 0) {
        setUserScanState(newUserId, {
          count: 0,
          remaining: MAX_FREE_SCANS,
          limitReached: false,
          userId: newUserId,
        });
      }
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }

    // 7. Fire reactive event to zero out all UI components immediately
    window.dispatchEvent(
      new CustomEvent(PRIME_RESET_EVENT, {
        detail: {
          userId: newUserId,
          timestamp: Date.now(),
        },
      })
    );
  } catch (err) {
    console.warn("[Prime Reset] Purge warning:", err);
  }
}

/**
 * Returns the storage key for cached hits scoped strictly to the current user ID
 */
export function getScopedHitsKey(userId?: string | null): string {
  if (userId && typeof userId === "string") {
    return `spadas_hits_${userId}`;
  }
  return "spadas_hits_guest";
}

/**
 * Get the current user's scan count state
 */
export function getUserScanState(userId: string): UserScanState {
  if (typeof window === "undefined" || !userId) {
    return {
      count: 0,
      remaining: MAX_FREE_SCANS,
      limitReached: false,
      userId: userId || "",
    };
  }

  try {
    const raw = localStorage.getItem(`spadas_user_scans_${userId}`);
    if (!raw) {
      return {
        count: 0,
        remaining: MAX_FREE_SCANS,
        limitReached: false,
        userId,
      };
    }
    const parsed = JSON.parse(raw);
    const count = typeof parsed.count === "number" ? parsed.count : 0;
    const remaining = Math.max(0, MAX_FREE_SCANS - count);
    return {
      count,
      remaining,
      limitReached: count >= MAX_FREE_SCANS,
      userId,
    };
  } catch {
    return {
      count: 0,
      remaining: MAX_FREE_SCANS,
      limitReached: false,
      userId,
    };
  }
}

/**
 * Set the user's scan count state
 */
export function setUserScanState(userId: string, state: UserScanState): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`spadas_user_scans_${userId}`, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(USER_SCANS_UPDATED_EVENT, { detail: state }));
  } catch {}
}

/**
 * Record a scan for an authenticated free user, counting down from 3
 */
export function recordUserScan(userId: string): UserScanState {
  const current = getUserScanState(userId);
  const newCount = current.count + 1;
  const newRemaining = Math.max(0, MAX_FREE_SCANS - newCount);
  const nextState: UserScanState = {
    count: newCount,
    remaining: newRemaining,
    limitReached: newCount >= MAX_FREE_SCANS,
    userId,
  };
  setUserScanState(userId, nextState);
  return nextState;
}

/**
 * Guard that verifies if the active user ID has changed.
 * If changed, automatically executes a Prime Reset.
 */
export function enforceUserIsolation(currentUserId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const lastActiveUser = localStorage.getItem(ACTIVE_USER_KEY);
  const targetUser = currentUserId || null;
  if (lastActiveUser !== targetUser) {
    performPrimeReset({ newUserId: targetUser, preserveAuth: true });
    return true;
  }
  return false;
}
