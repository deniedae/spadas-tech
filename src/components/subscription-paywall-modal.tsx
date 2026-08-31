"use client";

import React, { useState } from "react";
import { Check, Sparkles, Zap, ShieldCheck, Crown, X, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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

const PLANS: PlanTier[] = [
  {
    id: "starter",
    name: "Spadas Pro Reseller",
    badge: "UNLIMITED ACCESS",
    price: "$10 AUD",
    period: "per month",
    popular: true,
    description: "Unlimited 60FPS AR camera scanning, live eBay sold comps, and 1-click cross-listing.",
    features: [
      "⚡ Unlimited 60FPS AR Camera Lens Scanner",
      "📊 Live Australia & Global eBay 30-Day Sold Comps",
      "🛍️ 1-Click Multi-Platform Cross-Lister (eBay, FB, Depop)",
      "🔮 Future Grail 30-Day Social Trend & Price Surge Alerts",
      "📦 Unlimited History Feed & Thrifting Haul Calculator",
      "🔊 Motion-Lock Audio Chimes & Voice Commands",
    ],
    ctaText: "Get Spadas Pro ($10 AUD/mo)",
    color: "border-cyan-400 bg-gradient-to-b from-slate-900 via-slate-900 to-cyan-950/40 shadow-[0_0_40px_rgba(6,182,212,0.3)]",
  },
];

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

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isWebView = /wv|Android.*Version\/[0-9.]+|Silk-Accelerated/i.test(navigator.userAgent);
      setIsAppStoreClient(isStandalone || isWebView);
    }
  }, []);

  if (!isOpen) return null;

  const handleCheckout = async (plan: PlanTier) => {
    if (plan.id === "free" || isAppStoreClient) {
      onClose();
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        // Redirect to real Stripe Checkout — the only valid path to Pro
        window.location.href = data.url;
        return; // Don't clear loadingPlan — we're navigating away
      }

      // Surface the actual server error — never silently bypass the paywall
      const message = data?.message || "Checkout unavailable. Please try again.";
      toast.error(`Checkout failed: ${message}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error. Please check your connection.";
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
            You have used <strong className="text-cyan-400 font-black">{currentScans}/15 Free Beta Scans</strong> this month. Upgrade to Pro for unlimited AR scanning and 1-click cross-listing.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          {PLANS.map((plan) => (
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

                <div className="flex items-baseline gap-1 border-b border-slate-800 pb-4">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs font-bold text-slate-400">/ {plan.period}</span>
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
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{isAppStoreClient ? "Continue with Spadas Access" : plan.ctaText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
