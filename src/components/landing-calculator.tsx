"use client";

import { useState } from "react";
import { Calculator, TrendingUp, Sparkles, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingCalculator() {
  const [cost, setCost] = useState<number>(25);
  const [estSale, setEstSale] = useState<number>(95);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(40);

  const feeRate = 0.13; // Avg 13% platform fees
  const estimatedFees = estSale * feeRate;
  const netProfitPerItem = estSale - cost - estimatedFees;
  const roi = cost > 0 ? (netProfitPerItem / cost) * 100 : 0;
  const estimatedMonthlyProfit = netProfitPerItem * monthlyVolume;

  return (
    <section className="py-16 border-t border-white/10">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-sm">
            <Calculator className="h-3.5 w-3.5" />
            Interactive ROI Calculator
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white md:text-5xl">
            Calculate your reseller profit potential
          </h2>
          <p className="mt-3 text-slate-300 text-base md:text-lg">
            See how Spadas AI helps you source higher-margin items and track your monthly net earnings.
          </p>
        </div>

        <div className="grid gap-8 rounded-3xl border border-white/15 bg-slate-900/80 p-6 md:p-10 backdrop-blur-xl md:grid-cols-2">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-medium text-slate-200 mb-2">
                <span>Average Item Sourcing Cost</span>
                <span className="font-mono text-emerald-400">${cost}</span>
              </div>
              <input
                type="range"
                min="5"
                max="250"
                step="5"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-700 accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium text-slate-200 mb-2">
                <span>Estimated Market Resale Price</span>
                <span className="font-mono text-blue-400">${estSale}</span>
              </div>
              <input
                type="range"
                min="20"
                max="800"
                step="10"
                value={estSale}
                onChange={(e) => setEstSale(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-700 accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium text-slate-200 mb-2">
                <span>Items Sourced & Sold / Month</span>
                <span className="font-mono text-purple-400">{monthlyVolume} items</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-700 accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Estimated Platform Fees (13%):</span>
                <span className="font-mono text-slate-200">${estimatedFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Sourcing Margin:</span>
                <span className="font-mono text-emerald-300">
                  {((netProfitPerItem / (estSale || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 md:p-8">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Estimated Net Profit / Item</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-white">
                    ${netProfitPerItem > 0 ? netProfitPerItem.toFixed(2) : "0.00"}
                  </span>
                  <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                    +{roi.toFixed(0)}% ROI
                  </span>
                </div>
              </div>

              <div className="border-t border-emerald-500/20 pt-6">
                <p className="text-xs uppercase tracking-wider font-semibold text-blue-400">Projected Monthly Resale Profit</p>
                <div className="mt-1 text-3xl md:text-4xl font-extrabold text-blue-300">
                  ${estimatedMonthlyProfit > 0 ? estimatedMonthlyProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  <span className="text-xs text-slate-400 font-normal block mt-1">/ month across eBay, Depop, Poshmark & Mercari</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Start Tracking Your Profits Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
