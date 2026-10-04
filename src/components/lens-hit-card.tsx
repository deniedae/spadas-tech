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
import { fmtMoney, formatAUD } from "@/app/lib/listings";
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
  const hasSoldComps = Boolean(item.ebayCompsCount && item.ebayCompsCount > 0);
  const hasActiveAsks = Boolean(item.isActiveAskOnly || (item.activeCompsCount && item.activeCompsCount > 0));
  
  let compsLabel = "AI Price Estimate";
  let compsStyle = "text-slate-500";

  if (hasSoldComps) {
    compsLabel = `${item.ebayCompsCount} Sold eBay`;
    compsStyle = "text-emerald-400 font-bold";
  } else if (hasActiveAsks) {
    const count = item.activeCompsCount || item.rawComps?.length || 6;
    compsLabel = `${count} Live eBay Active`;
    compsStyle = "text-cyan-400 font-bold";
  } else if (item.noMarketData) {
    compsLabel = "0 Comps on Record";
    compsStyle = "text-zinc-500";
  }

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
      className={`relative w-full min-w-0 box-border overflow-hidden cursor-pointer transition-all duration-200 rounded-2xl p-4 space-y-3 shadow-md backdrop-blur-xl group ${
        isSelected
          ? "border-2 border-emerald-400 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-900/90 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
          : "bg-slate-900/70 border border-white/10 hover:border-emerald-400/40 hover:bg-slate-900/90 hover:shadow-xl"
      }`}
    >
      {/* ── Row 1: Name + Verdict ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {
              triggerTactileHaptic("selection");
              onSelect(item.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 mt-0.5 rounded border-white/20 bg-[#161822] text-emerald-500 focus:ring-emerald-400 cursor-pointer shrink-0 accent-emerald-500"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                {item.isGrail && (
                  <Trophy className="h-3.5 w-3.5 text-amber-400 inline mr-1 shrink-0 animate-happy-sparkle" />
                )}
                {item.name}
              </h4>
              {isSaved && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full shrink-0">
                  ✓ In Haul
                </span>
              )}
            </div>

            {/* Visual Identification Badges */}
            {(validBrand || validCategory || validCondition) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 font-mono">
                {validBrand && (
                  <span className="inline-flex items-center text-[10px] font-bold bg-white/[0.08] border border-white/15 text-zinc-200 px-2 py-0.5 rounded-lg">
                    {validBrand}
                  </span>
                )}
                {validCategory && (
                  <span className="inline-flex items-center text-[10px] font-medium bg-white/[0.04] text-zinc-300 px-2 py-0.5 rounded-lg border border-white/[0.08]">
                    {validCategory}
                  </span>
                )}
                {item.isUsMarketOnly && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    <span>🇺🇸</span>
                    <span>US Comps</span>
                  </span>
                )}
                {hasSoldComps && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    <span>✓</span>
                    <span>Sold Comps</span>
                  </span>
                )}
                {hasActiveAsks && !hasSoldComps && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                    <span>🏷️</span>
                    <span>Live Asks Guide</span>
                  </span>
                )}
                {validCondition && (
                  <span className="inline-flex items-center text-[10px] font-medium text-zinc-400">
                    • {validCondition}
                  </span>
                )}
              </div>
            )}

            {/* Verification Requirement Alert */}
            {verificationReq.needsVerification && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>{verificationReq.reason}</span>
              </div>
            )}

            {/* OCR Evidence Snippet */}
            {item.visualReasoning?.visible_text_detected && item.visualReasoning.visible_text_detected.length > 0 && (
              <p className="text-[10px] text-zinc-400 truncate mt-1 font-mono">
                OCR: {item.visualReasoning.visible_text_detected.slice(0, 3).join(" • ")}
              </p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-black border shrink-0 ${verdictStyle}`}
        >
          {item.verdict === "BUY" ? "🎉 BUY" : item.verdict}
        </span>
      </div>

      {/* ── Row 2: Dominant Profit + Secondary Stats ──────────────────────── */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5 font-bold">
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
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 leading-none tracking-tight font-mono tabular-nums drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
            {formatAUD(item.trueNetProfit || item.estimatedProfit)}
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
                  : `${item.salesVelocity.sell_through_rate}% sold`}
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

      <div
        className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSaved}
            onClick={() => {
              if (isSaved) return;
              triggerTactileHaptic("success");
              onSaveDraft(item);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm ${
              isSaved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 opacity-90 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:scale-95 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer"
            }`}
          >
            {isSaved ? "✓ In Haul" : "+ Add to Haul"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("medium");
              setShowCompareModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 text-zinc-100 border border-white/15 text-xs font-bold transition cursor-pointer"
            title="Compare The Market: Net payouts & comps on eBay AU, Depop AU, Gumtree & FB Marketplace"
          >
            <Scale className="w-3.5 h-3.5 text-zinc-300" />
            Compare
          </button>
          {verificationReq.needsVerification && (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("heavy");
                onDeepVerify(item);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 active:scale-95 text-purple-200 text-xs font-bold transition cursor-pointer border border-purple-500/40 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition cursor-pointer shadow-sm"
              title="View verified sold comps & resale breakdown"
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-200 border border-amber-400/40 text-xs font-bold transition cursor-pointer shadow-sm"
          >
            List on eBay
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("warning");
            onReport(item.id, item.name);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-amber-300 transition cursor-pointer active:scale-95"
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
