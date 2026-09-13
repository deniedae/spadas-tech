import React from "react";
import { Check, Sparkles, ArrowRight, Zap, Crown } from "lucide-react";
import Link from "next/link";

export default function LandingPricing() {
  const freePerks = [
    "10 free camera scans & appraisals every day",
    "Real-time completed eBay sold comps & price ranges",
    "AI-generated 80-char titles, condition notes & descriptions",
    "Multi-marketplace formatting (eBay, Depop, Poshmark, FB)",
    "Rapid Sourcing Mode with haul ledger & batch management",
    "Instant CSV lot manifest export for spreadsheet tracking",
    "Offline catalog appraisal fallback when cell reception drops",
  ];

  const proPerks = [
    "Unlimited 60FPS AR camera scanner sessions",
    "Live Australia & Global eBay 30-day sold comps & velocity",
    "1-Click Multi-Platform Cross-Lister (eBay, FB, Depop)",
    "1-Tap direct-to-eBay Seller Hub draft publishing",
    "Future Grail 30-day social trend & price surge alerts",
    "Unlimited History Feed & thrifting haul profit calculator",
    "Priority AI listing generation speed with zero cooldowns",
  ];

  return (
    <section id="pricing" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
          Pricing Plans
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Simple, transparent pricing
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Start free with 10 scans every day. Upgrade to Pro when you&apos;re ready to scale without limits.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Free Plan Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.1] bg-[#0A0D15]/90 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-zinc-300 px-3 py-1 rounded-full bg-zinc-800/80 border border-white/[0.08]">
                Daily Free Access
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                No Card Required
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Free</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
                  $0
                </span>
                <span className="text-sm text-zinc-400 font-mono">
                  / month
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                10 free scans daily. Perfect for weekend thrift sourcing and quick market comp checks.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/lens"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition active:scale-95 border border-white/10 shadow-sm"
              >
                <span>Start free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-[11px] font-mono text-zinc-500 text-center mt-2">
                10 free scans every day &mdash; no card needed
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.08] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                What&apos;s included:
              </span>
              <div className="space-y-2.5">
                {freePerks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <div className="h-4 w-4 rounded-full bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pro Reseller Plan Card */}
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-cyan-400 bg-gradient-to-b from-[#091528] via-[#0A0D15]/95 to-[#0A0D15]/95 backdrop-blur-xl shadow-[0_0_50px_rgba(6,182,212,0.2)] relative flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-cyan-300 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center gap-1.5">
                <Crown className="h-3 w-3 text-cyan-400" />
                Unlimited Access
              </span>
              <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1">
                <Zap className="h-3 w-3 text-cyan-400 fill-cyan-400" />
                Most Popular
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Spadas Pro Reseller
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
                  $10 AUD
                </span>
                <span className="text-sm text-zinc-400 font-mono">
                  / month
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                For active flippers and power resellers moving 20+ items a week across multiple channels.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/lens"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-zinc-950 font-black text-sm transition active:scale-95 shadow-lg shadow-cyan-500/25"
              >
                <span>Get Spadas Pro</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-[11px] font-mono text-cyan-400/80 text-center mt-2">
                Instant activation &middot; Cancel anytime
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.08] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 block">
                Everything in Free, plus:
              </span>
              <div className="space-y-2.5">
                {proPerks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-200">
                    <div className="h-4 w-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Note */}
      <div className="mt-8 text-center max-w-xl mx-auto px-4">
        <p className="text-xs text-zinc-400">
          Powered by live eBay marketplace data and Google Gemini 1.5 multimodal vision. Secure billing via Stripe.
        </p>
      </div>
    </section>
  );
}
