"use client";

import React, { useState } from "react";
import {
  Trophy,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Scale,
} from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";
import type { DetectedHit } from "@/types/lens";
import { OmniMarketplaceCompareModal } from "@/components/omni-marketplace-compare-card";
import { checkNeedsVerification } from "@/lib/forensic-knowledge";

interface LensHitCardProps {
  item: DetectedHit;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onSaveDraft: (item: DetectedHit) => void;
  onDeepVerify: (item: DetectedHit) => void;
  onListEbay: (item: DetectedHit) => void;
  onReport: (id: string, name: string) => void;
}

export default function LensHitCard({
  item,
  isSelected,
  onSelect,
  onSaveDraft,
  onDeepVerify,
  onListEbay,
  onReport,
}: LensHitCardProps) {
  const [grailExpanded, setGrailExpanded] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ── Verdict colour ──────────────────────────────────────────────────────────
  const verdictStyle =
    item.verdict === "BUY"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : item.verdict === "CAUTION"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
      : "bg-rose-500/20 text-rose-300 border-rose-500/40";

  // ── Sales speed pill ────────────────────────────────────────────────────────
  const speedLabel =
    item.salesVelocity?.sell_speed === "FAST_FLIP"
      ? "⚡ Fast Flip"
      : item.salesVelocity?.sell_speed === "MODERATE"
      ? "⚖️ Moderate"
      : item.salesVelocity
      ? "🐢 Slow Burn"
      : null;

  const speedStyle =
    item.salesVelocity?.sell_speed === "FAST_FLIP"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : item.salesVelocity?.sell_speed === "MODERATE"
      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
      : "bg-amber-500/15 text-amber-300 border-amber-500/30";

  // ── eBay comps label — honest about data source ────────────────────────────
  const hasRealComps = item.ebayCompsCount && item.ebayCompsCount > 0;
  const compsLabel = hasRealComps
    ? item.compsSource === "sold_comps_api"
      ? `${item.ebayCompsCount} Sold (30d)`
      : `${item.ebayCompsCount} Active eBay AU`
    : "AI Price Estimate";
  const compsStyle = hasRealComps ? "text-emerald-400" : "text-slate-500";

  // ── Intelligent AI Verification Triage ────────────────────────────────────
  const verificationReq = checkNeedsVerification({
    name: item.name,
    brand: item.brand || undefined,
    category: item.category || undefined,
    estimatedValue: item.estimatedValue,
  });

  return (
    <div
      onClick={() => onSelect(item.id)}
      className={`relative w-full min-w-0 box-border overflow-hidden cursor-pointer transition-all duration-200 rounded-2xl border p-4 space-y-3 ${
        isSelected
          ? "border-emerald-500/70 bg-emerald-500/8 shadow-[0_0_20px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/50"
          : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
      }`}
    >
      {/* ── Row 1: Name + Verdict ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 cursor-pointer shrink-0 accent-emerald-500"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
              {item.isGrail && (
                <Trophy className="h-3 w-3 text-amber-400 inline mr-1 shrink-0" />
              )}
              {item.name}
            </h4>

            {/* Visual Identification Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {item.brand ? (
                <span className="inline-flex items-center text-[9px] font-extrabold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded">
                  🏷️ {item.brand}
                </span>
              ) : (
                <span className="inline-flex items-center text-[9px] font-semibold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  Generic / Unbranded
                </span>
              )}
              {item.category && (
                <span className="inline-flex items-center text-[9px] font-semibold bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded">
                  {item.category}
                </span>
              )}
              {item.condition && (
                <span className="inline-flex items-center text-[9px] font-medium text-slate-400">
                  • {item.condition}
                </span>
              )}
            </div>

            {/* AI Verification Requirement Alert (Only for items that actually need it) */}
            {verificationReq.needsVerification && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/40 text-[9px] font-extrabold text-purple-300 w-fit">
                <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" />
                <span>⚠️ {verificationReq.reason}</span>
              </div>
            )}

            {/* OCR Evidence Snippet */}
            {item.visualReasoning?.visible_text_detected && item.visualReasoning.visible_text_detected.length > 0 && (
              <p className="text-[9px] text-slate-400 truncate mt-0.5 font-mono">
                🔤 OCR: {item.visualReasoning.visible_text_detected.slice(0, 3).join(" • ")}
              </p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${verdictStyle}`}
        >
          {item.verdict}
        </span>
      </div>

      {/* ── Row 2: Dominant Profit + Secondary Stats ──────────────────────── */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
            <span>Net Profit</span>
            {item.copVerdict && (
              <span className={`px-1.5 py-0.2 rounded font-black text-[9px] ${
                item.copVerdict === "MUST_COP"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : item.copVerdict === "QUICK_FLIP"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}>
                {item.copVerdict === "MUST_COP" ? "👑 MUST COP" : item.copVerdict === "QUICK_FLIP" ? "⚡ QUICK FLIP" : "⛔ PASS"}
              </span>
            )}
          </div>
          <div className="text-3xl font-black text-emerald-400 leading-none tracking-tight">
            +{fmtMoney(item.trueNetProfit || item.estimatedProfit)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[10px] text-slate-400 shrink-0">
          <span>
            Sell{" "}
            <span className="font-bold text-cyan-300">
              {fmtMoney(item.estimatedValue)}
            </span>
          </span>
          <span>
            {item.tagPrice ? "🏷️ Tag " : "Cost "}
            <span className="font-bold text-amber-300">
              {fmtMoney(item.tagPrice || item.estCost)}
            </span>
          </span>
          <span>
            ROI{" "}
            <span className="font-bold text-emerald-300">
              {item.roiPercentage || item.estRoi}%
            </span>
          </span>
        </div>
      </div>

      {/* ── Row 3: Speed badge + Comps label ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        {speedLabel && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${speedStyle}`}
          >
            {speedLabel}
            {item.salesVelocity?.est_days_to_sell && (
              <span className="opacity-60">
                · {item.salesVelocity.est_days_to_sell}
              </span>
            )}
          </span>
        )}
        <span className={`text-[10px] font-semibold ml-auto ${compsStyle}`}>
          📊 {compsLabel}
        </span>
      </div>

      {/* ── Future Grail (collapsed by default) ───────────────────────────── */}
      {item.futureGrail?.is_future_grail && (
        <div className="rounded-xl bg-purple-950/40 border border-purple-500/30 overflow-hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setGrailExpanded((v) => !v);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-black text-purple-300 cursor-pointer hover:bg-purple-950/60 transition"
          >
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-fuchsia-400 animate-pulse" />
              🔮 Future Grail · {item.futureGrail.trend_source}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-fuchsia-300">
                {item.futureGrail.projected_roi_gain}
              </span>
              {grailExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </span>
          </button>
          {grailExpanded && (
            <div className="px-2.5 pb-2 pt-1.5 flex items-center justify-between text-[10px] text-slate-300 border-t border-purple-500/20">
              <span>
                Now: <strong>{fmtMoney(item.estimatedValue)}</strong>
              </span>
              <span className="text-emerald-400 font-extrabold">
                30d Peak:{" "}
                {fmtMoney(item.futureGrail.projected_peak_price)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSaveDraft(item)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-[10px] font-black transition cursor-pointer shadow-sm shadow-emerald-500/20"
          >
            + Save Draft
          </button>
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 text-cyan-300 border border-cyan-500/40 text-[10px] font-black transition cursor-pointer shadow-sm shadow-cyan-500/10"
            title="Compare The Market: Net payouts & comps on eBay, Depop, Poshmark, Mercari & FB"
          >
            <Scale className="w-3 h-3 text-cyan-400" />
            Compare
          </button>
          {verificationReq.needsVerification && (
            <button
              type="button"
              onClick={() => onDeepVerify(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[10px] font-black transition cursor-pointer shadow-md shadow-purple-900/30 border border-purple-400/40 animate-pulse"
            >
              <ShieldCheck className="w-3 h-3 text-white" />
              {verificationReq.badgeLabel || "Verify"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onListEbay(item)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/40 text-[10px] font-black transition cursor-pointer"
          >
            eBay List
          </button>
        </div>
        <button
          type="button"
          onClick={() => onReport(item.id, item.name)}
          className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-600 hover:text-amber-400 transition cursor-pointer"
        >
          <ShieldAlert className="h-3 w-3" />
          Report
        </button>
      </div>

      {/* ── Compare The Market Modal ────────────────────────────────────────── */}
      <OmniMarketplaceCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        productName={item.name}
        brand={item.brand}
        estimatedPrice={item.estimatedValue}
      />
    </div>
  );
}
