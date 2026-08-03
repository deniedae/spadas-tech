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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600/15 to-cyan-500/15 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Pro Plan — Unlimited Uses</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              usage.limitReached
                ? "bg-red-500/15 text-red-600 border border-red-500/30 animate-pulse"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/25"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>
              {usage.limitReached
                ? "0 / 10 Free Uses Left (Limit Reached)"
                : `${usage.usesLeft} / 10 Free Uses Left`}
            </span>
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold">
                {usage.limitReached
                  ? "Free Plan Limit Reached"
                  : "Upgrade to Spadas Pro"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {usage.limitReached
                  ? "You've used all 10 free AI listing generations. Upgrade to Pro for unlimited AI listings, sourcing checks, and profit analytics."
                  : "Unlock unlimited AI generations, barcode scans, and priority market pricing."}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 font-medium text-foreground">
                ✓ Unlimited AI Listing Generations
              </div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                ✓ Unlimited Sourcing Assistant Checks
              </div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                ✓ Multi-Marketplace Title & SEO Copywriting
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
              >
                {upgrading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>Upgrade to Pro — Unlimited Access</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground py-1"
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
