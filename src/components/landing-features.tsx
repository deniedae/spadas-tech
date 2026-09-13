import React from "react";
import {
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Layers,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface FeatureCard {
  id: string;
  badge: string;
  headline: string;
  subdetail: string;
  detail: string;
  bullets: string[];
  icon: React.ReactNode;
}

const FEATURES: FeatureCard[] = [
  {
    id: "photo-to-listing",
    badge: "AI COPYWRITING",
    headline: "Photo to ready-to-post listing",
    subdetail: "Title, description, and suggested price generated in seconds",
    detail:
      "Converts a single camera snapshot into 80-character SEO titles, bulleted condition notes, and platform-specific formats for eBay, Depop, Poshmark, and Facebook.",
    bullets: [
      "Optimized 80-char eBay SEO titles",
      "Tailored tags & descriptions for Depop & Poshmark",
      "Automatic material, era & defect detection",
    ],
    icon: <Sparkles className="h-6 w-6 text-cyan-400" />,
  },
  {
    id: "sold-comps",
    badge: "PRICE WITH CERTAINTY",
    headline: "Real-time sold comps & profit tracking",
    subdetail: "Cost, fees, shipping and net margin per item",
    detail:
      "Instant market valuation based on realized 30-day sold comps across marketplaces. Automatically deducts platform fees and postage so you know your exact take-home profit before buying.",
    bullets: [
      "Actual completed sales, not unsold asking prices",
      "Automatic marketplace fee & shipping calculations",
      "Clear Buy, Caution, or Pass flip verdicts",
    ],
    icon: <TrendingUp className="h-6 w-6 text-emerald-400" />,
  },
  {
    id: "ebay-drafts",
    badge: "1-TAP DIRECT PUBLISH",
    headline: "Direct-to-eBay Seller Hub drafts",
    subdetail: "Photos, categories, item specifics and pricing pushed in one tap",
    detail:
      "Push complete listings straight to your eBay account drafts in the background. Review and launch live without copy-pasting across tabs.",
    bullets: [
      "Zero manual data entry from store aisles",
      "Pre-filled item specifics and condition grades",
      "Official eBay Australia & global API integration",
    ],
    icon: <ShoppingBag className="h-6 w-6 text-amber-400" />,
  },
  {
    id: "batch-haul",
    badge: "HAUL SOURCING MODE",
    headline: "Batch haul & inventory tracking",
    subdetail: "Shelf-to-manifest logging with instant CSV export",
    detail:
      "Walk the thrift aisles in Rapid Mode, continuously snapping shelf items. The app aggregates your entire day's sourcing haul into a live ledger with one-click CSV export.",
    bullets: [
      "0ms synchronous capture between rack items",
      "Total capital outlay vs projected profit metrics",
      "Instant CSV export for bookkeeping & tax tracking",
    ],
    icon: <Layers className="h-6 w-6 text-purple-400" />,
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-300">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          Reseller Workflow System
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Built for how resellers actually work
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Designed specifically for sellers moving volume. Source faster in the store, eliminate hours of listing admin at home, and price with realized sales data.
        </p>
      </div>

      {/* 2x2 Responsive Feature Grid */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {FEATURES.map((feature) => (
          <div
            key={feature.id}
            className="p-6 sm:p-7 rounded-3xl border border-white/[0.08] bg-[#0A0D15]/80 backdrop-blur-xl flex flex-col justify-between hover:border-white/20 transition group space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:scale-105 transition">
                  {feature.icon}
                </div>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-white/[0.06]">
                  {feature.badge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition">
                  {feature.headline}
                </h3>
                <p className="text-xs sm:text-sm font-mono text-cyan-400/90 font-medium">
                  {feature.subdetail}
                </p>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pt-0.5">
                  {feature.detail}
                </p>
              </div>
            </div>

            {/* Bullet Highlights */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              {feature.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 font-sans">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
