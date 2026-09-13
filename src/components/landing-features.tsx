import React from "react";
import {
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface FeatureCard {
  id: string;
  headline: string;
  detail: string;
  bullets: string[];
  icon: React.ReactNode;
}

const FEATURES: FeatureCard[] = [
  {
    id: "photo-to-listing",
    headline: "Photo to ready-to-post listing",
    detail:
      "Snap a photo and get an 80-character eBay title, condition notes, and platform-specific descriptions for eBay, Depop, Poshmark, and Facebook — in seconds.",
    bullets: [
      "Optimized 80-char eBay SEO titles",
      "Tailored tags & descriptions for Depop & Poshmark",
      "Automatic material, era & defect detection",
    ],
    icon: <Sparkles className="h-5 w-5 text-cyan-400" />,
  },
  {
    id: "sold-comps",
    headline: "Real-time sold comps & profit tracking",
    detail:
      "Market valuation based on 30-day realized sales, not unsold asking prices. Automatically deducts platform fees and postage so you know your exact take-home profit before buying.",
    bullets: [
      "Actual completed sales, not unsold asking prices",
      "Automatic marketplace fee & shipping calculations",
      "Clear Buy, Caution, or Pass flip verdicts",
    ],
    icon: <TrendingUp className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: "ebay-drafts",
    headline: "Direct-to-eBay Seller Hub drafts",
    detail:
      "Push complete listings straight to your eBay account drafts. Review and launch live without copy-pasting across tabs.",
    bullets: [
      "Zero manual data entry from store aisles",
      "Pre-filled item specifics and condition grades",
      "Official eBay API integration",
    ],
    icon: <ShoppingBag className="h-5 w-5 text-amber-400" />,
  },
  {
    id: "batch-haul",
    headline: "Batch haul & inventory tracking",
    detail:
      "Walk the thrift aisles in Rapid Mode, continuously snapping shelf items. Your entire day's sourcing haul is aggregated into a live ledger with one-click CSV export.",
    bullets: [
      "Continuous capture between rack items",
      "Total outlay vs projected profit metrics",
      "CSV export for bookkeeping & tax tracking",
    ],
    icon: <Layers className="h-5 w-5 text-purple-400" />,
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="my-20 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 px-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Built for how resellers actually work
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
          Source faster in the store, eliminate hours of listing admin at home, and price with realized sales data.
        </p>
      </div>

      {/* 2x2 Responsive Feature Grid */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-5">
        {FEATURES.map((feature) => (
          <div
            key={feature.id}
            className="p-6 rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 flex flex-col justify-between hover:border-white/15 transition group space-y-5"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center">
                {feature.icon}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">
                  {feature.headline}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.detail}
                </p>
              </div>
            </div>

            {/* Bullet Highlights */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              {feature.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
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
