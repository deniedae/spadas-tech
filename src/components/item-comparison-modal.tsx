"use client";

import React from "react";
import { Scale, Trophy, Sparkles, X, ShoppingBag } from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";
import { isMeaningfulMeta, cleanConditionText } from "@/lib/lens-utils";

export interface ComparisonItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  condition?: string;
  estimatedValue: number;
  estimatedProfit: number;
  salesVelocity?: {
    sell_speed: "FAST_FLIP" | "MODERATE" | "SLOW_BURNER" | string;
    est_days_to_sell: string;
    sell_through_rate: string;
  };
  futureGrail?: {
    is_future_grail: boolean;
    trend_source?: string;
    projected_roi_gain?: string;
    projected_peak_price?: number;
  };
  imageUrl?: string | null;
}

interface ItemComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ComparisonItem[];
  onListEbay?: (item: ComparisonItem) => void;
}

export default function ItemComparisonModal({
  isOpen,
  onClose,
  items,
  onListEbay,
}: ItemComparisonModalProps) {
  if (!isOpen || items.length === 0) return null;

  const totalResaleValue = items.reduce((acc, item) => acc + (item.estimatedValue || 0), 0);
  const totalProfit = items.reduce((acc, item) => acc + (item.estimatedProfit || 0), 0);
  const fastFlipsCount = items.filter(
    (item) => item.salesVelocity?.sell_speed === "FAST_FLIP"
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded bg-zinc-900 border border-zinc-800 flex flex-col p-6 text-zinc-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold text-lg">
            <Scale className="w-6 h-6" />
            <span>Side-by-Side Flip Comparison & Haul Calculator</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Haul Summary Banner */}
        <div className="p-4 rounded bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
              🛒 Total Thrifting Haul Summary ({items.length} Items Selected)
            </div>
            <div className="text-2xl font-bold text-zinc-100">
              {fmtMoney(totalProfit)}{" "}
              <span className="text-xs font-semibold text-zinc-400">Total Net Profit Potential</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-300">
            <div className="bg-zinc-800 px-3 py-1.5 rounded border border-zinc-700">
              Est. Gross Sales: <span className="text-zinc-100 font-bold">{fmtMoney(totalResaleValue)}</span>
            </div>
            <div className="bg-zinc-800 px-3 py-1.5 rounded border border-zinc-700">
              ⚡ Fast Flips: <span className="text-zinc-100 font-bold">{fastFlipsCount}/{items.length}</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isFast = item.salesVelocity?.sell_speed === "FAST_FLIP";
            const isFuture = item.futureGrail?.is_future_grail;

            return (
              <div
                key={item.id}
                className="rounded bg-zinc-900 border border-zinc-800 p-4 space-y-3 flex flex-col justify-between hover:border-zinc-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-zinc-100 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                    {isFuture && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] font-semibold shrink-0">
                        <Sparkles className="w-3 h-3 text-zinc-400" /> FUTURE GRAIL
                      </span>
                    )}
                  </div>

                  {(isMeaningfulMeta(item.brand) || isMeaningfulMeta(item.condition)) && (
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      {isMeaningfulMeta(item.brand) && (
                        <span>Brand: <strong className="text-zinc-200">{item.brand.trim()}</strong></span>
                      )}
                      {isMeaningfulMeta(item.brand) && isMeaningfulMeta(item.condition) && (
                        <span>•</span>
                      )}
                      {isMeaningfulMeta(item.condition) && (
                        <span>{cleanConditionText(item.condition, "Used - Good")}</span>
                      )}
                    </div>
                  )}

                  {/* Profit & Resale Value */}
                  <div className="p-2.5 rounded bg-zinc-800 border border-zinc-700 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-400">Resale Value:</span>
                      <span className="text-emerald-500">{fmtMoney(item.estimatedValue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-400">Net Profit:</span>
                      <span className="text-emerald-500">+{fmtMoney(item.estimatedProfit)}</span>
                    </div>
                  </div>

                  {/* Sales Velocity */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold">Flip Speed:</span>
                      <span
                        className={`font-semibold text-[10px] px-2 py-0.5 rounded border ${
                          isFast
                            ? "bg-emerald-900/30 text-emerald-400 border-emerald-900/50"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {isFast ? "⚡ FAST FLIP" : "⚖️ MODERATE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Est. Days to Sell:</span>
                      <span className="font-semibold text-zinc-200">{item.salesVelocity?.est_days_to_sell || "7-14 Days"}</span>
                    </div>
                  </div>
                </div>

                {/* Listing Action */}
                {onListEbay && (
                  <button
                    type="button"
                    onClick={() => onListEbay(item)}
                    className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded text-xs transition cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>List on eBay</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded text-xs transition cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
