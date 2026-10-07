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
      ? "Fast flip"
      : item.salesVelocity?.sell_speed === "MODERATE"
      ? "Moderate"
      : item.salesVelocity
      ? "Slow burn"
      : null;

  const speedStyle =
    item.salesVelocity?.sell_speed === "FAST_FLIP"
      ? "bg-zinc-800 text-emerald-400 border-zinc-700"
      : item.salesVelocity?.sell_speed === "MODERATE"
      ? "bg-zinc-800 text-zinc-300 border-zinc-700"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";

  // ── eBay comps label — honest about data source ────────────────────────────
  const hasSoldComps = !item.isActiveAskOnly && !item.noMarketData && Boolean(item.ebayCompsCount && item.ebayCompsCount > 0);
  const hasActiveAsks = Boolean(item.isActiveAskOnly || (item.activeCompsCount && item.activeCompsCount > 0));
  
  let compsLabel = "Appraisal estimate";
  let compsStyle = "text-zinc-500";

  if (hasSoldComps) {
    compsLabel = `${item.ebayCompsCount} sold comps`;
    compsStyle = "text-emerald-500 font-medium";
  } else if (hasActiveAsks) {
    const count = item.activeCompsCount || item.rawComps?.length || 6;
    compsLabel = `${count} active asks`;
    compsStyle = "text-zinc-300 font-medium";
  } else if (item.noMarketData) {
    compsLabel = "0 comps on record";
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
      className={`relative w-full min-w-0 box-border overflow-hidden cursor-pointer transition-all duration-150 rounded-lg p-3.5 space-y-2.5 border group ${
        isSelected
          ? "border-emerald-500 bg-zinc-900"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
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
            className="h-4 w-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 accent-emerald-600"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">
                {item.name}
              </h4>
              {isSaved && (
                <span className="inline-flex items-center text-[10px] font-medium bg-zinc-800 text-emerald-400 border border-zinc-700 px-1.5 py-0.5 rounded shrink-0">
                  In Haul
                </span>
              )}
            </div>

            {/* Identification Badges */}
            {(validBrand || validCategory || validCondition) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {validBrand && (
                  <span className="inline-flex items-center text-[10px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                    {validBrand}
                  </span>
                )}
                {validCategory && (
                  <span className="inline-flex items-center text-[10px] font-medium bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                    {validCategory}
                  </span>
                )}
                {item.isUsMarketOnly && (
                  <span className="inline-flex items-center text-[10px] font-medium bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                    US comps
                  </span>
                )}
                {hasSoldComps && (
                  <span className="inline-flex items-center text-[10px] font-medium bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded border border-zinc-700">
                    Sold comps
                  </span>
                )}
                {hasActiveAsks && !hasSoldComps && (
                  <span className="inline-flex items-center text-[10px] font-medium bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                    Active asks
                  </span>
                )}
                {validCondition && (
                  <span className="inline-flex items-center text-[10px] text-zinc-400">
                    • {validCondition}
                  </span>
                )}
              </div>
            )}

            {/* Verification Requirement Alert */}
            {verificationReq.needsVerification && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{verificationReq.reason}</span>
              </div>
            )}

            {/* OCR Evidence Snippet */}
            {item.visualReasoning?.visible_text_detected && item.visualReasoning.visible_text_detected.length > 0 && (
              <p className="text-[10px] text-zinc-500 truncate mt-1">
                OCR: {item.visualReasoning.visible_text_detected.slice(0, 3).join(" • ")}
              </p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
            item.verdict === "BUY"
              ? "bg-emerald-950/40 text-emerald-400 border-emerald-800"
              : item.verdict === "CAUTION"
              ? "bg-zinc-800 text-zinc-300 border-zinc-700"
              : "bg-red-950/40 text-red-400 border-red-800"
          }`}
        >
          {item.verdict}
        </span>
      </div>

      {/* ── Row 2: Price > Profit > Supporting Hierarchy ─────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 pt-1">
        <div>
          <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-0.5">
            Est. net after fees
          </div>
          <div className={`text-2xl font-bold tabular-nums tracking-tight ${
            (item.trueNetProfit || item.estimatedProfit || 0) >= 0 ? "text-emerald-500" : "text-red-400"
          }`}>
            {formatAUD(item.trueNetProfit || item.estimatedProfit)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-xs text-zinc-400 shrink-0 tabular-nums">
          <div className="text-zinc-200">
            Resale <span className="font-semibold text-white">{fmtMoney(item.estimatedValue)}</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Cost {fmtMoney(item.tagPrice || item.estCost)} · <span className="text-emerald-500 font-medium">+{item.roiPercentage || item.estRoi}% ROI</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Speed badge + Comps label ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {speedLabel && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${speedStyle}`}>
            <span>{speedLabel}</span>
            {item.salesVelocity?.est_days_to_sell && (
              <span className="text-zinc-500">· {item.salesVelocity.est_days_to_sell}</span>
            )}
            {item.salesVelocity?.sell_through_rate && (
              <span className="text-zinc-400">
                · {item.salesVelocity.sell_through_rate.includes("%")
                  ? item.salesVelocity.sell_through_rate
                  : `${item.salesVelocity.sell_through_rate}% sold`}
              </span>
            )}
          </span>
        )}
        <span className={`text-[11px] ml-auto tabular-nums ${compsStyle}`}>
          {compsLabel}
        </span>
      </div>

      {/* ── Row 4: Actions (Clear View Comps Primary CTA) ────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {onViewComps && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerTactileHaptic("light");
                onViewComps(item);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
              title="View comps and fee breakdown"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>View comps</span>
            </button>
          )}
          <button
            type="button"
            disabled={isSaved}
            onClick={() => {
              if (isSaved) return;
              triggerTactileHaptic("success");
              onSaveDraft(item);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
              isSaved
                ? "bg-zinc-800 text-emerald-400 border border-zinc-700 cursor-not-allowed"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer"
            }`}
          >
            {isSaved ? "Saved" : "+ Haul"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("medium");
              setShowCompareModal(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium transition cursor-pointer"
            title="Compare net payouts across marketplaces"
          >
            <Scale className="w-3.5 h-3.5 text-zinc-400" />
            <span>Compare</span>
          </button>
          {verificationReq.needsVerification && (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("heavy");
                onDeepVerify(item);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer border border-zinc-700"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>{verificationReq.badgeLabel || "Verify"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerTactileHaptic("light");
              onListEbay(item);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium transition cursor-pointer"
          >
            <span>List eBay</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("warning");
            onReport(item.id, item.name);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          <ShieldAlert className="h-3.5 h-3.5" />
          <span>Report</span>
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
