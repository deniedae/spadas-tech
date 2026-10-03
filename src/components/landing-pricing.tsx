"use client";

import React from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LandingPricing() {
  const launchPerks = [
    "Unlimited AR camera scanner sessions",
    "Live Australia & Global eBay 30-day sold comps",
    "1-Click multi-platform cross-lister (eBay AU, Depop AU, Gumtree)",
    "1-Tap direct-to-eBay Seller Hub draft publishing",
    "Price surge & trend profit comps",
    "Unlimited history feed & haul profit calculator",
    "Priority AI listing speed with zero cooldowns",
    "Offline catalog appraisal fallback",
  ];

  return (
    <section id="pricing" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Google Play Special · Early Adopter Launch</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          100% Free Launch Access
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          All professional camera scanning, live sold comps, and 1-tap eBay listing tools unlocked with zero paywalls.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Pro Plan Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-emerald-500/40 bg-[#0A0D15]/90 relative flex flex-col justify-between space-y-6 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">Full Access Tier</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Unlimited Everything
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  $0
                </span>
                <span className="text-sm text-emerald-400 font-mono font-semibold">
                  / Free During Launch
                </span>
              </div>
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                Enjoy full unlimited AI appraisals and 1-click eBay Seller Hub sync on any device.
              </p>
            </div>

            <Link
              href="/lens"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>Launch Camera Scanner</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
              <span className="text-xs font-semibold text-zinc-400 block">
                Everything unlocked for free:
              </span>
              {launchPerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Note */}
      <div className="mt-8 text-center max-w-xl mx-auto px-4">
        <p className="text-xs text-zinc-500">
          Powered by live eBay marketplace data and Google Gemini multimodal vision.
        </p>
      </div>
    </section>
  );
}
