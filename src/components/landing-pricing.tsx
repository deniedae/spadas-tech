"use client";

import React, { useState } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";

export default function LandingPricing() {
  const [loadingPro, setLoadingPro] = useState(false);

  async function handleGetPro() {
    if (loadingPro) return;
    setLoadingPro(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          planId: "starter",
          returnPath: "/lens",
          email: session?.user?.email || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        toast.success("Redirecting to Stripe Checkout...");
        window.location.href = data.url;
        return;
      }

      toast.error(data?.message || "Failed to initiate checkout. Please try again.");
      setLoadingPro(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error. Please try again.";
      toast.error(message);
      setLoadingPro(false);
    }
  }

  const freePerks = [
    "10 camera scans & appraisals every day",
    "Real-time eBay sold comps & price ranges",
    "AI-generated titles, condition notes & descriptions",
    "Multi-marketplace formatting (eBay, Depop, Poshmark, FB)",
    "Rapid Sourcing Mode with haul ledger",
    "CSV lot manifest export",
    "Offline catalog appraisal fallback",
  ];

  const proPerks = [
    "Unlimited AR camera scanner sessions",
    "Live Australia & Global eBay 30-day sold comps",
    "1-Click multi-platform cross-lister",
    "1-Tap direct-to-eBay Seller Hub draft publishing",
    "Price surge & trend alerts",
    "Unlimited history feed & haul profit calculator",
    "Priority AI listing speed with zero cooldowns",
  ];

  return (
    <section id="pricing" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 px-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Simple, transparent pricing
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Start free with 10 scans every day. Upgrade when you&apos;re ready to scale.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Free Plan Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.1] bg-[#0A0D15]/90 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Free</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  $0
                </span>
                <span className="text-sm text-zinc-500">
                  / month
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                10 free scans daily. Great for weekend thrift sourcing and quick comp checks.
              </p>
            </div>

            <Link
              href="/lens"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition active:scale-95 border border-white/10"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
              <span className="text-xs font-semibold text-zinc-400 block">
                What&apos;s included:
              </span>
              {freePerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pro Plan Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-cyan-500/40 bg-[#0A0D15]/90 relative flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">Pro</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Popular
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  $10 AUD
                </span>
                <span className="text-sm text-zinc-500">
                  / month
                </span>
              </div>
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                For active resellers moving 20+ items a week across multiple channels.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGetPro}
              disabled={loadingPro}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm transition active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingPro ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <span>Get Pro</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-xs text-zinc-500 text-center -mt-3">
              Instant activation · Cancel anytime
            </p>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
              <span className="text-xs font-semibold text-zinc-400 block">
                Everything in Free, plus:
              </span>
              {proPerks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
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
          Powered by live eBay marketplace data and Google Gemini multimodal vision. Secure billing via Stripe.
        </p>
      </div>
    </section>
  );
}
