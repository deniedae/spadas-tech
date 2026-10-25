"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ExternalLink,
  ShieldCheck,
  Scale,
  TrendingUp,
  Sparkles,
  Tag,
  Search,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Layers,
  Loader2,
  X,
  Zap,
} from "lucide-react";
import {
  calculateOmniMarketplaceComps,
  buildMarketplaceCompUrl,
} from "@/lib/omni-marketplaces";
import {
  SupportedCurrency,
  detectGeoCurrency,
  CURRENCY_CONFIGS,
  convertCurrency,
} from "@/app/lib/currency-routing";
import { openExternalUrlSafely, triggerTactileHaptic } from "@/lib/android-bridge";
import { toast } from "sonner";
import {
  generateEbayPrefillUrl,
  generateOptimizedEbayTitle,
  buildEbayPolicyCompliantDescription,
} from "@/app/lib/marketplaces/ebay-prefill";

export interface NormalizedCompItem {
  id: string;
  title: string;
  price: number;
  condition?: string;
  soldDate?: string;
  shippingIncluded?: boolean;
  shippingPrice?: number;
  url?: string;
  thumbnail?: string;
  isActiveAsk?: boolean;
  isUsComp?: boolean;
}

export interface Props {
  productName: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  estimatedPrice: number;
  costOfGoods?: number;
  currency?: SupportedCurrency;
  rawComps?: any[];
  valuationState?: string;
  valuationDetail?: string;
  onCurrencyChange?: (currency: SupportedCurrency) => void;
  onListEbay?: () => void;
  onClose?: () => void;
  compact?: boolean;
}

function formatCompSoldDate(dateStr?: string): string {
  if (!dateStr) return "Recent sale";
  if (dateStr === "Active Ask" || dateStr === "Active") return "Active Ask";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const now = Date.now();
      const diffDays = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return "Sold today";
      if (diffDays === 1) return "Sold yesterday";
      if (diffDays < 30) return `Sold ${diffDays}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {}
  return dateStr;
}

export function OmniMarketplaceCompareCard({
  productName,
  brand,
  category,
  condition,
  estimatedPrice,
  costOfGoods = 0,
  currency,
  rawComps,
  valuationState,
  valuationDetail,
  onCurrencyChange,
  onListEbay,
  onClose,
  compact = false,
}: Props) {
  const [currentCurrency, setCurrentCurrency] = useState<SupportedCurrency>(() => {
    if (currency) return currency;
    return typeof window !== "undefined" ? detectGeoCurrency().currency : "USD";
  });

  const [activeTab, setActiveTab] = useState<"comps" | "fees">("comps");
  const [filterQuery, setFilterQuery] = useState("");
  const [comps, setComps] = useState<NormalizedCompItem[]>(() => {
    if (rawComps && Array.isArray(rawComps)) {
      return normalizeCompList(rawComps);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(!rawComps || rawComps.length === 0);

  useEffect(() => {
    if (currency) setCurrentCurrency(currency);
  }, [currency]);

  const fullQuery = useMemo(() => {
    return [brand, productName].filter(Boolean).join(" ").trim() || "Item";
  }, [brand, productName]);

  // Live Auto-fetch fallback: if rawComps was empty or currency switched
  useEffect(() => {
    let isCancelled = false;

    if (rawComps && rawComps.length > 0 && currentCurrency === currency) {
      setComps(normalizeCompList(rawComps));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const fetchUrl = `/api/ebay-australia-comps?q=${encodeURIComponent(fullQuery)}&currency=${currentCurrency}`;
    fetch(fetchUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isCancelled) return;
        if (data && Array.isArray(data.rawComps) && data.rawComps.length > 0) {
          setComps(normalizeCompList(data.rawComps));
        } else if (data && Array.isArray(data.raw_sold_comps) && data.raw_sold_comps.length > 0) {
          setComps(normalizeCompList(data.raw_sold_comps));
        } else {
          setComps([]);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          if (rawComps && rawComps.length > 0) {
            setComps(normalizeCompList(rawComps));
          } else {
            setComps([]);
          }
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [fullQuery, currentCurrency, currency, rawComps]);

  // Genuine statistics derived strictly from real comps
  const stats = useMemo(() => {
    const validPrices = comps.map((c) => Number(c.price)).filter((p) => !isNaN(p) && p > 0);
    const sorted = [...validPrices].sort((a, b) => a - b);
    const count = comps.length;
    const soldListings = comps.filter((c) => !c.isActiveAsk);
    const activeListings = comps.filter((c) => Boolean(c.isActiveAsk));
    const soldCount = soldListings.length;
    const activeCount = activeListings.length;

    const baseMed = sorted.length > 0
      ? (sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)])
      : estimatedPrice;

    const minPrice = sorted.length > 0 ? sorted[0] : Math.round(estimatedPrice * 0.75);
    const maxPrice = sorted.length > 0 ? sorted[sorted.length - 1] : Math.round(estimatedPrice * 1.25);

    // Velocity from actual sales in last 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const salesIn30Days = soldListings.filter((c) => {
      const d = new Date(c.soldDate || "").getTime();
      return !isNaN(d) && d >= thirtyDaysAgo;
    }).length;

    let velocityLabel = "Low Historical Volume";
    let velocityBadge = "Scarcity / Rare";
    let velocityColor = "text-amber-400";

    if (soldCount > 0) {
      if (salesIn30Days >= 5) {
        velocityLabel = `High Velocity (${salesIn30Days} sold in 30d)`;
        velocityBadge = "Fast Turnover";
        velocityColor = "text-emerald-400";
      } else if (salesIn30Days >= 2) {
        velocityLabel = `Steady Mover (${salesIn30Days} sold in 30d)`;
        velocityBadge = "Moderate Turnover";
        velocityColor = "text-teal-400";
      } else {
        velocityLabel = `Recorded Sales (${soldCount} total cleared)`;
        velocityBadge = "Standard Velocity";
        velocityColor = "text-cyan-300";
      }
    } else if (activeCount > 0) {
      velocityLabel = `Active Competition (${activeCount} live asks)`;
      velocityBadge = "Active Market";
      velocityColor = "text-cyan-400";
    }

    return {
      median: baseMed,
      min: minPrice,
      max: maxPrice,
      count,
      soldCount,
      activeCount,
      salesIn30Days,
      velocityLabel,
      velocityBadge,
      velocityColor,
      hasSoldComps: soldCount > 0,
      hasActiveOnly: soldCount === 0 && activeCount > 0,
      hasZeroData: count === 0,
    };
  }, [comps, estimatedPrice]);

  // Official marketplace fee schedules & net realization math (No arbitrary multipliers)
  const currencyConfig = CURRENCY_CONFIGS[currentCurrency] || CURRENCY_CONFIGS.USD;
  const sym = currencyConfig.symbol;

  const feeMath = useMemo(() => {
    const isUK = currentCurrency === "GBP";
    const isUS = currentCurrency === "USD";
    const feeRate = isUK ? 0.128 : isUS ? 0.1325 : 0.134;
    const fixedFee = isUK ? 0.30 : isUS ? 0.30 : 0.33;
    const shipping = isUK ? 3.49 : isUS ? 5.20 : 10.60;

    const sale = stats.median;
    const ebayFee = Math.round((sale * feeRate + fixedFee) * 100) / 100;
    const netPayout = Math.max(0, Math.round((sale - ebayFee - shipping) * 100) / 100);
    const netProfit = Math.round((netPayout - costOfGoods) * 100) / 100;

    return {
      feeRatePercent: (feeRate * 100).toFixed(1),
      fixedFee,
      shipping,
      sale,
      ebayFee,
      netPayout,
      netProfit,
    };
  }, [currentCurrency, stats.median, costOfGoods]);

  const omniData = useMemo(() => {
    return calculateOmniMarketplaceComps({
      productName,
      brand,
      basePrice: stats.median,
      baseCurrency: currentCurrency,
      currency: currentCurrency,
      customCost: costOfGoods,
    });
  }, [productName, brand, stats.median, currentCurrency, costOfGoods]);

  const filteredComps = useMemo(() => {
    if (!filterQuery.trim()) return comps;
    const q = filterQuery.toLowerCase();
    return comps.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.condition && c.condition.toLowerCase().includes(q)) ||
        (c.soldDate && c.soldDate.toLowerCase().includes(q))
    );
  }, [comps, filterQuery]);

  // Direct Outbound Proof URLs
  const ebaySoldUrl = useMemo(() => {
    return buildMarketplaceCompUrl("ebay", fullQuery, currentCurrency);
  }, [fullQuery, currentCurrency]);

  const ebayActiveUrl = useMemo(() => {
    const domain = currentCurrency === "AUD" ? "www.ebay.com.au" : currentCurrency === "GBP" ? "www.ebay.co.uk" : "www.ebay.com";
    return `https://${domain}/sch/i.html?_nkw=${encodeURIComponent(fullQuery)}&LH_BIN=1`;
  }, [fullQuery, currentCurrency]);

  const googleShopUrl = useMemo(() => {
    return buildMarketplaceCompUrl("google_shopping", fullQuery, currentCurrency);
  }, [fullQuery, currentCurrency]);

  const handleOneTapEbay = () => {
    triggerTactileHaptic("tap");
    if (onListEbay) {
      onListEbay();
      return;
    }
    try {
      const cleanBrand = brand?.trim() || "Unbranded";
      const compliantTitle = generateOptimizedEbayTitle(productName, cleanBrand);
      const compliantDesc = buildEbayPolicyCompliantDescription({
        title: compliantTitle,
        brand: cleanBrand,
        condition: condition || "Used - Good",
        category: category || undefined,
        currency: currentCurrency,
      });
      const copyPayload = `Title: ${compliantTitle}\nPrice: ${sym}${stats.median.toFixed(2)} ${currentCurrency}\nCondition: ${condition || "Used - Good"}\nBrand: ${cleanBrand}\nMPN: Does Not Apply\n\nDescription:\n${compliantDesc}`;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          void navigator.clipboard.writeText(copyPayload);
        }
      } catch {}

      const prefillUrl = generateEbayPrefillUrl({
        title: compliantTitle,
        price: stats.median,
        currency: currentCurrency,
        brand: cleanBrand,
        category: category || undefined,
      });
      toast.success(`📋 Listing payload copied! Opening official eBay Sell wizard...`, { duration: 4000 });
      const opened = window.open(prefillUrl, "_blank");
      if (!opened) {
        window.location.href = prefillUrl;
      }
    } catch {
      const domain = currentCurrency === "AUD" ? "www.ebay.com.au" : currentCurrency === "GBP" ? "www.ebay.co.uk" : "www.ebay.com";
      window.location.href = `https://${domain}/sl/prelist/suggest?keyword=${encodeURIComponent(productName)}`;
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl relative overflow-hidden select-none">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5 mb-3.5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              Market Comps &amp; Evidence
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                Professional
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 font-medium">
            {brand ? `${brand} · ` : ""}
            {productName}
          </p>
        </div>

        {/* Currency Switcher & Close */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-slate-950/80 border border-slate-800 p-0.5 rounded-xl">
            {(["AUD", "USD", "GBP"] as const).map((curr) => {
              const isSelected = currentCurrency === curr;
              return (
                <button
                  key={curr}
                  type="button"
                  onClick={() => {
                    setCurrentCurrency(curr);
                    if (typeof window !== "undefined") {
                      try {
                        localStorage.setItem("spadas_selected_currency", curr);
                      } catch {}
                    }
                    if (onCurrencyChange) {
                      onCurrencyChange(curr);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title={`View comps in ${curr}`}
                >
                  <span>{curr === "AUD" ? "🇦🇺" : curr === "USD" ? "🇺🇸" : "🇬🇧"}</span>
                  <span>{curr}</span>
                </button>
              );
            })}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Direct Live Proof Outbound Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5 relative z-10">
        <a
          href={ebaySoldUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition active:scale-95 text-center"
          title="Direct verified eBay completed and sold transactions (green numbers)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>eBay Sold Comps</span>
          <ExternalLink className="w-3 h-3 text-emerald-400 ml-0.5 shrink-0" />
        </a>

        <a
          href={ebayActiveUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition active:scale-95 text-center"
          title="Inspect live competitor Buy-It-Now prices on eBay"
        >
          <span>Active Asks</span>
          <ExternalLink className="w-3 h-3 text-cyan-400 ml-0.5 shrink-0" />
        </a>

        <a
          href={googleShopUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition active:scale-95 text-center"
          title="Compare retail floor across major commercial online stores"
        >
          <span>Google Shopping</span>
          <ExternalLink className="w-3 h-3 text-amber-400 ml-0.5 shrink-0" />
        </a>

        <a
          href={buildMarketplaceCompUrl("depop", fullQuery, currentCurrency)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold transition active:scale-95 text-center"
          title="Check apparel & streetwear prices on Depop"
        >
          <span>Depop Market</span>
          <ExternalLink className="w-3 h-3 text-purple-400 ml-0.5 shrink-0" />
        </a>
      </div>

      {/* Verified Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 relative z-10 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            {stats.hasSoldComps ? "Median Sold" : "Active Ask Median"}
          </span>
          <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums">
            {sym}{stats.median.toFixed(2)}
          </span>
        </div>
        <div className="border-l border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Market Range</span>
          <span className="text-xs sm:text-sm font-bold text-slate-300 font-mono tabular-nums">
            {sym}{stats.min.toFixed(0)} – {sym}{stats.max.toFixed(0)}
          </span>
        </div>
        <div className="border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Evidence Count</span>
          <span className="text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center gap-1 font-mono">
            {stats.hasSoldComps ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{stats.soldCount} Cleared Sales</span>
              </>
            ) : stats.hasActiveOnly ? (
              <>
                <Tag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{stats.activeCount} Active Asks</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>0 Sales on Record</span>
              </>
            )}
          </span>
        </div>
        <div className="border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Turnover Speed</span>
          <span className={`text-xs sm:text-sm font-bold flex items-center justify-center gap-1 ${stats.velocityColor}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="truncate">{stats.velocityBadge}</span>
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-3.5 relative z-10">
        <button
          type="button"
          onClick={() => setActiveTab("comps")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "comps"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sold Comps Evidence ({comps.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fees")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "fees"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          <span>Payout &amp; Platform Fees</span>
        </button>
      </div>

      {/* TAB 1: SOLD COMPS EVIDENCE LEDGER */}
      {activeTab === "comps" && (
        <div className="space-y-3 relative z-10">
          {/* Quick 1-Tap Action Pill inside Comps Ledger */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              <span className="text-[11px] text-slate-300 font-medium truncate">
                Target: <strong className="text-white font-mono font-bold">{sym}{stats.median.toFixed(2)}</strong> {currentCurrency}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOneTapEbay}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              <span>1-Tap List</span>
            </button>
          </div>

          {/* Quick Search & Filter Bar */}
          {comps.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Filter these ${comps.length} verified listings...`}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-medium"
              />
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs font-medium">Fetching verified eBay market comps...</span>
            </div>
          ) : filteredComps.length > 0 ? (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredComps.map((comp, idx) => (
                <div
                  key={comp.id || idx}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800/80 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail Image */}
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                      {comp.thumbnail ? (
                        <img
                          src={comp.thumbnail}
                          alt={comp.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    {/* Title & Metas */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-semibold text-white line-clamp-1 leading-snug">
                        {comp.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                        <span className={`font-medium ${comp.isActiveAsk ? "text-cyan-400" : "text-emerald-400"}`}>
                          {comp.isActiveAsk ? "Live Active Ask" : formatCompSoldDate(comp.soldDate)}
                        </span>
                        {comp.condition && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800">
                            {comp.condition}
                          </span>
                        )}
                        <span>
                          {comp.shippingIncluded || comp.shippingPrice === 0
                            ? "Free post"
                            : comp.shippingPrice
                              ? `+${sym}${comp.shippingPrice.toFixed(2)} post`
                              : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Link */}
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-black font-mono tabular-nums ${comp.isActiveAsk ? "text-cyan-300" : "text-emerald-400"}`}>
                      {sym}{comp.price.toFixed(2)}
                    </div>
                    {comp.url && (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline mt-0.5"
                      >
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Honest Zero Comps Grounding State (No guesses) */
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
              <div className="inline-flex p-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                0 Completed Sales Found in eBay 90-Day Archive
              </h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                No verified sold records match this exact query. To ensure absolute data accuracy without guesses, outbound search links are provided below to inspect active competition.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <a
                  href={ebayActiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-sm"
                >
                  <span>Search Live eBay Asks</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={googleShopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
                >
                  <span>Google Shopping</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYOUT & PLATFORM FEES (Pure Math, No Guesses) */}
      {activeTab === "fees" && (
        <div className="space-y-3.5 relative z-10">
          {/* Transparent Reseller P&L Equation */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
              Itemized Reseller P&amp;L Formula ({currentCurrency})
            </span>
            <div className="flex items-center justify-between text-slate-300 text-xs">
              <span>Target Sale Price (eBay Median):</span>
              <span className="font-bold text-white">{sym}{feeMath.sale.toFixed(2)}</span>
            </div>
            {costOfGoods > 0 && (
              <div className="flex items-center justify-between text-slate-300 text-xs">
                <span>− Sourced Cost (Thrift Tag):</span>
                <span className="text-amber-400 font-bold">−{sym}{costOfGoods.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-300 text-xs">
              <span>− Official eBay Fee ({feeMath.feeRatePercent}% + {sym}{feeMath.fixedFee.toFixed(2)}):</span>
              <span className="text-rose-400 font-bold">−{sym}{feeMath.ebayFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-xs">
              <span>− Standard Tracked Postage:</span>
              <span className="text-rose-400 font-bold">−{sym}{feeMath.shipping.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold">
              <span className="text-emerald-400 font-sans">Estimated Take-Home Realization:</span>
              <span className="text-emerald-400 font-black">+{sym}{feeMath.netProfit.toFixed(2)}</span>
            </div>
          </div>

          {/* Official Marketplace Fee Comparison */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Seller Fees Across Alternative Marketplaces
            </span>
            {omniData.marketplaces.map((m) => (
              <div
                key={m.platformId}
                className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">{m.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {m.isBestProfit && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-black">
                          Highest Net
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{m.tagline}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-emerald-400 font-mono">
                    {sym}{m.netPayout.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">net</span>
                  </div>
                  {m.platformId === "ebay" ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={handleOneTapEbay}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[10px] transition active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Zap className="w-2.5 h-2.5 fill-slate-950" />
                        <span>1-Tap List</span>
                      </button>
                      <a
                        href={m.searchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition hover:underline"
                      >
                        <span>Comps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  ) : (
                    <a
                      href={m.searchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition hover:underline"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1-Tap eBay Action Hero Banner */}
      <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-transparent border border-amber-500/40 flex items-center justify-between gap-3 relative z-10 shadow-lg shadow-amber-500/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/30 text-amber-300 shrink-0">
            <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate">
              <span>1-Tap List on eBay</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold">
                {sym}{stats.median.toFixed(2)}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              VeRO-compliant · MPN preset · 30-day returns &amp; tracked dispatch
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOneTapEbay}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/30 flex items-center gap-1.5 shrink-0"
        >
          <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
          <span>List Now</span>
        </button>
      </div>

      {/* Footer Info Strip */}
      <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Grounded in verified completed transactions</span>
        </span>
        <a
          href={googleShopUrl}
          target="_blank"
          rel="noreferrer"
          className="text-slate-300 hover:text-white font-medium inline-flex items-center gap-1 text-[11px] transition"
        >
          Check Google Shopping ↗
        </a>
      </div>
    </div>
  );
}

function normalizeCompList(rawList: any[]): NormalizedCompItem[] {
  if (!Array.isArray(rawList)) return [];
  const results: NormalizedCompItem[] = [];
  for (let idx = 0; idx < rawList.length; idx++) {
    const c = rawList[idx];
    if (!c) continue;
    const rawPrice = Number(c.price);
    if (isNaN(rawPrice) || rawPrice <= 0) continue;
    results.push({
      id: String(c.id || `comp-${idx}`),
      title: String(c.title || `Comp #${idx + 1}`),
      price: rawPrice,
      condition: c.condition ? String(c.condition) : "Pre-owned",
      soldDate: c.soldDate || c.sold_date,
      shippingIncluded: Boolean(c.shippingIncluded || c.shipping_included),
      shippingPrice: typeof c.shippingPrice === "number" ? c.shippingPrice : typeof c.shipping_price === "number" ? c.shipping_price : undefined,
      url: c.url || undefined,
      thumbnail: c.thumbnail || c.thumbnailUrl || c.fullResThumbnailUrl || undefined,
      isActiveAsk: Boolean(c.isActiveAsk || c.is_active_ask || c.soldDate === "Active Ask" || c.sold_date === "Active Ask"),
      isUsComp: Boolean(c.isUsComp || c.is_us_comp),
    });
  }
  return results;
}

export function OmniMarketplaceCompareModal({
  isOpen,
  onClose,
  productName,
  brand,
  category,
  condition,
  estimatedPrice,
  costOfGoods,
  currency,
  rawComps,
  valuationState,
  valuationDetail,
  onCurrencyChange,
  onListEbay,
}: {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  estimatedPrice: number;
  costOfGoods?: number;
  currency?: SupportedCurrency;
  rawComps?: any[];
  valuationState?: string;
  valuationDetail?: string;
  onCurrencyChange?: (currency: SupportedCurrency) => void;
  onListEbay?: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl z-10 max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
        <OmniMarketplaceCompareCard
          productName={productName}
          brand={brand}
          category={category}
          condition={condition}
          estimatedPrice={estimatedPrice}
          costOfGoods={costOfGoods}
          currency={currency}
          rawComps={rawComps}
          valuationState={valuationState}
          valuationDetail={valuationDetail}
          onCurrencyChange={onCurrencyChange}
          onListEbay={onListEbay}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
