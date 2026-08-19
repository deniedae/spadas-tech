/**
 * Smart Sync Background Queue Engine
 * Automatically queues offline scan records in IndexedDB and flushes them to Supabase as soon as network connection is restored.
 */
import { getOfflineScans, clearOfflineScans } from "@/app/lib/offline-storage";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";

export class SmartSyncQueue {
  private isSyncing = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.flushQueue();
      });
    }
  }

  public async flushQueue(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const offlineScans = await getOfflineScans();
      if (offlineScans.length === 0) {
        this.isSyncing = false;
        return;
      }

      toast.info(`🌐 Internet connection restored! Syncing ${offlineScans.length} offline scans to cloud...`);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        this.isSyncing = false;
        return;
      }

      let syncedCount = 0;
      for (const item of offlineScans) {
        const payload = item.data;
        if (!payload) continue;

        const { error } = await supabase.from("listings").insert([
          {
            user_id: user.id,
            product: payload.product || "Offline Scanned Item",
            price: payload.price || 0,
            status: "Active",
            created_at: new Date(item.timestamp).toISOString(),
          },
        ]);

        if (!error) syncedCount++;
      }

      await clearOfflineScans();
      toast.success(`✅ Automatically synced ${syncedCount} offline thrift scans to your inventory!`);
    } catch (err) {
      console.warn("[SmartSyncQueue] Flush queue warning:", err);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const globalSmartSyncQueue = new SmartSyncQueue();
