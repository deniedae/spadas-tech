import React from "react";
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPricing() {
  const betaPerks = [
    "Unlimited camera scanner sessions & object appraisals",
    "Real-time completed eBay sold comps & price ranges",
    "AI-generated 80-char titles, condition notes & descriptions",
    "Multi-marketplace formatting (eBay, Depop, Poshmark, FB Marketplace)",
    "Rapid Sourcing Mode with haul ledger & batch management",
    "Instant CSV lot manifest export for spreadsheet tracking",
    "1-Tap direct-to-eBay Seller Hub draft publishing",
    "Offline catalog appraisal fallback when store reception drops",
  ];

  return (
    <section id="pricing" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-10 px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold text-emerald-400">
          <Sparkles className="h-3.5 w-3.5" />
          Public Beta Access
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Simple, transparent pricing
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Spadas Lens is currently free to all resellers while in public beta. No credit card required.
        </p>
      </div>

      <div className="max-w-xl mx-auto px-4">
        {/* Free Beta Tier Card */}
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 via-[#0A0D15]/90 to-[#0A0D15]/90 backdrop-blur-xl shadow-2xl relative overflow-hidden space-y-6">
          {/* Top Pill */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-cyan-300 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
              Active Beta Access
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Instant Free Access
            </span>
          </div>

          {/* Pricing Header */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
                $0
              </span>
              <span className="text-sm text-zinc-400 font-mono">
                / free in beta
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300">
              Full access to all live camera scanning, comp discovery, and AI listing generation features.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="space-y-2">
            <Link
              href="/lens"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-black text-sm transition active:scale-95 shadow-lg shadow-white/10"
            >
              <span>Start free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-[11px] font-mono text-zinc-500 text-center">
              Free while in beta — no card required
            </p>
          </div>

          {/* Features Included */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
              What&apos;s included in the beta:
            </span>
            <div className="space-y-2.5">
              {betaPerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Note on Paid Plans Coming Soon */}
        <div className="mt-6 text-center space-y-1.5 px-4">
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-200">Looking ahead:</strong> Paid plans with automated background multi-channel cross-listing and warehouse inventory sync are coming soon.
          </p>
          <p className="text-[11px] font-mono text-zinc-500">
            All beta accounts will receive grandfathered early-access benefits when paid plans launch.
          </p>
        </div>
      </div>
    </section>
  );
}
