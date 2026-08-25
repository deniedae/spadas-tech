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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email || "" }),
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-black text-cyan-300 border border-cyan-400/30">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Pro Plan — Unlimited</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition cursor-pointer border ${
              usage.limitReached
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>
              {usage.limitReached
                ? `0 / ${usage.maxFreeUses} Free Scans (Limit Reached)`
                : `${usage.usesLeft} / ${usage.maxFreeUses} Free Scans Left`}
            </span>
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 text-center text-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {usage.limitReached
                  ? "Free Scan Limit Reached"
                  : "Upgrade to Spadas Pro"}
              </h3>
              <p className="text-xs text-slate-300">
                {usage.limitReached
                  ? `You've used all ${usage.maxFreeUses} free AI scans. Upgrade to Spadas Pro for unlimited 60FPS AR camera scans, live sold comps, and 1-click eBay publishing.`
                  : "Unlock unlimited AI generations, 60FPS continuous camera scanner, and 1-click publishing."}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 text-left space-y-2 text-xs border border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                ✓ Unlimited 60FPS Continuous AR Camera Scans
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-200">
                ✓ Live Australia 30-Day Completed eBay Comps
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-200">
                ✓ 1-Click Automated Background Publishing to eBay AU
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 font-black text-xs text-slate-950 shadow-xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {upgrading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>Upgrade to Spadas Pro ($10 AUD/mo)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-slate-400 hover:text-white py-1 transition cursor-pointer"
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
