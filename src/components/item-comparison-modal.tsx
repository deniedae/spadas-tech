"use client";

import React from "react";
import { Scale, Trophy, Sparkles, X, ShoppingBag } from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
            <Scale className="w-6 h-6" />
            <span>Side-by-Side Flip Comparison & Haul Calculator</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Haul Summary Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">
              🛒 Total Thrifting Haul Summary ({items.length} Items Selected)
            </div>
            <div className="text-2xl font-black text-slate-100">
              {fmtMoney(totalProfit)}{" "}
              <span className="text-xs font-semibold text-slate-400">Total Net Profit Potential</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
            <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              Est. Gross Sales: <span className="text-emerald-400 font-extrabold">{fmtMoney(totalResaleValue)}</span>
            </div>
            <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              ⚡ Fast Flips: <span className="text-cyan-400 font-extrabold">{fastFlipsCount}/{items.length}</span>
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
                className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-100 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                    {isFuture && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black shrink-0">
                        <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" /> FUTURE GRAIL
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Brand: <strong className="text-slate-200">{item.brand || "Generic"}</strong></span>
                    <span>•</span>
                    <span>{item.condition || "Used - Good"}</span>
                  </div>

                  {/* Profit & Resale Value */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-slate-400">Resale Value:</span>
                      <span className="text-emerald-400">{fmtMoney(item.estimatedValue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-400">Net Profit:</span>
                      <span className="text-cyan-400">+{fmtMoney(item.estimatedProfit)}</span>
                    </div>
                  </div>

                  {/* Sales Velocity */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Flip Speed:</span>
                      <span
                        className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                          isFast
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        }`}
                      >
                        {isFast ? "⚡ FAST FLIP" : "⚖️ MODERATE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Est. Days to Sell:</span>
                      <span className="font-extrabold text-slate-200">{item.salesVelocity?.est_days_to_sell || "7-14 Days"}</span>
                    </div>
                  </div>
                </div>

                {/* Listing Action */}
                {onListEbay && (
                  <button
                    type="button"
                    onClick={() => onListEbay(item)}
                    className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
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
        <div className="pt-2 flex items-center justify-end border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
