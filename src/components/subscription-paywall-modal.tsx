"use client";

import React, { useState, useEffect } from "react";
import {
  Check,
  Zap,
  ShieldCheck,
  Crown,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Layers,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import {
  purchaseGooglePlaySubscription,
  queryGooglePlaySubscriptionPlans,
  restoreGooglePlayPurchases,
  isMockProActive,
  setMockProActive,
  mockGooglePlayPurchase,
  isAndroidAppEnvironment,
  isDigitalGoodsSupported,
  PlayProductDetail,
} from "@/lib/google-play-billing";
import { triggerTactileHaptic } from "@/lib/android-bridge";

export interface SubscriptionPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  fromOnboarding?: boolean;
  currentScans?: number;
  onTryDemo?: () => void;
}

export function SubscriptionPaywallModal({
  isOpen,
  onClose,
  onSuccess,
  fromOnboarding = false,
  currentScans,
  onTryDemo,
}: SubscriptionPaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("weekly");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAppStoreClient, setIsAppStoreClient] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);

  const [weeklyPlan, setWeeklyPlan] = useState<PlayProductDetail>({
    itemId: "spadas_pro_weekly",
    title: "Weekly Plan",
    price: "$3.99",
    currency: "USD",
    period: "weekly",
    trialDays: 3,
  });

  const [monthlyPlan, setMonthlyPlan] = useState<PlayProductDetail>({
    itemId: "spadas_pro_monthly",
    title: "Monthly Plan",
    price: "$9.99",
    currency: "USD",
    period: "monthly",
  });

  // Query live pricing from Google Play on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isWebView = /wv|Android.*Version\/[0-9.]+|Silk-Accelerated/i.test(navigator.userAgent);
      setIsAppStoreClient(isStandalone || isWebView);
      setIsAndroid(/Android/i.test(navigator.userAgent));
      setIsMockMode(isMockProActive());

      // Query Play Store products
      void queryGooglePlaySubscriptionPlans().then((plans) => {
        if (plans.weekly) setWeeklyPlan(plans.weekly);
        if (plans.monthly) setMonthlyPlan(plans.monthly);
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isOwnerEmail(session.user.email)) {
        setIsOwner(true);
      }
    });
  }, []);

  if (!isOpen || isOwner) return null;

  const handleSelectPlan = (plan: "weekly" | "monthly") => {
    triggerTactileHaptic("selection");
    setSelectedPlan(plan);
  };

  const handlePurchase = async () => {
    triggerTactileHaptic("medium");
    setIsLoading(true);

    try {
      if (isMockMode) {
        const res = await mockGooglePlayPurchase(selectedPlan);
        if (res.active) {
          toast.success("✅ Free Trial Unlocked (Mock Mode)!");
          if (onSuccess) onSuccess();
          onClose();
          return;
        }
      }

      const res = await purchaseGooglePlaySubscription({
        planId: selectedPlan,
        mock: isMockMode,
      });

      if (res.active) {
        toast.success(
          selectedPlan === "weekly"
            ? "🎉 3-Day Free Trial activated! Unlimited scanning unlocked."
            : "🎉 Welcome to Spadas Pro! Unlimited scanning unlocked."
        );
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      if (res.canceled && res.dismissedByUser) {
        return;
      }

      if (res.error) {
        toast.error(res.error, { duration: 6000 });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to initiate subscription.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    triggerTactileHaptic("light");
    setIsRestoring(true);
    try {
      const result = await restoreGooglePlayPurchases();
      if (result.active) {
        toast.success(result.message);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.info(result.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleMockBypass = () => {
    const next = !isMockMode;
    setIsMockMode(next);
    setMockProActive(next, selectedPlan);
    triggerTactileHaptic("tap");
    toast.info(next ? "Mock Mode Enabled: purchases bypass live Google Play API" : "Mock Mode Disabled");
  };

  const isPlayBilling = isAppStoreClient && isAndroid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md max-h-[94vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0A0D16] p-5 sm:p-6 text-zinc-100 space-y-5 shadow-2xl custom-scrollbar">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Section */}
        <div className="space-y-2 pt-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-emerald-500/15 border border-cyan-500/30 text-[11px] font-mono font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>3-DAY FREE TRIAL · $0 TODAY</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Try 3 Days Free ($0 Today)
          </h2>

          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Experience unlimited 60FPS AR scans, live eBay sold comps, and profit calculations with zero risk. Cancel anytime.
          </p>
        </div>

        {/* Key Feature Bullets */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
          <div className="flex items-start gap-2.5 text-xs text-zinc-200">
            <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span><strong>Unlimited instant optical comps</strong> (30-day verified sold data)</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-zinc-200">
            <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span><strong>Real-time eBay profit ledger</strong> &amp; automatic postage calculations</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-zinc-200">
            <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span><strong>Full active and sold listing market depth</strong> with velocity signals</span>
          </div>
        </div>

        {/* Subscription Plan Selection Cards */}
        <div className="space-y-2.5">
          {/* Plan 1: Weekly Plan (Free Trial) */}
          <div
            onClick={() => handleSelectPlan("weekly")}
            className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedPlan === "weekly"
                ? "bg-zinc-900/90 border-cyan-500 ring-1 ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedPlan === "weekly"
                      ? "border-cyan-400 bg-cyan-500 text-black"
                      : "border-zinc-600 bg-zinc-900"
                  }`}
                >
                  {selectedPlan === "weekly" && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Weekly Plan</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      3-DAY FREE TRIAL
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 pt-0.5">
                    3-day free trial, then {weeklyPlan.price}/week
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-white tabular-nums">{weeklyPlan.price}</span>
                <span className="text-[10px] text-zinc-500 block font-mono">/week</span>
              </div>
            </div>
          </div>

          {/* Plan 2: Monthly Plan (Best Value) */}
          <div
            onClick={() => handleSelectPlan("monthly")}
            className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedPlan === "monthly"
                ? "bg-zinc-900/90 border-emerald-500 ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedPlan === "monthly"
                      ? "border-emerald-400 bg-emerald-500 text-black"
                      : "border-zinc-600 bg-zinc-900"
                  }`}
                >
                  {selectedPlan === "monthly" && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Monthly Plan</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      BEST VALUE · SAVE 45%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 pt-0.5">
                    {monthlyPlan.price}/month (Save $6/mo vs weekly)
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-white tabular-nums">{monthlyPlan.price}</span>
                <span className="text-[10px] text-zinc-500 block font-mono">/month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Dynamic CTA Button */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-extrabold text-sm shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
            ) : (
              <>
                <span>{selectedPlan === "weekly" ? "Start 3-Day Free Trial" : "Subscribe Now"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Dismiss / Continue Free for Onboarding */}
          {fromOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition text-center cursor-pointer"
            >
              Maybe later (Continue with 3 free daily scans)
            </button>
          )}
        </div>

        {/* Footer Guarantee & Utility Links */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2 text-center text-[11px] text-zinc-400">
          <div className="flex items-center justify-center gap-1.5 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {isPlayBilling
                ? "Billed via Google Play · Cancel anytime in Play Store Subscriptions"
                : "Cancel anytime with 1 click · Zero commitment guarantee"}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] font-medium text-zinc-400">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3 h-3 ${isRestoring ? "animate-spin" : ""}`} />
              <span>{isRestoring ? "Restoring..." : "Restore Purchases"}</span>
            </button>
            <span>·</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              Terms of Service
            </a>
            <span>·</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              Privacy Policy
            </a>
          </div>

          {/* Mock / Dev Bypass Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={toggleMockBypass}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                isMockMode
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
              title="Toggle Mock Billing Bypass for development testing without live Google Play API"
            >
              <Bug className="w-3 h-3" />
              <span>{isMockMode ? "Mock Mode ACTIVE (Tap to disable)" : "Dev: Test Mock Billing"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPaywallModal;
