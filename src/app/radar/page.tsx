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

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("Nintendo Switch");
  const [citySlug, setCitySlug] = useState("sydney");
  const [fbToken, setFbToken] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [maxDistance, setMaxDistance] = useState(15);
  const [minProfit, setMinProfit] = useState(25);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal inspection state
  const [selectedAlertModal, setSelectedAlertModal] = useState<RadarAlert | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["All", "Gaming", "Streetwear", "Cameras", "Audio", "Sneakers"];

  const loadRadar = async () => {
    setLoading(true);
    try {
      const data = await scanRadarArbitrage({
        maxDistanceMiles: maxDistance,
        minProfit,
        selectedCategory,
        searchQuery,
        citySlug,
        fbAccessToken: fbToken,
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
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        {/* Facebook Marketplace Search Bar */}
        <div className="space-y-2 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-blue-500 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-blue-500" /> Live Facebook Marketplace Scanner
            </span>

            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              {showKeyInput ? "✕ Hide Graph API Token" : "🔑 Add Facebook Developer Token"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-44 shrink-0">
              <select
                value={citySlug}
                onChange={(e) => setCitySlug(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sydney">📍 Sydney, NSW</option>
                <option value="melbourne">📍 Melbourne, VIC</option>
                <option value="brisbane">📍 Brisbane, QLD</option>
                <option value="perth">📍 Perth, WA</option>
                <option value="adelaide">📍 Adelaide, SA</option>
                <option value="newyork">📍 New York, NY</option>
                <option value="losangeles">📍 Los Angeles, CA</option>
                <option value="london">📍 London, UK</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Type any item (e.g. Nintendo Switch, Nike, iPhone, Camera)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadRadar()}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={loadRadar}
              className="w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 shrink-0 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Scan Facebook Deals
            </button>
          </div>

          {showKeyInput && (
            <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 space-y-1">
              <label className="text-[11px] font-semibold text-blue-300 block">
                Facebook Graph API User Access Token (Optional)
              </label>
              <input
                type="password"
                placeholder="Paste EAAB... access token here"
                value={fbToken}
                onChange={(e) => setFbToken(e.target.value)}
                className="w-full rounded-lg border border-blue-500/40 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-500"
              />
              <p className="text-[10px] text-slate-300">
                Passing your personal Facebook Developer Graph API Token queries your personal app rate quota directly.
              </p>
            </div>
          )}

          {/* 1-Tap Direct Multi-Platform Live Sourcing Bar */}
          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider mr-1">
              ⚡ Live Instant Sourcing:
            </span>

            <a
              href={`https://www.facebook.com/marketplace/${citySlug}/search/?query=${encodeURIComponent(searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Facebook Marketplace ({citySlug.toUpperCase()})</span>
            </a>

            <a
              href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Sold=1&LH_Complete=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-500 hover:bg-amber-500/25 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>eBay Live Sold Comps</span>
            </a>

            <a
              href={`https://www.gumtree.com.au/s-search.html?keywords=${encodeURIComponent(searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/25 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Gumtree Local Deals</span>
            </a>

            <a
              href={`https://www.depop.com/search/?q=${encodeURIComponent(searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/25 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Depop Fashion</span>
            </a>
          </div>
        </div>

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
              const cleanUrl = alert.sourceUrl.startsWith("http") ? alert.sourceUrl : `https://${alert.sourceUrl}`;

              return (
                <div
                  key={alert.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md ${
                    isPurchased ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
                  }`}
                >
                  {/* Photo Thumbnail */}
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (typeof window !== "undefined") {
                        window.open(cleanUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900 mb-4 block cursor-pointer"
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
                      href={cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (typeof window !== "undefined") {
                          window.open(cleanUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="text-base font-bold leading-snug text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 flex items-start justify-between gap-2 cursor-pointer"
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
                    <button
                      type="button"
                      onClick={() => setSelectedAlertModal(alert)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md transition hover:opacity-90 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Inspect Deal & Comps</span>
                    </button>

                    <a
                      href={cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-muted/60 text-xs font-bold text-foreground transition hover:bg-muted cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                      <span>Open on Facebook Marketplace</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyScript(alert)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-500/20 cursor-pointer"
                    >
                      {copiedId === alert.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Buy Script Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Pickup Script</span>
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

      {/* Live Arbitrage Deal Inspection Modal */}
      {selectedAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-slate-900 p-6 md:p-8 text-white shadow-2xl space-y-6">
            <button
              onClick={() => setSelectedAlertModal(null)}
              className="absolute top-5 right-5 rounded-full bg-white/10 p-2 text-slate-400 hover:bg-white/20 hover:text-white transition"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> Live Arbitrage Deal Inspection
            </div>

            <div className="flex items-start gap-4">
              <img
                src={selectedAlertModal.imageUrl}
                alt={selectedAlertModal.title}
                className="h-24 w-24 rounded-2xl object-cover border border-white/10 shrink-0"
              />
              <div>
                <h3 className="text-lg font-bold text-white leading-snug">{selectedAlertModal.title}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Category: {selectedAlertModal.category} • {selectedAlertModal.distanceMiles} miles away
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    +{selectedAlertModal.roiPct}% ROI Margin
                  </span>
                  <span className="rounded-md bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs font-semibold text-blue-300">
                    🎯 Filtered to ${Math.floor(selectedAlertModal.localPrice * 0.9)} - ${Math.ceil(selectedAlertModal.localPrice * 1.1)} on Facebook
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Facebook Asking Price:</span>
                <span className="font-mono text-white font-bold">{fmtMoney(selectedAlertModal.localPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Est. eBay Median Sold Price:</span>
                <span className="font-mono text-blue-400 font-bold">{fmtMoney(selectedAlertModal.estimatedMarketValue)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Est. Platform Fees (13.25%):</span>
                <span className="font-mono">-{fmtMoney(selectedAlertModal.estimatedMarketValue * 0.1325)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Est. Shipping Cost:</span>
                <span className="font-mono">-$12.00</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-extrabold text-emerald-400">
                <span>Net Profit Potential:</span>
                <span className="font-mono text-base">+{fmtMoney(selectedAlertModal.potentialProfit)}</span>
              </div>
            </div>

            {/* Action Links */}
            <div className="space-y-3 pt-2">
              <a
                href={selectedAlertModal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <ExternalLink className="h-4 w-4" /> Open on Facebook Marketplace
              </a>

              <a
                href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(selectedAlertModal.title)}&LH_Sold=1&LH_Complete=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-3 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                🔍 Verify Live Sold Comps on eBay
              </a>

              <button
                onClick={() => handleCopyScript(selectedAlertModal)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Seller Pickup Script
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
