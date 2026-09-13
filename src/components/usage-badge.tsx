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
        <div className="badge-active inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5 text-[#00F2FE]" />
          <span>Pro Plan — Unlimited</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer border active:scale-95 ${
              usage.limitReached
                ? "badge-error animate-pulse"
                : "badge-info hover:bg-white/[0.08]"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>
              {usage.limitReached
                ? `0 / ${usage.maxFreeUses} Free Scans Today (Limit Reached)`
                : `${usage.usesLeft} / ${usage.maxFreeUses} Free Scans Today`}
            </span>
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl glass-card bg-[#030305]/95 border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-5 text-center text-zinc-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl glass text-[#00F2FE] border border-white/[0.08]">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {usage.limitReached
                  ? "Daily Free Scan Limit Reached"
                  : "Upgrade to Spadas Pro"}
              </h3>
              <p className="text-xs text-zinc-400">
                {usage.limitReached
                  ? `You've used all ${usage.maxFreeUses} free scans for today. Upgrade to Spadas Pro for unlimited 60FPS AR camera scans, live sold comps, and 1-click eBay publishing.`
                  : "Unlock unlimited AI generations, 60FPS continuous camera scanner, and 1-click publishing."}
              </p>
            </div>

            <div className="rounded-2xl glass p-4 text-left space-y-2 text-xs border border-white/[0.06]">
              <div className="flex items-center gap-2 font-bold text-zinc-200">
                ✓ Unlimited 60FPS Continuous AR Camera Scans
              </div>
              <div className="flex items-center gap-2 font-bold text-zinc-200">
                ✓ Live Australia 30-Day Completed eBay Comps
              </div>
              <div className="flex items-center gap-2 font-bold text-zinc-200">
                ✓ 1-Click Automated Background Publishing to eBay AU
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 font-black text-xs text-slate-950 shadow-xl shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-50"
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
