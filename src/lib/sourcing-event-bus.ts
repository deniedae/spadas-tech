/**
 * Spadas Reactive Sourcing Event Bus (Observer Pattern)
 * Centralizes real-time sourcing events across AR Camera, Audio Synthesizers,
 * Dashboard Widgets, and the Android Native Companion Bridge with zero re-render thrash.
 */

import { syncProfitToAndroidWidget, triggerTactileHaptic } from "./android-bridge";
import type { DetectedHit, ActiveScanItem } from "@/types/lens";

export type SourcingEventType =
  | "SCAN_STARTED"
  | "ITEM_VALUED"
  | "GRAIL_DETECTED"
  | "DRAFT_SAVED"
  | "HAUL_CLEARED"
  | "OFFLINE_MODE_CHANGED";

export interface SourcingEventPayload {
  type: SourcingEventType;
  item?: DetectedHit | ActiveScanItem;
  totalProfit?: number;
  haulCount?: number;
  isGrail?: boolean;
  timestamp: number;
}

export type SourcingEventListener = (payload: SourcingEventPayload) => void;

class SourcingEventBusSingleton {
  private listeners: Map<SourcingEventType, Set<SourcingEventListener>> = new Map();
  private globalListeners: Set<SourcingEventListener> = new Set();
  private currentHaulProfit = 0;
  private currentHaulCount = 0;

  constructor() {
    // Built-in reactive observer for Android Widget & Hardware Haptics
    this.subscribe("ITEM_VALUED", (payload) => {
      if (payload.item) {
        const itemProfit = payload.item.estimatedProfit || payload.item.trueNetProfit || 0;
        this.currentHaulProfit += itemProfit;
        this.currentHaulCount += 1;

        syncProfitToAndroidWidget(this.currentHaulProfit, this.currentHaulCount);

        if (payload.isGrail || itemProfit >= 80) {
          triggerTactileHaptic("success");
        } else {
          triggerTactileHaptic("light");
        }
      }
    });

    this.subscribe("HAUL_CLEARED", () => {
      this.currentHaulProfit = 0;
      this.currentHaulCount = 0;
      syncProfitToAndroidWidget(0, 0);
    });
  }

  /**
   * Subscribe to a specific event type.
   */
  public subscribe(
    eventType: SourcingEventType,
    listener: SourcingEventListener
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return un-subscribe callback for React useEffect cleanups
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Subscribe to all sourcing events.
   */
  public subscribeAll(listener: SourcingEventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Publish an event to all registered observers.
   */
  public emit(type: SourcingEventType, data?: Partial<SourcingEventPayload>): void {
    const payload: SourcingEventPayload = {
      type,
      item: data?.item,
      totalProfit: data?.totalProfit ?? this.currentHaulProfit,
      haulCount: data?.haulCount ?? this.currentHaulCount,
      isGrail: data?.isGrail ?? false,
      timestamp: Date.now(),
    };

    // Specific listeners
    const specific = this.listeners.get(type);
    if (specific) {
      specific.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.warn("[SourcingEventBus] Listener exception:", err);
        }
      });
    }

    // Global listeners
    this.globalListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.warn("[SourcingEventBus] Global listener exception:", err);
      }
    });
  }

  public getHaulMetrics(): { totalProfit: number; itemCount: number } {
    return {
      totalProfit: this.currentHaulProfit,
      itemCount: this.currentHaulCount,
    };
  }
}

export const sourcingBus = new SourcingEventBusSingleton();
