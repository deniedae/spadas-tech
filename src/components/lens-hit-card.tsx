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
  TrendingUp,
} from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";
import type { DetectedHit } from "@/types/lens";
import { OmniMarketplaceCompareModal } from "@/components/omni-marketplace-compare-card";
import { checkNeedsVerification } from "@/lib/forensic-knowledge";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { sanitizeMetaText, cleanConditionText } from "@/lib/lens-utils";

interface LensHitCardProps {
  item: DetectedHit;
  isSelected: boolean;
  isSaved?: boolean;
  onSelect: (id: string) => void;
  onSaveDraft: (item: DetectedHit) => void;
  onDeepVerify: (item: DetectedHit) => void;
  onListEbay: (item: DetectedHit) => void;
  onReport: (id: string, name: string) => void;
  onViewComps?: (item: DetectedHit) => void;
}

export default function LensHitCard({
  item,
  isSelected,
  isSaved = false,
  onSelect,
  onSaveDraft,
  onDeepVerify,
  onListEbay,
  onReport,
  onViewComps,
}: LensHitCardProps) {
  const [grailExpanded, setGrailExpanded] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ── Verdict colour ──────────────────────────────────────────────────────────
  const verdictStyle =
    item.verdict === "BUY"
      ? "status-pill-emerald"
      : item.verdict === "CAUTION"
      ? "status-pill-gold"
      : "status-pill-crimson";

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
      ? "status-pill-emerald"
      : item.salesVelocity?.sell_speed === "MODERATE"
      ? "status-pill-cyan"
      : "status-pill-gold";

  // ── eBay comps label — honest about data source ────────────────────────────
  const hasRealComps = item.ebayCompsCount && item.ebayCompsCount > 0;
  const compsLabel = hasRealComps
    ? item.compsSource === "sold_comps_api"
      ? `${item.ebayCompsCount} Sold (30d)`
      : `${item.ebayCompsCount} Active eBay AU`
    : "AI Price Estimate";
  const compsStyle = hasRealComps ? "text-emerald-400" : "text-slate-500";

  // ── Sanitized Metadata Attributes (Completely hide unpopulated payload fields) ──
  const validBrand = sanitizeMetaText(item.brand);
  const validCategory = sanitizeMetaText(item.category);
  const validCondition = sanitizeMetaText(item.condition);

  // ── Intelligent AI Verification Triage ────────────────────────────────────
  const verificationReq = checkNeedsVerification({
    name: item.name,
    brand: validBrand || undefined,
    category: validCategory || undefined,
    estimatedValue: item.estimatedValue,
  });

  return (
    <div
      onClick={() => {
        triggerTactileHaptic("selection");
        onSelect(item.id);
      }}
      className={`relative w-full min-w-0 box-border overflow-hidden cursor-pointer transition-all duration-200 rounded-xl p-3.5 space-y-2.5 comp-row-glide ${
        isSelected
          ? "border border-emerald-500/50 bg-[#121820]"
          : "bg-[#0F1117] border border-white/[0.08] hover:border-white/[0.14]"
      }`}
    >
      {/* ── Row 1: Name + Verdict ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {
              triggerTactileHaptic("selection");
              onSelect(item.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 mt-0.5 rounded border-white/20 bg-[#161822] text-emerald-500 focus:ring-emerald-400 cursor-pointer shrink-0 accent-emerald-500"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                {item.isGrail && (
                  <Trophy className="h-3 w-3 text-amber-400 inline mr-1 shrink-0" />
                )}
                {item.name}
              </h4>
              {isSaved && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded shrink-0">
                  ✓ In Haul
                </span>
              )}
            </div>

            {/* Visual Identification Badges */}
            {(validBrand || validCategory || validCondition) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono">
                {validBrand && (
                  <span className="inline-flex items-center text-[9px] font-medium bg-[#161822] border border-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded">
                    {validBrand}
                  </span>
                )}
                {validCategory && (
                  <span className="inline-flex items-center text-[9px] font-medium bg-white/[0.04] text-zinc-400 px-1.5 py-0.5 rounded border border-white/[0.06]">
                    {validCategory}
                  </span>
                )}
                {validCondition && (
                  <span className="inline-flex items-center text-[9px] font-medium text-zinc-500">
                    • {validCondition}
                  </span>
                )}
              </div>
            )}

            {/* Verification Requirement Alert */}
            {verificationReq.needsVerification && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[9px] font-medium text-purple-300 w-fit">
                <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" />
                <span>{verificationReq.reason}</span>
              </div>
            )}

            {/* OCR Evidence Snippet */}
            {item.visualReasoning?.visible_text_detected && item.visualReasoning.visible_text_detected.length > 0 && (
              <p className="text-[9px] text-zinc-400 truncate mt-0.5 font-mono">
                OCR: {item.visualReasoning.visible_text_detected.slice(0, 3).join(" • ")}
              </p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${verdictStyle}`}
        >
          {item.verdict}
        </span>
      </div>

      {/* ── Row 2: Dominant Profit + Secondary Stats ──────────────────────── */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <span>Net Profit</span>
            {item.copVerdict && (
              <span className={
                item.copVerdict === "MUST_COP" || item.copVerdict === "QUICK_FLIP"
                  ? "badge-verdict-buy"
                  : "badge-verdict-pass"
              }>
                {item.copVerdict === "MUST_COP" ? "BUY" : item.copVerdict === "QUICK_FLIP" ? "QUICK FLIP" : "PASS"}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-emerald-400 leading-none tracking-tight font-mono tabular-nums">
            +{fmtMoney(item.trueNetProfit || item.estimatedProfit)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[10px] text-zinc-400 shrink-0 font-mono">
          <span>
            Sell{" "}
            <span className="font-bold text-white tabular-nums">
              {fmtMoney(item.estimatedValue)}
            </span>
          </span>
          <span>
            Cost{" "}
            <span className="font-semibold text-zinc-300 tabular-nums">
              {fmtMoney(item.tagPrice || item.estCost)}
            </span>
          </span>
          <span>
            ROI{" "}
            <span className="font-semibold text-emerald-400 tabular-nums">
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
              <span className="opacity-75">
                · {item.salesVelocity.est_days_to_sell}
              </span>
            )}
            {item.salesVelocity?.sell_through_rate && (
              <span className="opacity-90 font-mono text-[8.5px] bg-black/20 px-1 rounded">
                {item.salesVelocity.sell_through_rate.includes("%")
                  ? item.salesVelocity.sell_through_rate
                  : `${item.salesVelocity.sell_through_rate}% STR`}
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
              triggerTactileHaptic("light");
              setGrailExpanded((v) => !v);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-black text-purple-300 cursor-pointer hover:bg-purple-950/60 transition active:scale-95"
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
            <div className="px-2.5 pb-2 pt-1.5 flex items-center justify-between text-[10px] text-zinc-300 border-t border-purple-500/20">
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
        className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("success");
              onSaveDraft(item);
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-sm ${
              isSaved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950"
            }`}
          >
            {isSaved ? "✓ In Haul" : "+ Save Find"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("medium");
              setShowCompareModal(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] active:scale-95 text-zinc-200 border border-white/[0.08] text-[10px] font-medium transition cursor-pointer"
            title="Compare The Market: Net payouts & comps on eBay, Depop, Poshmark, Mercari & FB"
          >
            <Scale className="w-3 h-3 text-zinc-400" />
            Compare
          </button>
          {verificationReq.needsVerification && (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("heavy");
                onDeepVerify(item);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 active:scale-95 text-purple-300 text-[10px] font-medium transition cursor-pointer border border-purple-500/30"
            >
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              {verificationReq.badgeLabel || "Verify"}
            </button>
          )}
          {onViewComps && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerTactileHaptic("light");
                onViewComps(item);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold transition cursor-pointer"
              title="View 3-5 verified sold comps & resale breakdown"
            >
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              Comps
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerTactileHaptic("light");
              onListEbay(item);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition cursor-pointer"
          >
            eBay List
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("warning");
            onReport(item.id, item.name);
          }}
          className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-zinc-500 hover:text-amber-400 transition cursor-pointer active:scale-95"
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
