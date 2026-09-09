"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Store,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Truck,
  ShieldCheck,
  Copy,
  DollarSign,
  Package,
  Layers,
  Users,
} from "lucide-react";
import { LensIntelData } from "@/lib/lens-intel-engine";
import { toast } from "sonner";

export interface LensIntelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  intel: LensIntelData | null;
  isLoading?: boolean;
  onAddToHaul?: () => void;
  onViewComps?: () => void;
  currency?: string;
}

type IntelTab = "local_p2p" | "global_comps";

export const LensIntelPanel: React.FC<LensIntelPanelProps> = ({
  isOpen,
  onClose,
  intel,
  isLoading = false,
  onAddToHaul,
  onViewComps,
  currency = "AUD",
}) => {
  const [activeTab, setActiveTab] = useState<IntelTab>("local_p2p");
  const [copiedHook, setCopiedHook] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fmtMoney = (val: number) => {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
    return `${symbol}${Math.round(val)}`;
  };

  const handleCopyListingHook = (text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedHook(true);
    toast.success("Copied Marketplace listing hook!");
    setTimeout(() => setCopiedHook(false), 2200);
  };

  const p2p = intel?.marketplaceIntelligence;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-950 border border-cyan-500/40 p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 space-y-4 animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                <Zap className="h-3 w-3" /> Intel Mode
              </span>
              {intel?.brand && (
                <span className="text-[10px] font-bold text-slate-300 bg-slate-850 px-2 py-0.5 rounded border border-slate-700">
                  {intel.brand}
                </span>
              )}
              {intel?.category && (
                <span className="text-[10px] font-medium text-slate-400">
                  • {intel.category}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white truncate leading-snug">
              {intel?.productName || "Analyzing Tactical Sourcing Intel..."}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Close Intel Overlay"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dual Mode Sub-Navigation Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab("local_p2p")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition cursor-pointer ${
              activeTab === "local_p2p"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
            <span>Local P2P & Cash</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("global_comps")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition cursor-pointer ${
              activeTab === "global_comps"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Global Comps (eBay)</span>
          </button>
        </div>

        {isLoading || !intel ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <p className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
              PARSING MARKETPLACE & P2P INTELLIGENCE...
            </p>
          </div>
        ) : activeTab === "local_p2p" ? (
          /* =========================================================================
             LOCAL P2P MARKETPLACE INTELLIGENCE SECTION (FB Marketplace, Gumtree AU)
             ========================================================================= */
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* 1. Local P2P Demand & Cash Liquidity Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-slate-900 border border-cyan-500/40 flex items-center justify-between gap-3 shadow-lg shadow-cyan-950/30">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                      Local P2P Liquidity
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                      {p2p?.p2pDemandLevel || "HIGH"} DEMAND
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    Primary Route: <span className="font-bold text-white">{p2p?.primaryLocalChannel || "Facebook Marketplace"}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono">
                <div className="text-[9px] uppercase font-bold text-slate-400">Cash-In-Hand</div>
                <div className="text-sm sm:text-base font-black text-emerald-400">
                  {fmtMoney(p2p?.p2pEstimatedCashPrice || intel.estimatedValue * 0.9)}
                </div>
              </div>
            </div>

            {/* 2. Physical Pickup Viability Meter (Bulky/Fragile Freight Analysis) */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Truck className="h-4 w-4 text-cyan-400" />
                  Physical Pickup Advantage
                </span>
                <span className="text-xs font-mono font-black text-cyan-300">
                  {p2p?.physicalPickupScore || 65}% Match
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, p2p?.physicalPickupScore || 65))}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {p2p?.pickupViabilityReason || "Standard item dimensions; well-suited for zero-shipping local collection."}
              </p>
            </div>

            {/* 3. Direct P2P Cash Negotiation Ladder */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  Cash Negotiation Ladder
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">0% Platform Tariffs</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Asking List Price */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      🏷️ Asking Price
                    </span>
                    <span className="text-sm sm:text-base font-black text-white font-mono">
                      {fmtMoney(p2p?.cashNegotiationBuffer.listPrice || intel.estimatedValue * 1.15)}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">Offers buffer</span>
                </div>

                {/* Target Cash Price */}
                <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-emerald-500/50 shadow-md shadow-emerald-500/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                      💵 Target Cash
                    </span>
                    <span className="text-sm sm:text-base font-black text-emerald-300 font-mono">
                      {fmtMoney(p2p?.cashNegotiationBuffer.targetCashPrice || intel.estimatedValue * 0.9)}
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-400/90 font-bold mt-1">Settle here</span>
                </div>

                {/* Floor Walk-Away */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-500/30 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 block">
                      🛑 Cash Floor
                    </span>
                    <span className="text-sm sm:text-base font-black text-rose-300 font-mono">
                      {fmtMoney(p2p?.cashNegotiationBuffer.floorPrice || intel.estimatedValue * 0.75)}
                    </span>
                  </div>
                  <span className="text-[9px] text-rose-400/80 font-bold mt-1">Walk below</span>
                </div>
              </div>
            </div>

            {/* 4. Local Channel Breakdown */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Liquidation Channels & Turnaround
              </span>

              <div className="space-y-2">
                {(p2p?.channels || []).map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-white">{ch.channel}</span>
                        <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          {ch.suitabilityScore}% match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-1">{ch.strategy}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono text-slate-400 block">Speed</span>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono">
                        {ch.estimatedDaysToCash}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Tactical Marketplace Copy & Hook */}
            {p2p?.tacticalListingHook && (
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    📋 High-Converting Listing Hook
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyListingHook(p2p.tacticalListingHook)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                  >
                    {copiedHook ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedHook ? "Copied!" : "Copy Hook"}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono select-all">
                  &ldquo;{p2p.tacticalListingHook}&rdquo;
                </p>
              </div>
            )}

            {/* 6. In-Store / P2P Safety Tip */}
            {p2p?.safetyTip && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{p2p.safetyTip}</span>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             GLOBAL COMPS & SHIPPING SECTION (eBay, Depop, Poshmark, Mercari)
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Arbitrage Verdict Banner */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                intel.arbitrageVerdict === "INSTANT_COP"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10"
                  : intel.arbitrageVerdict === "FAST_FLIP"
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : intel.arbitrageVerdict === "CAUTION_SPECULATIVE"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                    Sourcing Verdict
                  </div>
                  <div className="text-sm font-black">
                    {intel.arbitrageVerdict === "INSTANT_COP"
                      ? "👑 MUST COP — HIGH PROFIT ARBITRAGE"
                      : intel.arbitrageVerdict === "FAST_FLIP"
                      ? "⚡ FAST FLIP — HIGH LIQUIDITY"
                      : intel.arbitrageVerdict === "CAUTION_SPECULATIVE"
                      ? "🔍 CAUTION — MARGIN SPECULATION"
                      : "⛔ PASS — LOW CAPITAL EFFICIENCY"}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono">
                <div className="text-[9px] uppercase font-bold opacity-75">Net Margin</div>
                <div className="text-sm font-black text-white">
                  +{fmtMoney(intel.trueNetProfit)}
                </div>
              </div>
            </div>

            {/* Target Resale Price Strategy Matrix */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  Target Resale Strategy
                </span>
                <span className="text-[10px] text-slate-400">Tag Cost: {fmtMoney(intel.estCost)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Fast Flip */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 block">
                      ⚡ Fast Flip
                    </span>
                    <span className="text-base font-black text-white font-mono">
                      {fmtMoney(intel.recommendedSellPrice.fastFlip)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 font-mono mt-1">
                    +{fmtMoney(intel.netProfitMatrix.fastFlip)} Net
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5">2-5 Days</span>
                </div>

                {/* Balanced Comps Median */}
                <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-emerald-500/50 shadow-md shadow-emerald-500/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                      ⚖️ Comps Median
                    </span>
                    <span className="text-base font-black text-white font-mono">
                      {fmtMoney(intel.recommendedSellPrice.balanced)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-300 font-mono mt-1">
                    +{fmtMoney(intel.netProfitMatrix.balanced)} Net
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5">Recommended</span>
                </div>

                {/* Max Profit */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 block">
                      💎 Max Profit
                    </span>
                    <span className="text-base font-black text-white font-mono">
                      {fmtMoney(intel.recommendedSellPrice.maxProfit)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-purple-300 font-mono mt-1">
                    +{fmtMoney(intel.netProfitMatrix.maxProfit)} Net
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5">Patient Sell</span>
                </div>
              </div>
            </div>

            {/* Optimal Marketplace Channel */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Store className="h-4 w-4 text-cyan-400" />
                  Fastest Channel:
                  <span className="text-cyan-300 underline underline-offset-4 font-black">
                    {intel.fastestChannel.name}
                  </span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {intel.fastestChannel.commissionRate}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {intel.fastestChannel.reason}
              </p>
              <div className="text-[10px] text-slate-400 font-semibold">
                Target Buyers: <span className="text-slate-200">{intel.fastestChannel.targetAudience}</span>
              </div>
            </div>

            {/* Turnaround Velocity & Liquidity Meter */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  Sales Velocity & Liquidity
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${intel.turnaroundVelocity.badgeStyle.bg} ${intel.turnaroundVelocity.badgeStyle.text} ${intel.turnaroundVelocity.badgeStyle.border}`}>
                  {intel.turnaroundVelocity.velocityLabel}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>90-Day Sell-Through Rate (STR)</span>
                  <span className="font-bold text-white">{intel.turnaroundVelocity.sellThroughRate}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      intel.turnaroundVelocity.sellThroughRate >= 80
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                        : intel.turnaroundVelocity.sellThroughRate >= 40
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, intel.turnaroundVelocity.sellThroughRate))}%` }}
                  />
                </div>
              </div>

              {intel.turnaroundVelocity.warning && (
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-[11px] text-rose-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{intel.turnaroundVelocity.warning}</span>
                </div>
              )}
            </div>

            {/* Tactical Notes */}
            {intel.tacticalNotes && intel.tacticalNotes.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  💡 Sourcing Strategy Notes
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {intel.tacticalNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold shrink-0">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Global Action Row */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          {onAddToHaul && (
            <button
              type="button"
              onClick={() => {
                onAddToHaul();
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>+ Add Find to Haul</span>
            </button>
          )}

          {onViewComps && (
            <button
              type="button"
              onClick={() => {
                onViewComps();
                onClose();
              }}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold text-xs transition cursor-pointer active:scale-95"
            >
              <TrendingUp className="h-4 w-4" />
              <span>View Comps</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
