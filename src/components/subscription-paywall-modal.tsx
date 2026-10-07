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
      name: "Spadas Pro",
      badge: "UNLIMITED ACCESS",
      price: isUsMarket ? "$6.99 USD" : "$10 AUD",
      period: "month",
      popular: true,
      description: isUsMarket
        ? "Unlimited optical camera scanning, live eBay US sold comps, and direct marketplace publishing."
        : "Unlimited optical camera scanning, live eBay Australia sold comps, and direct marketplace publishing.",
      features: isUsMarket
        ? [
            "Unlimited optical camera scanning",
            "Real-time eBay US 30-day verified sold comps",
            "Net profit calculator with auto-deducted USPS postage & seller fees",
            "Low turnover & margin trap alerts",
            "1-tap marketplace publishing",
            "Unlimited sourcing vault & CSV tax export",
            "Hallmark & care tag optical inspection",
          ]
        : [
            "Unlimited optical camera scanning",
            "Real-time eBay Australia 30-day verified sold comps",
            "Net profit calculator with auto-deducted AusPost satchels & 13.4% fees",
            "Low turnover & margin trap alerts",
            "1-tap marketplace publishing",
            "Unlimited sourcing vault & CSV tax export",
            "Hallmark & care tag optical inspection",
          ],
      ctaText: isUsMarket ? "Upgrade to Pro ($6.99 USD/mo)" : "Upgrade to Pro ($10 AUD/mo)",
      color: "border-zinc-800 bg-zinc-900",
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
        toast.success("Welcome to Spadas Pro. Unlimited scanning unlocked.");
        onClose();
        window.location.reload();
        return;
      }
      if (res.canceled && res.dismissedByUser) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 space-y-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-850 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Title */}
        <div className="space-y-2 pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-mono text-zinc-300">
            <span>PRO PLAN</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Upgrade to Spadas Pro
          </h2>
          <p className="text-xs text-zinc-400">
            You have reached the limit of 10 free daily scans. Upgrade for unlimited optical scanning, verified sold comps, and full fee calculations.
          </p>
        </div>

        {/* Pricing Card */}
        <div>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-5"
            >
              <div>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tabular-nums text-white">{plan.price}</span>
                    <span className="text-xs font-mono text-zinc-400">/ {plan.period}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                    Direct billing
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">{plan.description}</p>
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2.5">
                  Included features
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout(plan)}
                disabled={loadingPlan !== null}
                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <span>{isAndroid ? `Subscribe with Google Play (${plan.price}/mo)` : plan.ctaText}</span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {isAndroid
                    ? "Billed via Google Play · Cancel anytime in Play Store"
                    : "Cancel anytime with 1 click"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
