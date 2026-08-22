"use client";

import UnifiedCameraHub from "@/components/unified-camera-hub";
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
      {/* Spadas Lens Unified Camera Hub (Lens AR + Snap Studio) */}
      <UnifiedCameraHub />

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
