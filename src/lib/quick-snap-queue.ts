"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { haulStore } from "./haul-store";
import {
  RapidThriftItem,
  savePhotoBlob,
  triggerPocketAlert,
} from "./rapid-thrift-engine";
import { resilientFetch } from "@/app/lib/resilient-fetch";
import { supabase } from "@/app/lib/supabase";
import { appraiseItemLocally } from "@/app/lib/offline/offline-engine";

interface QueueTask {
  id: string;
  photoId: string;
  blob: Blob;
  currency: string;
}

class QuickSnapQueueService {
  private queue: QueueTask[] = [];
  private activeWorkers = 0;
  private readonly maxConcurrency = 2;
  private listeners = new Set<() => void>();
  private cachedSnapshot = { isProcessing: false, pendingCount: 0 };

  private updateSnapshot() {
    const isProcessing = this.activeWorkers > 0 || this.queue.length > 0;
    const pendingCount = this.queue.length + this.activeWorkers;
    if (
      this.cachedSnapshot.isProcessing !== isProcessing ||
      this.cachedSnapshot.pendingCount !== pendingCount
    ) {
      this.cachedSnapshot = { isProcessing, pendingCount };
    }
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.updateSnapshot();
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  }

  public getSnapshot = (): { isProcessing: boolean; pendingCount: number } => {
    return this.cachedSnapshot;
  };

  /**
   * Enqueue a single captured photo for asynchronous background valuation.
   * Immediately registers the item in haulStore (0ms count increment) and asynchronously persists the photo blob to IndexedDB without blocking the main UI thread.
   */
  public enqueuePhoto = async (
    blobOrPromise: Blob | Promise<Blob>,
    metadata?: Partial<RapidThriftItem>,
    currency = "AUD"
  ): Promise<RapidThriftItem> => {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 7);
    const photoId = `photo_snap_${timestamp}_${rand}`;
    const id = `snap_${timestamp}_${rand}`;

    // 1. Immediately register in reactive Haul Store with queued status (0ms synchronous UI update)
    const item: RapidThriftItem = {
      id,
      photoId,
      timestamp,
      status: "queued",
      productName: metadata?.productName || "Sourced Thrift Item",
      brand: metadata?.brand || "Analyzing...",
      category: metadata?.category || "General",
      condition: metadata?.condition || "Used - Good",
      estimatedValue: metadata?.estimatedValue || 35,
      thriftCost: metadata?.thriftCost || 5,
      trueNetProfit: metadata?.trueNetProfit || 25,
      copVerdict: metadata?.copVerdict || "VERIFY_FIRST",
      isGrail: Boolean(metadata?.isGrail),
      ...metadata,
    };

    haulStore.addItem(item);

    // 2. Asynchronously resolve blob, persist to IndexedDB in background, and dispatch to worker queue
    if (blobOrPromise instanceof Blob) {
      void savePhotoBlob(photoId, blobOrPromise).catch((err) => {
        console.warn("[QuickSnapQueue] Failed to persist photo blob to IndexedDB:", err);
      });
      this.queue.push({ id, photoId, blob: blobOrPromise, currency });
      this.notify();
      void this.processQueue();
    } else {
      Promise.resolve(blobOrPromise)
        .then((blob) => {
          if (!blob) throw new Error("Null blob resolved");
          void savePhotoBlob(photoId, blob).catch((err) => {
            console.warn("[QuickSnapQueue] Failed to persist photo blob to IndexedDB:", err);
          });
          this.queue.push({ id, photoId, blob, currency });
          this.notify();
          void this.processQueue();
        })
        .catch((err) => {
          console.error("[QuickSnapQueue] Failed to resolve captured frame blob:", err);
          haulStore.updateItem(id, {
            status: "completed",
            productName: "Frame capture error",
            brand: "Unidentified",
            trueNetProfit: 0,
            copVerdict: "PASS_RISKY",
          });
        });
    }

    return item;
  };

  /**
   * Batch enqueue rapid-fire photos on the run.
   */
  public enqueuePhotos = async (
    blobs: Blob[],
    currency = "AUD"
  ): Promise<RapidThriftItem[]> => {
    const items = await Promise.all(
      blobs.map((blob) => this.enqueuePhoto(blob, undefined, currency))
    );
    return items;
  };

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeWorkers < this.maxConcurrency) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeWorkers++;
      this.notify();

      // Mark item as analyzing
      haulStore.updateItem(task.id, { status: "analyzing" });

      void (async () => {
        try {
          const base64Data = await this.blobToBase64(task.blob);

          const { data: sessionData } = await supabase.auth.getSession();
          const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (sessionData?.session?.access_token) {
            requestHeaders["Authorization"] = `Bearer ${sessionData.session.access_token}`;
          }

          const res = await resilientFetch(
            "/api/rapid-thrift",
            {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify({
                image: base64Data,
                currency: task.currency,
              }),
            },
            { maxRetries: 1, initialDelayMs: 200 }
          ).catch(() => null);

          let data: any = null;
          if (res && res.ok) {
            data = await res.json().catch(() => null);
          }

          // Fallback to local offline catalog if network dropped or rate limited
          if (!data || data.error) {
            const offline = appraiseItemLocally();
            data = {
              product_name: offline.productName,
              brand: offline.brand,
              category: offline.category,
              condition: offline.condition,
              estimated_value: offline.estimatedValue,
              thrift_cost: offline.tagPrice,
              true_net_profit: offline.trueNetProfit,
              roi_percentage: offline.roiPercentage,
              cop_verdict: offline.copVerdict,
              is_grail: offline.trueNetProfit >= 50,
              needs_verification: false,
            };
          }

          const profit = Number(data.true_net_profit) || 0;
          const isHighRisk = Boolean(data.needs_verification);

          haulStore.updateItem(task.id, {
            status: "completed",
            productName: data.product_name || "Thrift Sourced Item",
            brand: data.brand || "Authentic",
            category: data.category || "General",
            condition: data.condition || "Used - Good",
            estimatedValue: Number(data.estimated_value) || 25,
            thriftCost: Number(data.thrift_cost) || 5,
            trueNetProfit: profit,
            roiPercentage: Number(data.roi_percentage) || 0,
            copVerdict: data.cop_verdict || (profit >= 50 ? "MUST_COP" : "QUICK_FLIP"),
            isGrail: profit >= 50 || Boolean(data.is_grail),
            needsVerification: isHighRisk,
            notes: data.notes || undefined,
          });

          // Haptic alert on high-value grails
          triggerPocketAlert(profit, isHighRisk);
        } catch (err) {
          console.warn("[QuickSnapQueue] Valuation worker error:", err);
          // Graceful fallback to completed offline estimate so items are never stuck
          const offline = appraiseItemLocally();
          haulStore.updateItem(task.id, {
            status: "completed",
            productName: offline.productName,
            brand: offline.brand,
            category: offline.category,
            condition: offline.condition,
            estimatedValue: offline.estimatedValue,
            thriftCost: offline.tagPrice,
            trueNetProfit: offline.trueNetProfit,
            roiPercentage: offline.roiPercentage,
            copVerdict: offline.copVerdict,
            isGrail: offline.trueNetProfit >= 50,
          });
        } finally {
          this.activeWorkers = Math.max(0, this.activeWorkers - 1);
          this.notify();
          void this.processQueue();
        }
      })();
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const quickSnapQueue = new QuickSnapQueueService();

const SERVER_SNAPSHOT = { isProcessing: false, pendingCount: 0 };

/**
 * Hook for consuming real-time Quick Snap background queue status
 */
export function useQuickSnapQueue() {
  const state = useSyncExternalStore(
    quickSnapQueue.subscribe,
    quickSnapQueue.getSnapshot,
    () => SERVER_SNAPSHOT
  );

  return {
    isProcessing: state.isProcessing,
    pendingCount: state.pendingCount,
    enqueuePhoto: quickSnapQueue.enqueuePhoto,
    enqueuePhotos: quickSnapQueue.enqueuePhotos,
  };
}
