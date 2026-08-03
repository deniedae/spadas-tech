"use client";

import { useState } from "react";
import { Zap, Target, Gem, Clock, ArrowRight, Check } from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";

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
  const baseMin = Number(minPrice) || Math.round(baseMedian * 0.75 * 100) / 100;
  const baseMax = Number(maxPrice) || Math.round(baseMedian * 1.25 * 100) / 100;

  // 1. Quick Sell (25% below median or min price)
  const quickSellPrice = Math.max(1, Math.round(baseMedian * 0.72 * 100) / 100);

  // 2. Market Value (Median)
  const marketPrice = baseMedian;

  // 3. Top Dollar (Upper 80th percentile / 20% above median)
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
      color: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      btnColor: "bg-amber-600 hover:bg-amber-500 text-white",
      desc: "Priced ~28% under market for same-day or 48-hour quick turnaround.",
    },
    {
      id: "market" as const,
      name: "Market Value",
      badge: "Recommended",
      price: marketPrice,
      estDays: "7 – 21 Days",
      icon: Target,
      color: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      btnColor: "bg-blue-600 hover:bg-blue-500 text-white",
      desc: "Standard eBay median price. Balances maximum profit with steady turnover.",
    },
    {
      id: "top" as const,
      name: "Top Dollar",
      badge: "Max Profit",
      price: topDollarPrice,
      estDays: "21 – 45 Days",
      icon: Gem,
      color: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
      btnColor: "bg-purple-600 hover:bg-purple-500 text-white",
      desc: "Priced at upper market range for patient sellers targeting peak buyer value.",
    },
  ];

  const handleSelect = (stratId: "quick" | "market" | "top", price: number) => {
    setSelectedStrategy(stratId);
    onSelectPrice?.(price, stratId);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold">eBay Sold Pricing Strategy</h2>
          <p className="text-xs text-muted-foreground">
            Choose your selling strategy based on real eBay sold comps
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground border border-border">
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
                  ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              {isSelected && (
                <span className="absolute -top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
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
                  <h3 className="text-base font-bold">{s.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black tabular-nums">
                      ${s.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">{currency}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Est. Turnaround: <strong>{s.estDays}</strong></span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(s.id, s.price);
                }}
                className={`mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition shadow-sm ${s.btnColor}`}
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
