"use client";

import UnifiedCameraHub from "@/components/unified-camera-hub";
import { Sparkles, Flame, TrendingUp, Zap, Trophy, Lightbulb, ArrowUpRight, DollarSign } from "lucide-react";

export default function LensPage() {
  const hotTrends = [
    {
      category: "Vintage 90s Windbreakers",
      emoji: "🧥",
      tag: "Vintage Streetwear",
      demand: "+340% YoY",
      avgProfit: "$65 AUD",
      velocity: "Very High",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      accent: "text-emerald-400",
    },
    {
      category: "Game Boy Color & Retro Tech",
      emoji: "🎮",
      tag: "Nostalgia Tech",
      demand: "+210% YoY",
      avgProfit: "$85 AUD",
      velocity: "Fast (1-2 Days)",
      gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      accent: "text-cyan-400",
    },
    {
      category: "North Face 700 Nuptse Jackets",
      emoji: "❄️",
      tag: "Gorpcore Outerwear",
      demand: "+190% YoY",
      avgProfit: "$120 AUD",
      velocity: "High",
      gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
      badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      accent: "text-purple-400",
    },
    {
      category: "Base Set Pokemon & TCG Cards",
      emoji: "🃏",
      tag: "Grail Collectibles",
      demand: "+410% YoY",
      avgProfit: "$190 AUD",
      velocity: "Immediate",
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      accent: "text-amber-400",
    },
  ];

  return (
    <div className="w-full min-h-full flex-1 flex flex-col overflow-y-auto md:overflow-visible box-border animate-fade-in bg-gradient-to-b from-[#0A0E1A] via-[#0D1220] to-[#0A0E1A]">
      {/* Spadas Lens Unified Camera Hub (Lens AR + Cyber HUD + Snap Studio) */}
      <UnifiedCameraHub />

      {/* Joyful Desktop Reseller Hub & Predictive Sourcing Radar */}
      <div className="hidden md:block max-w-6xl mx-auto w-full space-y-6 pt-8 mt-6 border-t border-white/10 px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {/* Inspiring Header Banner */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-indigo-950/40 border border-emerald-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/20 via-cyan-500/15 to-transparent blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black shadow-sm">
                <Sparkles className="h-3.5 w-3.5 animate-happy-sparkle" />
                <span>SPADAS LENS 2.0 • AI RESELLER RADAR</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Turn Thrift Shelves Into Instant Cash <span className="text-emerald-400">✨</span>
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Scan barcodes or snap thrift rack finds in 0.5s. Spadas Lens auto-calculates eBay sold comps, platform fees, and net profit before you buy.
              </p>
            </div>

            {/* Quick Live Stats Pills */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 text-center min-w-[110px] shadow-sm backdrop-blur-md">
                <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Avg Profit</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">+$52.80</div>
              </div>
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 text-center min-w-[110px] shadow-sm backdrop-blur-md">
                <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Scan Speed</div>
                <div className="text-lg font-black text-cyan-300 font-mono mt-0.5">0.5s</div>
              </div>
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 text-center min-w-[110px] shadow-sm backdrop-blur-md">
                <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Sold Comps</div>
                <div className="text-lg font-black text-amber-300 font-mono mt-0.5">eBay AU</div>
              </div>
            </div>
          </div>
        </div>

        {/* Predictive Heatmap Sourcing Radar Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Flame className="h-5 w-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Today's High-Velocity Thrift Radar</h3>
                <p className="text-xs text-zinc-400">
                  Real-time marketplace demand metrics indicating the highest margin categories to source right now.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hotTrends.map((t) => (
              <div
                key={t.category}
                className={`relative rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-lg space-y-3 overflow-hidden backdrop-blur-xl hover:border-white/20 hover:-translate-y-1 transition-all duration-200 group bg-gradient-to-b ${t.gradient}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl select-none">{t.emoji}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${t.badgeColor}`}>
                    <TrendingUp className="h-3 w-3" />
                    {t.demand}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">{t.tag}</span>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {t.category}
                  </h4>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-zinc-400">Avg Net Profit</p>
                    <p className="text-base font-black text-emerald-400 font-mono tracking-tight">{t.avgProfit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-zinc-400">Turnaround</p>
                    <p className="text-xs font-bold text-zinc-200">{t.velocity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Joyful Daily Op-Shop Pro Tip Card */}
        <div className="rounded-3xl p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/25 flex items-start gap-4 shadow-sm backdrop-blur-md">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Lightbulb className="h-5 w-5 text-amber-300" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>💡 Reseller Pro Tip for Today</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Thrift Goldmine
              </span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              When browsing thrift aisles, check for single-stitch hems on graphic tees, vintage Y2K compact digital cameras (Sony Cyber-shot, Canon PowerShot), and heavy metal zippers (YKK, Talon). These flip on eBay within 48 hours for 4x-10x tag cost!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
