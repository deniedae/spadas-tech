"use client";

import SpadasLensCamera from "@/components/spadas-lens-camera";
import { Sparkles, Flame, Eye, TrendingUp, Compass, Volume2, ShieldCheck } from "lucide-react";

export default function LensPage() {
  const hotTrends = [
    { category: "Vintage 90s Windbreakers", demand: "+340% YoY", avgProfit: "$65 AUD", velocity: "Very High" },
    { category: "Game Boy Color Consoles", demand: "+210% YoY", avgProfit: "$85 AUD", velocity: "Fast (1-2 Days)" },
    { category: "North Face 700 Nuptse Jackets", demand: "+190% YoY", avgProfit: "$120 AUD", velocity: "High" },
    { category: "Base Set Pokemon Cards", demand: "+410% YoY", avgProfit: "$190 AUD", velocity: "Immediate" },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-800 p-6 md:p-10 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-cyan-200 border border-white/20">
          <Eye className="h-3.5 w-3.5 text-cyan-300" />
          REVOLUTIONARY AR VISION TECHNOLOGY
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Spadas Lens — Live Video AR Sourcing & Heatmap
        </h1>
        <p className="text-sm text-cyan-100 max-w-2xl leading-relaxed">
          Pan your phone camera across thrift store racks or shelves. Spadas Lens identifies logos, titles, and tags in real-time, overlays <strong>🟩 AR Green Bounding Boxes</strong> on high-margin hits, and chimes in your ear so you source 10x faster than anyone else.
        </p>
      </div>

      {/* Spadas Lens Live Camera Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            <h2 className="text-xl font-bold tracking-tight">Live AR Camera Feed</h2>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Volume2 className="h-4 w-4 text-cyan-500" />
            Hands-Free Audio Cues Active
          </span>
        </div>

        <SpadasLensCamera />
      </div>

      {/* Predictive Heatmap Sourcing Radar */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold tracking-tight">Predictive Heatmap Sourcing Radar</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time category demand metrics indicating what to look out for at thrift stores today.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotTrends.map((t) => (
            <div key={t.category} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <TrendingUp className="h-3 w-3" />
                {t.demand} Demand
              </span>
              <h3 className="text-base font-bold text-foreground">{t.category}</h3>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-[11px] text-muted-foreground">Avg Net Profit</p>
                  <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{t.avgProfit}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Turnaround</p>
                  <p className="text-xs font-bold text-foreground">{t.velocity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
