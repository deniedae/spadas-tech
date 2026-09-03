"use client";

import React, { useMemo } from "react";
import {
  ExternalLink,
  Crown,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  calculateOmniMarketplaceComps,
  MarketplaceComparison,
  buildMarketplaceCompUrl,
} from "@/lib/omni-marketplaces";
import { SupportedCurrency, detectGeoCurrency } from "@/app/lib/currency-routing";

interface Props {
  productName: string;
  brand?: string | null;
  estimatedPrice: number;
  costOfGoods?: number;
  currency?: SupportedCurrency;
  onClose?: () => void;
  compact?: boolean;
}

export function OmniMarketplaceCompareCard({
  productName,
  brand,
  estimatedPrice,
  costOfGoods = 0,
  currency,
  onClose,
  compact = false,
}: Props) {
  // Use passed currency or saved localStorage currency or fallback to AUD
  const activeCurrency: SupportedCurrency = useMemo(() => {
    if (currency) return currency;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spadas_selected_currency");
      if (saved && (saved === "AUD" || saved === "USD" || saved === "GBP" || saved === "EUR")) {
        return saved;
      }
    }
    return detectGeoCurrency().currency;
  }, [currency]);

  const compsData = useMemo(() => {
    return calculateOmniMarketplaceComps({
      productName,
      brand,
      basePrice: estimatedPrice,
      currency: activeCurrency,
      customCost: costOfGoods,
    });
  }, [productName, brand, estimatedPrice, costOfGoods, activeCurrency]);

  const { currencySymbol, marketplaces, bestPlatform, spread } = compsData;

  const googleShopUrl = useMemo(() => {
    return buildMarketplaceCompUrl("google_shopping", `${brand || ""} ${productName}`, activeCurrency);
  }, [brand, productName, activeCurrency]);

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
              Compare The Market
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                Omni-Comps
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-medium">
            {brand ? `${brand} · ` : ""}
            {productName}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Highlight Best Margin Banner */}
      {bestPlatform && spread.profitDifference > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-600/15 to-transparent border border-emerald-500/40 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-emerald-500/30 text-emerald-300">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300">
                Highest Payout: {bestPlatform.name}
              </div>
              <div className="text-[11px] text-slate-300">
                Earns{" "}
                <strong className="text-emerald-400 font-black">
                  +{currencySymbol}
                  {spread.profitDifference.toFixed(2)} more
                </strong>{" "}
                than lowest channel
              </div>
            </div>
          </div>
          <a
            href={bestPlatform.searchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition active:scale-95 shadow-md shadow-emerald-500/20 shrink-0"
          >
            Comps <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Marketplace Rows */}
      <div className="space-y-2.5 relative z-10">
        {marketplaces.map((m) => (
          <div
            key={m.platformId}
            className={`p-3 rounded-xl border transition-all ${
              m.isBestProfit
                ? "bg-slate-800/80 border-emerald-500/50 shadow-sm shadow-emerald-500/10"
                : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base">{m.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {m.name}
                    </span>
                    {m.isBestProfit && (
                      <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-tight">
                        Best Profit
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{m.tagline}</div>
                </div>
              </div>

              {/* Price & Payout */}
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-black text-emerald-400">
                  {currencySymbol}
                  {m.netPayout.toFixed(2)}
                  <span className="text-[10px] font-normal text-slate-400 ml-1">net</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Sale: {currencySymbol}
                  {m.estimatedSalePrice} · Fee: -{currencySymbol}
                  {m.platformFeeAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Outbound Link Bar */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-900/60">
                {m.payoutBadge}
              </span>
              <a
                href={m.searchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition hover:underline"
              >
                View Live Comps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Universal Check */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
        <span className="flex items-center gap-1 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Real-time comp deep-linking
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

/**
 * Modal Wrapper to display Compare The Market as a slide-over / popup
 */
export function OmniMarketplaceCompareModal({
  isOpen,
  onClose,
  productName,
  brand,
  estimatedPrice,
  costOfGoods,
  currency,
}: {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  brand?: string | null;
  estimatedPrice: number;
  costOfGoods?: number;
  currency?: SupportedCurrency;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">
        <OmniMarketplaceCompareCard
          productName={productName}
          brand={brand}
          estimatedPrice={estimatedPrice}
          costOfGoods={costOfGoods}
          currency={currency}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
