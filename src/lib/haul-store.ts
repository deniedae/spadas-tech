"use client";

import { useSyncExternalStore, useMemo, useEffect, useState } from "react";
import {
  RapidThriftItem,
  RapidSessionStats,
  loadRapidSession,
  saveRapidSession,
  clearRapidSession,
  deletePhotoBlob,
  computeSessionStats,
} from "./rapid-thrift-engine";
import { sourcingBus } from "./sourcing-event-bus";

export const SPADAS_HAUL_UPDATED_EVENT = "spadas:haul-updated";

let memoryItems: RapidThriftItem[] | null = null;
let cachedStats: RapidSessionStats | null = null;
const listeners = new Set<() => void>();

function getItemsSnapshot(): RapidThriftItem[] {
  if (memoryItems === null) {
    memoryItems = typeof window !== "undefined" ? loadRapidSession() : [];
  }
  return memoryItems;
}

export function getStatsSnapshot(items: RapidThriftItem[]): RapidSessionStats {
  if (!cachedStats) {
    cachedStats = computeSessionStats(items);
  }
  return cachedStats;
}

function updateCachedStats(newItems: RapidThriftItem[]) {
  const nextStats = computeSessionStats(newItems);
  if (
    !cachedStats ||
    cachedStats.totalItems !== nextStats.totalItems ||
    cachedStats.completedItems !== nextStats.completedItems ||
    cachedStats.queuedItems !== nextStats.queuedItems ||
    cachedStats.profitableCount !== nextStats.profitableCount ||
    cachedStats.totalProfit !== nextStats.totalProfit ||
    cachedStats.grailsCount !== nextStats.grailsCount
  ) {
    cachedStats = nextStats;
  }
}

const SERVER_SNAPSHOT: RapidThriftItem[] = [];
function getServerSnapshot(): RapidThriftItem[] {
  return SERVER_SNAPSHOT;
}

function notifySubscribers(newItems: RapidThriftItem[]) {
  memoryItems = newItems;
  updateCachedStats(newItems);
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("[Haul Store] Subscriber listener error:", err);
    }
  });

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(SPADAS_HAUL_UPDATED_EVENT, { detail: { items: newItems } })
      );
    } catch {}
  }
}

// Global browser listeners for cross-component, cross-tab and cross-window reactivity
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === "spadas_rapid_thrift_session") {
      const reloaded = loadRapidSession();
      notifySubscribers(reloaded);
    }
  });

  window.addEventListener(SPADAS_HAUL_UPDATED_EVENT, (e: any) => {
    const itemsFromEvent = e.detail?.items;
    if (itemsFromEvent && itemsFromEvent !== memoryItems) {
      memoryItems = itemsFromEvent;
      listeners.forEach((listener) => {
        try {
          listener();
        } catch {}
      });
    }
  });
}

export const haulStore = {
  getState(): RapidThriftItem[] {
    return getItemsSnapshot();
  },

  getSnapshot(): RapidThriftItem[] {
    return getItemsSnapshot();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setItems(
    updater: RapidThriftItem[] | ((prev: RapidThriftItem[]) => RapidThriftItem[])
  ): RapidThriftItem[] {
    const current = getItemsSnapshot();
    const nextItems = typeof updater === "function" ? updater(current) : updater;
    saveRapidSession(nextItems);
    notifySubscribers(nextItems);

    // Sync sourcing event bus and metrics
    const stats = computeSessionStats(nextItems);
    if (nextItems.length === 0) {
      sourcingBus.emit("HAUL_CLEARED", {
        type: "HAUL_CLEARED",
        haulCount: 0,
        totalProfit: 0,
        timestamp: Date.now(),
      });
    }
    return nextItems;
  },

  addItem(item: RapidThriftItem): void {
    const current = getItemsSnapshot();
    const nextItems = [item, ...current.filter((i) => i.id !== item.id)];
    haulStore.setItems(nextItems);
  },

  addItems(items: RapidThriftItem[]): void {
    const current = getItemsSnapshot();
    const ids = new Set(items.map((i) => i.id));
    const nextItems = [...items, ...current.filter((i) => !ids.has(i.id))];
    haulStore.setItems(nextItems);
  },

  updateItem(id: string, patch: Partial<RapidThriftItem>): void {
    const current = getItemsSnapshot();
    const nextItems = current.map((i) => (i.id === id ? { ...i, ...patch } : i));
    haulStore.setItems(nextItems);
  },

  async removeItem(id: string): Promise<void> {
    const current = getItemsSnapshot();
    const target = current.find((i) => i.id === id);
    if (target?.photoId) {
      try {
        await deletePhotoBlob(target.photoId);
      } catch (err) {
        console.warn("[Haul Store] Failed to delete photo blob:", target.photoId, err);
      }
    }
    const nextItems = current.filter((i) => i.id !== id);
    haulStore.setItems(nextItems);
  },

  async clearHaul(): Promise<void> {
    await clearRapidSession();
    notifySubscribers([]);
    sourcingBus.emit("HAUL_CLEARED", {
      type: "HAUL_CLEARED",
      haulCount: 0,
      totalProfit: 0,
      timestamp: Date.now(),
    });
  },

  refresh(): void {
    if (typeof window === "undefined") return;
    const reloaded = loadRapidSession();
    notifySubscribers(reloaded);
  },
};

/**
 * Universal Reactive Hook for Spadas Haul State
 * Ensures 0ms hydration sync across camera HUD, haul manifest, and summary metrics.
 */
export function useHaulStore() {
  const items = useSyncExternalStore(
    haulStore.subscribe,
    haulStore.getSnapshot,
    getServerSnapshot
  );

  const stats = useMemo(() => getStatsSnapshot(items), [items]);

  const totalCostBasis = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.thriftCost || 0), 0);
  }, [items]);

  const totalGrossValue = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
  }, [items]);

  const totalProfit = stats.totalProfit;

  const aggregateRoi = useMemo(() => {
    if (totalCostBasis <= 0) return 0;
    return Math.round((stats.totalProfit / totalCostBasis) * 100);
  }, [stats.totalProfit, totalCostBasis]);

  const profitableCount = stats.profitableCount;
  const grailsCount = stats.grailsCount;

  return {
    items,
    isHydrated: true,
    haulCount: items.length,
    stats,
    rapidStats: stats, // Backward-compatibility alias for SpadasLensCamera
    totalCostBasis,
    totalGrossValue,
    totalProfit,
    aggregateRoi,
    profitableCount,
    grailsCount,
    addItem: haulStore.addItem,
    addItems: haulStore.addItems,
    updateItem: haulStore.updateItem,
    removeItem: haulStore.removeItem,
    clearHaul: haulStore.clearHaul,
    setItems: haulStore.setItems,
    refresh: haulStore.refresh,
  };
}
