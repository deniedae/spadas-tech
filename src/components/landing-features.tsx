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
      "Snap a photo and get an 80-character eBay title, condition notes, and platform-specific descriptions for eBay Australia, Depop, Gumtree, and Facebook Marketplace — in seconds.",
    bullets: [
      "Optimized 80-char eBay SEO titles",
      "Tailored tags & descriptions for Depop & Gumtree",
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

      {/* ── Competitor Comparison Matrix (SellRaze vs Spadas) ── */}
      <div className="max-w-5xl mx-auto px-4 mt-20 pt-16 border-t border-white/[0.08]">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Honest Reseller Comparison</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Why Flippers Are Switching From SellRaze
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Generic listing apps use single-prompt ChatGPT wrappers that lag 10 seconds and guess prices. Spadas is an ensemble optical engine built specifically for secondary marketplaces.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.1] bg-[#0A0D15]/90 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/[0.1] bg-white/[0.02]">
                <th className="py-4 px-4 sm:px-6 font-bold text-zinc-400 uppercase tracking-wider text-[11px]">Reseller Sourcing Feature</th>
                <th className="py-4 px-4 sm:px-6 font-extrabold text-cyan-400 bg-cyan-950/20 border-x border-cyan-500/20 text-center sm:text-left">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Spadas Lens</span>
                  </div>
                </th>
                <th className="py-4 px-4 sm:px-6 font-bold text-zinc-500 text-center sm:text-left">
                  Generic Apps (SellRaze &amp; ChatGPT)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-zinc-300">
              <tr>
                <td className="py-4 px-4 sm:px-6 font-medium text-white">
                  <strong>Scanning Speed &amp; Experience</strong>
                  <div className="text-xs text-zinc-400">Time spent waiting per shelf item in the aisle</div>
                </td>
                <td className="py-4 px-4 sm:px-6 text-emerald-300 font-bold bg-cyan-950/10 border-x border-cyan-500/20">
                  ⚡ <strong>0.5s Live AR HUD</strong> (Continuous scanning, zero lag)
                </td>
                <td className="py-4 px-4 sm:px-6 text-zinc-400">
                  ⏳ 5–10s static photo upload with spinning wheel
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 sm:px-6 font-medium text-white">
                  <strong>AI Visual Intelligence Stack</strong>
                  <div className="text-xs text-zinc-400">Acuity on worn collar tags &amp; jewelry hallmarks</div>
                </td>
                <td className="py-4 px-4 sm:px-6 text-emerald-300 font-bold bg-cyan-950/10 border-x border-cyan-500/20">
                  🔬 <strong>xAI Grok-2 Vision + Multi-Model Arbitration</strong> (.925, 14K, RN tags, 4K UHD vs DVD)
                </td>
                <td className="py-4 px-4 sm:px-6 text-zinc-400">
                  ❌ Generic single OpenAI prompt (hallucinates faded tags)
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 sm:px-6 font-medium text-white">
                  <strong>Market Pricing Grounding</strong>
                  <div className="text-xs text-zinc-400">How valuations and comps are computed</div>
                </td>
                <td className="py-4 px-4 sm:px-6 text-emerald-300 font-bold bg-cyan-950/10 border-x border-cyan-500/20">
                  📊 <strong>100% Real Live 30-Day Sold Comps</strong> (eBay AU &amp; US realized sales with IQR statistical trimming)
                </td>
                <td className="py-4 px-4 sm:px-6 text-zinc-400">
                  ⚠️ AI guesswork or unsold active asking prices
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 sm:px-6 font-medium text-white">
                  <strong>Anti-Thrift Trap Protection</strong>
                  <div className="text-xs text-zinc-400">Prevents buying items that lose money on postage</div>
                </td>
                <td className="py-4 px-4 sm:px-6 text-emerald-300 font-bold bg-cyan-950/10 border-x border-cyan-500/20">
                  🛡️ <strong>Built-In Trap Detection</strong> (Flags common DVDs, heavy mugs &amp; low-margin tech)
                </td>
                <td className="py-4 px-4 sm:px-6 text-zinc-400">
                  ❌ Zero shipping awareness (tells you to buy $5 items)
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 sm:px-6 font-medium text-white">
                  <strong>True Net Profit Calculator</strong>
                  <div className="text-xs text-zinc-400">Actual in-pocket cash calculation</div>
                </td>
                <td className="py-4 px-4 sm:px-6 text-emerald-300 font-bold bg-cyan-950/10 border-x border-cyan-500/20">
                  💰 <strong>Exact AusPost / USPS Satchel Math</strong> + 13.4% marketplace fees deducted
                </td>
                <td className="py-4 px-4 sm:px-6 text-zinc-400">
                  ❌ Gross estimates only; ignores real parcel shipping
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4 sm:px-6 font-medium text-white">
                  <strong>Subscription Cost</strong>
                  <div className="text-xs text-zinc-400">Monthly overhead to run your reselling business</div>
                </td>
                <td className="py-4 px-4 sm:px-6 text-cyan-300 font-extrabold bg-cyan-950/10 border-x border-cyan-500/20">
                  💎 <strong>$10 AUD / $6.99 USD/mo</strong> (10 free daily scans forever)
                </td>
                <td className="py-4 px-4 sm:px-6 text-red-400/90 font-medium">
                  💸 $20 – $30+ USD/mo ($35–$45 AUD/mo)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
