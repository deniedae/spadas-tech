"use client";

import React, { useState, useEffect } from "react";
import { Check, ShieldCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

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
    "10 camera scans per day",
    "eBay 30-day sold comps (AU & US)",
    "Fee & satchel postage calculator",
    "Barcode and optical image recognition",
    "Basic saved items list",
    "No credit card required",
  ];

  const proPerks = [
    "Unlimited camera scanning",
    "Low turnover & margin trap alerts",
    "Verified eBay sold comps with outlier filtering",
    "Full fee math: marketplace fees, payment processing & postage",
    "Sell-through rate (STR%) & sales velocity",
    "Haul inventory vault with CSV tax export",
    "Billed via official Google Play In-App Billing",
  ];

  return (
    <section id="pricing" className="my-16 scroll-mt-20">
      <div className="text-center space-y-2.5 max-w-xl mx-auto mb-10 px-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
          <span>PRICING</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Straightforward Reseller Pricing
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
          Start for free to evaluate optical comps, or upgrade to Pro for unlimited scanning and direct marketplace publishing.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 grid md:grid-cols-2 gap-5 items-stretch">
        {/* Free Starter Tier */}
        <div className="p-5 sm:p-6 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-white">Free Starter</h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Casual
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
                  $0
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  / Free
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Test optical identification and sold comps during daily sourcing runs.
              </p>
            </div>

            <Link
              href="/lens"
              className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs border border-zinc-700 transition cursor-pointer"
            >
              <span>Launch Free Scanner</span>
            </Link>

            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                Included in Free:
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

        {/* Pro Plan Card */}
        <div className="p-5 sm:p-6 rounded-lg border border-zinc-700 bg-zinc-900 flex flex-col justify-between space-y-5 relative">
          <div className="absolute -top-2.5 right-4 bg-zinc-800 text-zinc-200 border border-zinc-700 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md uppercase tracking-wider">
            Google Play
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-white">Spadas Pro</h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  Unlimited
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
                  {isUsMarket ? "$6.99 USD" : "$10 AUD"}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  / month
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Unlimited camera scanning, direct eBay publishing, and net profit ledger.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPaywallOpen(true)}
              className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
            >
              <span>Upgrade to Pro ({isUsMarket ? "$6.99/mo" : "$10 AUD/mo"})</span>
            </button>

            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-zinc-400" />
                <span>Everything in Free, plus:</span>
              </span>
              {proPerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 text-center">
            <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
              <span>Billed via Google Play Subscriptions · Cancel anytime</span>
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Billing Note */}
      <div className="mt-8 text-center max-w-xl mx-auto px-4 space-y-1">
        <p className="text-xs text-zinc-400 font-medium">
          Integrated with Google Play In-App Billing for Android devices.
        </p>
        <p className="text-[11px] text-zinc-500 font-mono">
          Package ID: com.spadas.ai · SKU: spadas_pro_monthly
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
