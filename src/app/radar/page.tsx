"use client";

import { useEffect, useState } from "react";
import { scanRadarArbitrage } from "@/app/actions/radar-scan";
import { RadarAlert } from "@/types/radar";
import { fmtMoney } from "@/app/lib/listings";
import {
  Radio,
  Copy,
  Check,
  TrendingUp,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Flame,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import SpadasRadarCopilot from "@/components/spadas-radar-copilot";

export default function RadarPage() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);

  // Filter state
  const [maxDistance, setMaxDistance] = useState(15);
  const [minProfit, setMinProfit] = useState(25);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["All", "Gaming", "Streetwear", "Cameras", "Audio", "Sneakers"];

  const loadRadar = async () => {
    setLoading(true);
    try {
      const data = await scanRadarArbitrage({
        maxDistanceMiles: maxDistance,
        minProfit,
        selectedCategory,
      });
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load radar arbitrage:", err);
      toast.error("Couldn't scan local arbitrage feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRadar();
  }, [maxDistance, minProfit, selectedCategory]);

  const handleCopyScript = (alert: RadarAlert) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(alert.buyScript);
      setCopiedId(alert.id);
      toast.success(`Copied 1-Click Buy Script to clipboard!`);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleMarkPurchased = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "purchased" } : a)));
    toast.success("Deal marked as Purchased! Added to your flip tracker.");
  };

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.info("Alert dismissed.");
  };

  const activeAlerts = alerts.filter((a) => a.status === "active" || a.status === "purchased");

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-600 p-6 md:p-10 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-cyan-200 border border-white/20">
          <Radio className="h-3.5 w-3.5 text-cyan-300 animate-pulse" />
          AUTOMATED LOCAL ARBITRAGE FINDER
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Spadas Radar — Local Marketplace Arbitrage & AI Copilot
        </h1>
        <p className="max-w-2xl text-sm md:text-base text-cyan-100/90 leading-relaxed">
          AI continuously scans local listings, calculates cross-platform eBay/Poshmark/Depop/Mercari net profit spreads, and formats 1-click cross-listings.
        </p>
      </div>

      {/* KILLER FEATURE: AI Arbitrage Radar & Cross-Platform Exporter Copilot */}
      <SpadasRadarCopilot />

      {/* Filter Controls Bar */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-bold">Arbitrage Filters</h2>
          </div>
          <button
            type="button"
            onClick={loadRadar}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Scan
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Max Distance Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Max Distance Radius</span>
              <span className="text-foreground">{maxDistance} Miles / km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-muted appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Min Profit Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Min Net Profit Threshold</span>
              <span className="text-emerald-600 dark:text-emerald-400">${minProfit}+ Profit</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={minProfit}
              onChange={(e) => setMinProfit(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-muted appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Category Toggle Pills */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground block">Category Filter</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Arbitrage Alerts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            Live Arbitrage Feed ({activeAlerts.length} Deals Found)
          </h2>
          <span className="text-xs text-muted-foreground">Matched against eBay Sold Comps</span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : activeAlerts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeAlerts.map((alert) => {
              const isPurchased = alert.status === "purchased";

              return (
                <div
                  key={alert.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md ${
                    isPurchased ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
                  }`}
                >
                  {/* Photo Thumbnail */}
                  <a
                    href={alert.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900 mb-4 block"
                  >
                    <img
                      src={alert.imageUrl}
                      alt={alert.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-slate-950/80 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white uppercase border border-white/10 flex items-center gap-1">
                      {alert.marketplace}
                      <ExternalLink className="h-3 w-3 text-cyan-400" />
                    </span>

                    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      <ShieldCheck className="h-3 w-3" />
                      {alert.confidenceScore}% Match
                    </span>
                  </a>

                  {/* Title & Distance */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        {alert.distanceMiles} miles away
                      </span>
                      <span className="font-semibold text-foreground">{alert.category}</span>
                    </div>

                    <a
                      href={alert.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-bold leading-snug text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 flex items-start justify-between gap-2"
                    >
                      <span className="line-clamp-2">{alert.title}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                    </a>
                  </div>

                  {/* Arbitrage Financial Breakdown */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2 mb-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Local Price</p>
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {fmtMoney(alert.localPrice)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">Est. eBay Comps</p>
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {fmtMoney(alert.estimatedMarketValue)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-emerald-500/20 pt-2">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Net Profit Potential
                      </span>
                      <span className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{fmtMoney(alert.potentialProfit)} ({alert.roiPct}% ROI)
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <a
                      href={alert.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md transition hover:opacity-90 cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Listing on {alert.marketplace}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyScript(alert)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-500/20 cursor-pointer"
                    >
                      {copiedId === alert.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Buy Script Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy 1-Click Buy Script</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleMarkPurchased(alert.id)}
                        disabled={isPurchased}
                        className={`flex-1 inline-flex h-9 items-center justify-center gap-1 rounded-xl text-xs font-bold transition ${
                          isPurchased
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isPurchased ? "Purchased" : "Mark Bought"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDismiss(alert.id)}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-muted px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Dismiss alert"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground space-y-2">
            <Radio className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No arbitrage deals matched your current filters.</p>
            <p className="text-xs">Try increasing max distance radius or lowering min profit threshold.</p>
          </div>
        )}
      </div>
    </div>
  );
}
