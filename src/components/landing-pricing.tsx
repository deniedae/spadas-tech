"use client";

import React, { useState, useEffect } from "react";
import { Check, ArrowRight, Sparkles, Zap, ShieldCheck, Crown, ShoppingBag } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { purchaseGooglePlaySubscription, GOOGLE_PLAY_STORE_URL } from "@/lib/google-play-billing";
import { toast } from "sonner";

const SubscriptionPaywallModal = dynamic(
  () => import("@/components/subscription-paywall-modal"),
  { ssr: false }
);

export default function LandingPricing() {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isUsMarket, setIsUsMarket] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCurr = localStorage.getItem("spadas_selected_currency");
      const isUs =
        storedCurr === "USD" ||
        (!storedCurr &&
          (navigator.language === "en-US" ||
            Intl.DateTimeFormat().resolvedOptions().timeZone.includes("America/") ||
            Intl.DateTimeFormat().resolvedOptions().timeZone.includes("US/")));
      setIsUsMarket(Boolean(isUs));
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  const freePerks = [
    "10 instant camera scans per day",
    "Live eBay 30-day sold comps (AU & US)",
    "Instant P&L math (eBay fees & postage calculator)",
    "Barcode & optical image recognition",
    "Basic haul saved items tracker",
    "No credit card required to start",
  ];

  const proPerks = [
    "Unlimited 60FPS AR camera scans powered by xAI Grok & Multi-Model AI",
    "Anti-Thrift Trap Guard (Auto-detects high-shipping traps & zero-margin items)",
    "Real-time eBay sold comps (AU & US) with exact timestamps & outlier filtering",
    "Full accounting P&L: 13.4% fees, 2.6% processing, COGS & exact satchel shipping",
    "Sell-Through Rate (STR%) & market velocity liquidity alerts",
    "Unlimited Sourcing Haul Vault & inventory portfolio CSV tax export",
    "Save $20+/mo compared to generic $30 USD reseller tools",
    "Official Google Play In-App Billing (Cancel anytime in Play Store)",
  ];

  return (
    <section id="pricing" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Flexible Reseller Plans · Google Play Integrated</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Simple, High-ROI Pricing
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
          Start for free to test the scanner in the thrift aisles, or unlock unlimited scanning with the Google Pro plan. One good flip pays for the entire year.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-6 items-stretch">
        {/* Free Starter Tier */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 relative flex flex-col justify-between space-y-6 backdrop-blur-md">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">Free Starter</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Daily Casual
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  $0
                </span>
                <span className="text-sm text-zinc-400 font-mono">
                  / Free Forever
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Test the 0.5s optical recognition and live sold comps on your daily op-shop runs.
              </p>
            </div>

            <Link
              href="/lens"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold text-sm transition active:scale-95 cursor-pointer border border-white/10"
            >
              <span>Launch Free Scanner</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
              <span className="text-xs font-semibold text-zinc-400 block">
                Included in Free Starter:
              </span>
              {freePerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <Check className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Google Pro Paid Plan Card */}
        <div className="p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-[#0D1520] via-[#0A0E18] to-[#0A0D15] relative flex flex-col justify-between space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.18)]">
          {/* Popular Tag */}
          <div className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
            <Crown className="w-3 h-3" />
            <span>Google Play Pro</span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                  <span>Spadas Pro Reseller</span>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Unlimited Pro
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  {isUsMarket ? "$6.99 USD" : "$10 AUD"}
                </span>
                <span className="text-sm text-emerald-400 font-mono font-semibold">
                  / month
                </span>
              </div>
              <p className="text-xs text-emerald-300/90 mt-2 leading-relaxed">
                Unlimited 60FPS AR camera scans, 1-tap eBay Seller Hub listing, and automatic profit ledger.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPaywallOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-sm transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/30"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Upgrade to Google Pro ({isUsMarket ? "$6.99/mo" : "$10 AUD/mo"})</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
              <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Everything in Free, plus Pro tools:</span>
              </span>
              {proPerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-center">
            <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Billed securely via Google Play Subscriptions • Cancel anytime</span>
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Note */}
      <div className="mt-10 text-center max-w-xl mx-auto px-4 space-y-1">
        <p className="text-xs text-zinc-400 font-medium">
          Backed by official Google Play In-App Billing for Android devices.
        </p>
        <p className="text-[11px] text-zinc-500">
          Package ID: <span className="font-mono text-zinc-400">com.spadas.ai</span> · SKU: <span className="font-mono text-zinc-400">spadas_pro_monthly</span>
        </p>
      </div>

      {/* Embedded Google Play Subscription Modal */}
      {isPaywallOpen && (
        <SubscriptionPaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
        />
      )}
    </section>
  );
}
