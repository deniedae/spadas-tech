"use client";

import React, { useState } from "react";
import { Check, Sparkles, Zap, ShieldCheck, Crown, X, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";

import { purchaseGooglePlaySubscription } from "@/lib/google-play-billing";

export interface PlanTier {
  id: string;
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  ctaText: string;
  color: string;
}

export default function SubscriptionPaywallModal({
  isOpen,
  onClose,
  currentScans = 15,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentScans?: number;
}) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAppStoreClient, setIsAppStoreClient] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const isUsMarket =
    typeof window !== "undefined" &&
    (localStorage.getItem("spadas_selected_currency") === "USD" ||
      (!localStorage.getItem("spadas_selected_currency") &&
        (navigator.language === "en-US" ||
          Intl.DateTimeFormat().resolvedOptions().timeZone.includes("America/") ||
          Intl.DateTimeFormat().resolvedOptions().timeZone.includes("US/"))));

  const plans: PlanTier[] = [
    {
      id: "starter",
      name: "Spadas Pro Reseller",
      badge: "UNLIMITED PRO ACCESS",
      price: isUsMarket ? "$6.99 USD" : "$10 AUD",
      period: "per month",
      popular: true,
      description: isUsMarket
        ? "Unlimited 60FPS AR camera scanning, live eBay US sold comps, and 1-click reseller cross-listing."
        : "Unlimited 60FPS AR camera scanning, live eBay Australia sold comps, and 1-click cross-listing.",
      features: isUsMarket
        ? [
            "Unlimited 60FPS AR Lens Scanner (Powered by xAI Grok & Multi-Model AI)",
            "Anti-Thrift Trap Guard (Warns against high-shipping traps & zero-margin items)",
            "100% Live eBay US 30-Day Real Sold Comps (Zero Hallucinations)",
            "True Net Profit Calculator (USPS parcel postage + fees auto-deducted)",
            "1-Click Multi-Platform Cross-Lister (eBay, Mercari, Poshmark)",
            "Unlimited Sourcing Haul Vault & CSV Tax Export",
            "Microscopic Hallmark & Care Tag Inspection (.925, 14K, RN tags)",
          ]
        : [
            "Unlimited 60FPS AR Lens Scanner (Powered by xAI Grok & Multi-Model AI)",
            "Anti-Thrift Trap Guard (Warns against AusPost shipping traps & penny flips)",
            "100% Live Australia eBay 30-Day Real Sold Comps (Zero Hallucinations)",
            "True Net Profit Calculator (Exact AusPost satchels + 13.4% fees auto-deducted)",
            "1-Click Multi-Platform Cross-Lister (eBay AU, FB Marketplace, Depop)",
            "Unlimited Thrifting Haul Vault & CSV Bookkeeping Ledger",
            "Microscopic Hallmark & Care Tag Inspection (.925, 14K, RN tags)",
          ],
      ctaText: isUsMarket ? "Upgrade to Spadas Pro ($6.99/mo)" : "Upgrade to Spadas Pro ($10 AUD/mo)",
      color: "border-cyan-400 bg-gradient-to-b from-slate-900 via-slate-900 to-cyan-950/40 shadow-[0_0_40px_rgba(6,182,212,0.3)]",
    },
  ];

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isWebView = /wv|Android.*Version\/[0-9.]+|Silk-Accelerated/i.test(navigator.userAgent);
      setIsAppStoreClient(isStandalone || isWebView);
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isOwnerEmail(session.user.email)) {
        setIsOwner(true);
      }
    });
  }, []);

  if (!isOpen || isOwner) return null;

  const handleCheckout = async (plan: PlanTier) => {
    if (plan.id === "free") {
      onClose();
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const res = await purchaseGooglePlaySubscription();
      if (res.active) {
        toast.success("Welcome to Spadas Pro! Unlimited scanning unlocked.");
        onClose();
        window.location.reload();
        return;
      }
      if (res.canceled && res.dismissedByUser) {
        // User explicitly dismissed the Google Play bottom sheet
        return;
      }
      if (res.error) {
        toast.error(res.error);
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to initiate checkout. Please try again.";
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl text-white space-y-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header Title */}
        <div className="text-center space-y-2.5 max-w-md mx-auto pt-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1 text-xs font-black text-cyan-300">
            <Crown className="h-4 w-4 text-amber-400 animate-pulse" />
            SPADAS PRO SUBSCRIPTION
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Unlock Unlimited Reseller Profit
          </h2>
          <p className="text-xs text-slate-300">
            You have reached the limit of <strong className="text-cyan-400 font-black">10 Free Daily Scans</strong>. Upgrade to Spadas Pro for unlimited 60FPS AR scanning, live sold comps, and 1-click cross-listing.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-6 flex flex-col justify-between space-y-6 transition-all duration-200 ${plan.color}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{plan.description}</p>
                </div>

                <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-xs font-bold text-slate-400">/ {plan.period}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      SAVE $20+/MO VS OTHER APPS
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300/90 font-medium flex items-center gap-1.5">
                    <span>💡</span>
                    <span><strong>High ROI Potential:</strong> Sourcing just one $25+ flip can cover your entire monthly access.</span>
                  </p>
                </div>

                <ul className="space-y-2.5 pt-2">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs font-semibold text-slate-200">
                      <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout(plan)}
                disabled={loadingPlan !== null}
                className={`w-full inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-xs font-black transition cursor-pointer active:scale-95 shadow-lg ${
                  plan.popular
                    ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-cyan-500/25"
                    : plan.id === "enterprise"
                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-violet-600/25"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{isAndroid ? "Subscribe with Google Play ($10 AUD/mo)" : plan.ctaText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isAndroid
                    ? "Secured by Google Play Billing · Cancel anytime in Play Store"
                    : "Google Pay & Cards Accepted · Cancel anytime with 1 click"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
