"use client";

import React, { useState, useEffect } from "react";
import {
  Check,
  ShieldCheck,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Calendar,
  Lock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { BILLING_CONFIG } from "@/lib/billing-config";
import {
  purchaseGooglePlaySubscription,
  queryGooglePlaySubscriptionPlans,
  restoreGooglePlayPurchases,
  PlayProductDetail,
} from "@/lib/google-play-billing";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { trackFunnel } from "@/lib/funnel-analytics";

export interface SubscriptionPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  fromOnboarding?: boolean;
  currentScans?: number;
  totalProfit?: number;
  scannedItemsCount?: number;
  bestFind?: {
    name: string;
    profit: number;
    resalePrice?: number;
  } | null;
  onTryDemo?: () => void;
}

export function SubscriptionPaywallModal({
  isOpen,
  onClose,
  onSuccess,
  fromOnboarding = false,
  currentScans,
  totalProfit,
  scannedItemsCount,
  bestFind,
}: SubscriptionPaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("weekly");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAppStoreClient, setIsAppStoreClient] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const [weeklyPlan, setWeeklyPlan] = useState<PlayProductDetail>({
    itemId: BILLING_CONFIG.skus.weeklyTrial,
    title: BILLING_CONFIG.plans.weekly.title,
    price: BILLING_CONFIG.plans.weekly.priceFormatted,
    currency: "USD",
    period: "weekly",
    trialDays: BILLING_CONFIG.plans.weekly.trialDays,
  });

  const [monthlyPlan, setMonthlyPlan] = useState<PlayProductDetail>({
    itemId: BILLING_CONFIG.skus.monthly,
    title: BILLING_CONFIG.plans.monthly.title,
    price: BILLING_CONFIG.plans.monthly.priceFormatted,
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

  const [accumulatedProfit, setAccumulatedProfit] = useState<number>(totalProfit || 0);
  const [accumulatedCount, setAccumulatedCount] = useState<number>(scannedItemsCount || currentScans || 0);
  const [detectedBestFind, setDetectedBestFind] = useState<{
    name: string;
    profit: number;
    resalePrice?: number;
  } | null>(bestFind || null);

  useEffect(() => {
    if (typeof totalProfit === "number" && totalProfit > 0) {
      setAccumulatedProfit(totalProfit);
      setAccumulatedCount(scannedItemsCount || currentScans || 0);
    }
    if (bestFind) {
      setDetectedBestFind(bestFind);
      return;
    }
    if (typeof window !== "undefined" && isOpen) {
      // 1. Try local cache for immediate render
      try {
        const activeUserId = localStorage.getItem("spadas_active_user_id");
        const key = activeUserId ? `spadas_hits_${activeUserId}` : "spadas_hits_guest";
        const raw = localStorage.getItem(key);
        if (raw) {
          const hits = JSON.parse(raw);
          if (Array.isArray(hits) && hits.length > 0) {
            const sum = hits.reduce(
              (acc: number, h: any) => acc + Math.max(0, Number(h.trueNetProfit ?? h.estimatedProfit ?? 0)),
              0
            );
            if (sum > 0 && !totalProfit) {
              setAccumulatedProfit(sum);
              setAccumulatedCount(hits.length);
            }
            const top =
              hits
                .filter((h: any) => (h.estimatedProfit || h.trueNetProfit || 0) > 0)
                .sort(
                  (a: any, b: any) =>
                    (b.estimatedProfit || b.trueNetProfit || 0) -
                    (a.estimatedProfit || a.trueNetProfit || 0)
                )[0] || hits[0];
            if (top) {
              setDetectedBestFind({
                name: top.name || top.title || top.productName || "Scanned Item",
                profit: Number(top.trueNetProfit ?? top.estimatedProfit) || 0,
                resalePrice: Number(top.estimatedValue || top.suggestedPriceMax) || 0,
              });
            }
          }
        }
      } catch {}

      // 2. Server-side authoritative verification (keyed by auth user id per AGENTS.md)
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user?.id) return;
        try {
          const { data: userListings } = await supabase
            .from("listings")
            .select("title, product, price, cost")
            .eq("user_id", session.user.id)
            .limit(50);

          if (userListings && userListings.length > 0) {
            const serverSum = userListings.reduce((sum: number, item: any) => {
              const p = Number(item.price || 0);
              const c = Number(item.cost || 0);
              return sum + Math.max(0, p - c);
            }, 0);
            if (serverSum > 0) {
              setAccumulatedProfit((prev) => (prev > 0 ? prev : serverSum));
              setAccumulatedCount((prev) => (prev > 0 ? prev : userListings.length));
            }
          }
        } catch {}
      });
    }
  }, [bestFind, isOpen, totalProfit, scannedItemsCount, currentScans]);

  useEffect(() => {
    if (isOpen) {
      trackFunnel("paywall_viewed", { source: fromOnboarding ? "onboarding" : "in_app" });
    }
  }, [isOpen, fromOnboarding]);

  if (!isOpen || isOwner) return null;

  const trialDays = weeklyPlan.trialDays ?? BILLING_CONFIG.plans.weekly.trialDays;
  const isPlayBilling = isAppStoreClient && isAndroid;

  const handleSelectPlan = (plan: "weekly" | "monthly") => {
    triggerTactileHaptic("selection");
    setSelectedPlan(plan);
  };

  const handleDismiss = () => {
    trackFunnel("paywall_dismissed", { plan: selectedPlan });
    onClose();
  };

  const handlePurchase = async () => {
    triggerTactileHaptic("medium");
    trackFunnel("trial_cta_tapped", { plan: selectedPlan });
    setIsLoading(true);

    try {
      // Subscriptions are linked to the server-side auth user id. Guests must sign in first,
      // so send them to login and bring them back here instead of showing a dead-end error.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        trackFunnel("signin_required", { from: "paywall" });
        toast.info("Sign in to start your free trial. It takes a few seconds.");
        const returnPath = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(returnPath)}`);
        return;
      }

      const res = await purchaseGooglePlaySubscription({
        planId: selectedPlan,
      });

      if (res.active) {
        trackFunnel("purchase_success", { plan: selectedPlan });
        toast.success(
          selectedPlan === "weekly"
            ? `🎉 ${trialDays}-Day Free Trial activated! Unlimited scanning unlocked.`
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md max-h-[94vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0A0D16] p-5 sm:p-6 text-zinc-100 space-y-4 shadow-2xl custom-scrollbar">
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Section */}
        <div className="space-y-1.5 pt-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-emerald-500/15 border border-cyan-500/30 text-[11px] font-mono font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>{trialDays}-DAY FREE TRIAL · $0 TODAY</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {accumulatedProfit > 0
              ? `Keep Your $${Math.round(accumulatedProfit)} Profit Rolling`
              : detectedBestFind && (currentScans || 0) >= BILLING_CONFIG.freeScanAllowance
              ? "Keep Your Profit Rolling"
              : `Try ${trialDays} Days Free`}
          </h2>

          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            {accumulatedProfit > 0
              ? `You've uncovered $${accumulatedProfit.toFixed(2)} in potential profit across your scans. Start your ${trialDays}-day free trial ($0 today) to publish to eBay and unlock unlimited scanning.`
              : detectedBestFind && (currentScans || 0) >= BILLING_CONFIG.freeScanAllowance
              ? `You've used your ${BILLING_CONFIG.freeScanAllowance} free test scans. Start your trial for unlimited optical comps and 1-tap eBay listing.`
              : "Experience unlimited AR optical scans, verified eBay sold comps, and instant profit calculations. Cancel anytime."}
          </p>
        </div>

        {/* Grounded Value Accounting Card */}
        {accumulatedProfit > 0 ? (
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 via-zinc-900/90 to-cyan-950/50 border border-emerald-500/40 space-y-2.5 shadow-xl text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Profit Found in Your Scans</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {accumulatedCount > 0 ? `${accumulatedCount} items found` : "Grounded Value"}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div>
                <span className="text-3xl font-black text-emerald-300 font-mono tracking-tight">
                  +${accumulatedProfit.toFixed(2)}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  Estimated profit unlocked across your scans
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-cyan-300 block">
                  $0.00 Today
                </span>
                <span className="text-[10px] text-zinc-400 block font-mono">
                  {trialDays}-Day Free Trial
                </span>
              </div>
            </div>

            {detectedBestFind && (
              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-zinc-300">
                <span className="truncate max-w-[200px]">Top: <strong>{detectedBestFind.name}</strong></span>
                <span className="font-mono text-emerald-400 font-bold shrink-0">
                  +${detectedBestFind.profit.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ) : detectedBestFind ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/80 to-cyan-950/30 border border-emerald-500/30 flex items-center justify-between gap-3 text-left shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Your Top Find Saved</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {detectedBestFind.name}
              </p>
              {typeof detectedBestFind.resalePrice === "number" && detectedBestFind.resalePrice > 0 && (
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  Est. Resale: ${detectedBestFind.resalePrice.toFixed(2)}
                </p>
              )}
            </div>
            {typeof detectedBestFind.profit === "number" && detectedBestFind.profit > 0 && (
              <div className="text-right font-mono shrink-0 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="text-[9px] uppercase text-zinc-400 block font-semibold">Net Profit</span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                  +${detectedBestFind.profit.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Key Feature Bullets */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <div className="flex items-start gap-2.5 text-xs text-zinc-200">
            <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span><strong>Unlimited instant optical comps</strong> (verified sold data)</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-zinc-200">
            <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span><strong>Real-time eBay profit ledger</strong> &amp; postage calculations</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-zinc-200">
            <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span><strong>Full market depth</strong> with real-time velocity signals</span>
          </div>
        </div>

        {/* Trial Timeline for Weekly Option */}
        {selectedPlan === "weekly" && (
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>How your trial works</span>
            </div>
            <div className="relative pl-5 space-y-2 border-l border-cyan-500/30 text-xs">
              <div className="relative">
                <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-[#0A0D16]" />
                <div className="font-semibold text-zinc-100">Today: Instant Unlimited Access</div>
                <div className="text-[11px] text-zinc-400">Unlock full optical scanning and comps. $0 due today.</div>
              </div>
              <div className="relative">
                <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400/60 ring-4 ring-[#0A0D16]" />
                <div className="font-semibold text-zinc-100">Day {trialDays - 1}: Trial Reminder</div>
                <div className="text-[11px] text-zinc-400">Cancel easily in Google Play Subscriptions before day {trialDays}.</div>
              </div>
              <div className="relative">
                <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-[#0A0D16]" />
                <div className="font-semibold text-zinc-100">Day {trialDays}: Renews at {weeklyPlan.price}/week</div>
                <div className="text-[11px] text-zinc-400">Continuous Pro access unless cancelled before trial ends.</div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Plan Selection Cards */}
        <div className="space-y-2">
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
                    <span className="text-sm font-bold text-white">{weeklyPlan.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      {BILLING_CONFIG.plans.weekly.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 pt-0.5">
                    {trialDays}-day free trial, then {weeklyPlan.price}/week
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-white tabular-nums">{weeklyPlan.price}</span>
                <span className="text-[10px] text-zinc-500 block font-mono">/week</span>
              </div>
            </div>
          </div>

          {/* Plan 2: Monthly Plan */}
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
                    <span className="text-sm font-bold text-white">{monthlyPlan.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      {BILLING_CONFIG.plans.monthly.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 pt-0.5">
                    {monthlyPlan.price}/month · billed monthly
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
                <Lock className="w-4 h-4 text-slate-950" />
                <span>
                  {selectedPlan === "weekly"
                    ? `Start ${trialDays}-Day Free Trial`
                    : "Subscribe to Spadas Pro"}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>

          {/* Dismiss / Continue Free for Onboarding */}
          {fromOnboarding && (
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition text-center cursor-pointer"
            >
              Maybe later (Continue with {BILLING_CONFIG.freeScanAllowance} free scans)
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
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPaywallModal;
