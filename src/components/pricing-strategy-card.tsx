"use client";

import { useState } from "react";
import { Zap, Target, Gem, Clock, ArrowRight, Check } from "lucide-react";

interface PricingStrategyCardProps {
  medianPrice: number;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  onSelectPrice?: (price: number, strategy: string) => void;
}

export default function PricingStrategyCard({
  medianPrice,
  minPrice,
  maxPrice,
  currency = "AUD",
  onSelectPrice,
}: PricingStrategyCardProps) {
  const baseMedian = Number(medianPrice) || 0;

  // 1. Quick Sell (28% below median)
  const quickSellPrice = Math.max(1, Math.round(baseMedian * 0.72 * 100) / 100);

  // 2. Market Value (Median)
  const marketPrice = baseMedian;

  // 3. Top Dollar (20% above median)
  const topDollarPrice = Math.round(baseMedian * 1.2 * 100) / 100;

  const [selectedStrategy, setSelectedStrategy] = useState<"quick" | "market" | "top">("market");

  const strategies = [
    {
      id: "quick" as const,
      name: "Quick Sell",
      badge: "Fast Cash Out",
      price: quickSellPrice,
      estDays: "1 – 2 Days",
      icon: Zap,
      color: "border-amber-500/40 bg-amber-500/15 text-amber-300",
      btnColor: "bg-amber-500 hover:bg-amber-400 text-slate-950",
      desc: "Priced ~28% under market for rapid same-day or 48-hour quick cash turnaround.",
    },
    {
      id: "market" as const,
      name: "Market Value",
      badge: "Recommended",
      price: marketPrice,
      estDays: "7 – 21 Days",
      icon: Target,
      color: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
      btnColor: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-slate-950",
      desc: "Standard eBay median price. Balances maximum profit with steady turnover.",
    },
    {
      id: "top" as const,
      name: "Top Dollar",
      badge: "Max Profit",
      price: topDollarPrice,
      estDays: "21 – 45 Days",
      icon: Gem,
      color: "border-purple-500/40 bg-purple-500/15 text-purple-300",
      btnColor: "bg-purple-600 hover:bg-purple-500 text-white",
      desc: "Priced at upper market range for patient sellers targeting peak buyer value.",
    },
  ];

  const handleSelect = (stratId: "quick" | "market" | "top", price: number) => {
    setSelectedStrategy(stratId);
    onSelectPrice?.(price, stratId);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-5 text-slate-100 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
            eBay Sold Pricing Strategy
          </h2>
          <p className="text-xs text-slate-400">
            Choose your selling strategy based on real eBay completed comps
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-cyan-400 border border-slate-800">
          Currency: {currency}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {strategies.map((s) => {
          const Icon = s.icon;
          const isSelected = selectedStrategy === s.id;

          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(s.id, s.price)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(s.id, s.price);
                }
              }}
              className={`relative flex flex-col justify-between rounded-2xl border-2 p-5 text-left transition cursor-pointer ${
                isSelected
                  ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.25)] scale-[1.02]"
                  : "border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900/90"
              }`}
            >
              {isSelected && (
                <span className="absolute -top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-slate-950 font-black shadow-md">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${s.color}`}>
                    <Icon className="h-3 w-3" />
                    {s.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">{s.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white tabular-nums">
                      ${s.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">{currency}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Est. Turnaround: <strong className="text-slate-200">{s.estDays}</strong></span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(s.id, s.price);
                }}
                className={`mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-black transition shadow-md cursor-pointer ${s.btnColor}`}
              >
                <span>Use ${s.price.toFixed(2)} Price</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
