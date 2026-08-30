"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Sparkles,
  Percent,
  ShoppingBag,
  ShieldCheck,
  ChevronRight,
  Store,
  Home,
  Tag,
  Flame,
} from "lucide-react";
import { calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { syncProfitToAndroidWidget, triggerTactileHaptic } from "@/lib/android-bridge";

export default function CalculatorPage() {
  const [buyPrice, setBuyPrice] = useState<number>(15);
  const [sellPrice, setSellPrice] = useState<number>(65);
  const [shippingCharged, setShippingCharged] = useState<number>(12);
  const [shippingActual, setShippingActual] = useState<number>(10.5);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(13.4); // eBay AU standard
  const [paymentFeeFixed, setPaymentFeeFixed] = useState<number>(0.33);

  // Calculations
  const totalRevenue = sellPrice + shippingCharged;
  const platformFee = totalRevenue * (platformFeePercent / 100) + paymentFeeFixed;
  const totalCosts = buyPrice + shippingActual + platformFee;
  const netProfit = totalRevenue - totalCosts;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const roiPercent = buyPrice > 0 ? (netProfit / buyPrice) * 100 : 0;

  const copVerdict = calculateThriftCopVerdict({
    resalePrice: sellPrice,
    customCost: buyPrice,
    platformFeeRate: platformFeePercent / 100,
    fixedFee: paymentFeeFixed,
    shippingCost: Math.max(0, shippingActual - shippingCharged),
  });

  const applyThriftPreset = (presetBuy: number, presetSell: number) => {
    setBuyPrice(presetBuy);
    setSellPrice(presetSell);
    triggerTactileHaptic("light");
    syncProfitToAndroidWidget(presetSell - presetBuy, 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
            <Calculator className="h-5 w-5 text-cyan-400" />
            <span>Reseller Profit & Cop Verdict Calculator</span>
          </h1>
          <p className="text-xs text-slate-400">eBay AU, Depop & FB Marketplace Sourcing Simulator</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Sourcing Venue Presets */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          ⚡ 1-Tap Sourcing Venue Presets
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => applyThriftPreset(4.99, 45)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500 text-xs font-bold shrink-0 transition"
          >
            🏷️ Goodwill / Salvos ($5 ➔ $45)
          </button>
          <button
            type="button"
            onClick={() => applyThriftPreset(8.5, 65)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500 text-xs font-bold shrink-0 transition"
          >
            🏬 Savers / Op Shop ($8.50 ➔ $65)
          </button>
          <button
            type="button"
            onClick={() => applyThriftPreset(2.0, 35)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500 text-xs font-bold shrink-0 transition"
          >
            🏡 Garage Sale ($2 ➔ $35)
          </button>
          <button
            type="button"
            onClick={() => applyThriftPreset(15.0, 95)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500 text-xs font-bold shrink-0 transition"
          >
            🏛️ Estate Sale ($15 ➔ $95)
          </button>
          <button
            type="button"
            onClick={() => applyThriftPreset(22.0, 85)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500 text-xs font-bold shrink-0 transition"
          >
            🛒 Retail Arbitrage ($22 ➔ $85)
          </button>
        </div>
      </div>

      {/* Main Results HUD Banner */}
      <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-amber-400" />
            {copVerdict.verdictLabel}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black border ${
              netProfit > 0
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border-red-500/30"
            }`}
          >
            {roiPercent >= 0 ? `+${roiPercent.toFixed(0)}% ROI` : `${roiPercent.toFixed(0)}% ROI`}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-4xl sm:text-5xl font-black text-white">
              ${netProfit.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-400 ml-2">AUD Net Profit</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-semibold">Margin</span>
            <span className="text-lg font-extrabold text-cyan-300">{marginPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Revenue</span>
            <span className="text-xs font-black text-white">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Platform Fees</span>
            <span className="text-xs font-black text-amber-400">-${platformFee.toFixed(2)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Purchase Cost</span>
            <span className="text-xs font-black text-slate-300">-${buyPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Preset Platform Selectors */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setPlatformFeePercent(13.4);
            setPaymentFeeFixed(0.33);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer shrink-0 ${
            platformFeePercent === 13.4
              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          🇦🇺 eBay Australia (13.4% + $0.33)
        </button>
        <button
          type="button"
          onClick={() => {
            setPlatformFeePercent(10.0);
            setPaymentFeeFixed(0.0);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer shrink-0 ${
            platformFeePercent === 10.0
              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          Depop (10.0%)
        </button>
        <button
          type="button"
          onClick={() => {
            setPlatformFeePercent(20.0);
            setPaymentFeeFixed(0.0);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer shrink-0 ${
            platformFeePercent === 20.0
              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          Poshmark (20.0%)
        </button>
        <button
          type="button"
          onClick={() => {
            setPlatformFeePercent(0.0);
            setPaymentFeeFixed(0.0);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer shrink-0 ${
            platformFeePercent === 0.0
              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          Facebook Marketplace (0% Cash)
        </button>
      </div>

      {/* Interactive Form Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Item Sell Price */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>Expected Sell Price ($ AUD)</span>
            <span className="text-cyan-400 font-extrabold">${sellPrice}</span>
          </label>
          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(Number(e.target.value) || 0)}
            className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm font-black text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Item Buy Price */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>Thrift Purchase Cost ($ AUD)</span>
            <span className="text-slate-300 font-extrabold">${buyPrice}</span>
          </label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(Number(e.target.value) || 0)}
            className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm font-black text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Shipping Charged to Buyer */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>Shipping Charged to Buyer ($ AUD)</span>
            <span className="text-slate-300 font-extrabold">${shippingCharged}</span>
          </label>
          <input
            type="number"
            value={shippingCharged}
            onChange={(e) => setShippingCharged(Number(e.target.value) || 0)}
            className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm font-black text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Actual Shipping Cost Paid */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>Actual Postage Paid (AusPost / Sendle)</span>
            <span className="text-slate-300 font-extrabold">${shippingActual}</span>
          </label>
          <input
            type="number"
            value={shippingActual}
            onChange={(e) => setShippingActual(Number(e.target.value) || 0)}
            className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm font-black text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* 1-Tap Link to Snap Studio */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/30 border border-blue-500/30 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-black text-cyan-300 uppercase tracking-wide">
            Want automatic comps & cop verdicts?
          </span>
          <p className="text-xs text-slate-300">
            Point Spadas Lens at items in store to calculate sold comps and cop verdicts in 1 second.
          </p>
        </div>
        <Link
          href="/lens"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs hover:scale-105 transition cursor-pointer flex items-center gap-1.5 shadow-lg"
        >
          <span>⚡ Open Lens</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
