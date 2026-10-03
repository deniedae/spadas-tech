"use client";

import { useEffect, useState } from "react";
import { Sparkles, Zap, ShieldAlert, Loader2 } from "lucide-react";
import type { UsageStatus } from "@/app/lib/usage";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";

import { purchaseGooglePlaySubscription } from "@/lib/google-play-billing";

export default function UsageBadge({
  onUsageLoaded,
}: {
  onUsageLoaded?: (usage: UsageStatus) => void;
}) {
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const data: UsageStatus = await res.json();
        setUsage(data);
        onUsageLoaded?.(data);
        if (data.limitReached) {
          setShowUpgradeModal(true);
        }
      } catch (err) {
        console.error("Failed to load usage:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadUsage();

    const handleUpdate = () => void loadUsage();
    window.addEventListener("usage-updated", handleUpdate);
    return () => window.removeEventListener("usage-updated", handleUpdate);
  }, [onUsageLoaded]);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await purchaseGooglePlaySubscription();
      if (res.active) {
        toast.success("🎉 Welcome to Spadas Pro! Unlimited scanning unlocked.");
        window.location.reload();
        return;
      }
      if (res.canceled && res.dismissedByUser) return;
      if (res.error) {
        toast.error(res.error);
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upgrade failed.");
    } finally {
      setUpgrading(false);
    }
  }

  if (loading || !usage) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold text-emerald-400">
      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
      <span>Launch Access — Unlimited</span>
    </div>
  );
}
