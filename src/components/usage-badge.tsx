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
    <>
      {usage.isPro ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold text-emerald-400">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Pro Plan — Unlimited</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-medium transition cursor-pointer border active:scale-95 ${
              usage.limitReached
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-white/[0.04] text-zinc-300 border-white/[0.10] hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-zinc-400" />
            <span>
              {usage.limitReached
                ? `0 / ${usage.maxFreeUses} Scans (Limit Reached)`
                : `${usage.usesLeft} / ${usage.maxFreeUses} Scans Today`}
            </span>
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1017] border border-white/[0.12] p-6 sm:p-8 shadow-2xl space-y-5 text-center text-zinc-100">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/[0.10]">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {usage.limitReached
                  ? "Daily Free Scan Limit Reached"
                  : "Upgrade to Spadas Pro"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {usage.limitReached
                  ? `You've used all ${usage.maxFreeUses} free scans for today. Upgrade to Spadas Pro for unlimited 60FPS camera scans, live eBay sold comps, and 1-click eBay publishing.`
                  : "Unlock unlimited AI generations, 60FPS continuous camera scanner, and 1-click publishing."}
              </p>
            </div>

            <div className="rounded-xl bg-[#141721] p-4 text-left space-y-2 text-xs border border-white/[0.06]">
              <div className="flex items-center gap-2 font-medium text-zinc-200">
                <span className="text-emerald-400">✓</span> Unlimited Continuous Camera Scans
              </div>
              <div className="flex items-center gap-2 font-medium text-zinc-200">
                <span className="text-emerald-400">✓</span> Live Australia 30-Day Completed eBay Comps
              </div>
              <div className="flex items-center gap-2 font-medium text-zinc-200">
                <span className="text-emerald-400">✓</span> 1-Click Automated Background Publishing to eBay AU
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 font-bold text-xs text-zinc-950 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {upgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                ) : (
                  <Sparkles className="h-4 w-4 text-zinc-950" />
                )}
                <span>Upgrade to Spadas Pro ($10 AUD/mo)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-zinc-400 hover:text-white py-1 transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
