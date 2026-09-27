"use client";

import { useEffect, useState } from "react";
import { Sparkles, Zap, ShieldAlert, Loader2 } from "lucide-react";
import type { UsageStatus } from "@/app/lib/usage";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";

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
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ planId: "starter", email: session?.user?.email || "" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upgrade failed.");
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
