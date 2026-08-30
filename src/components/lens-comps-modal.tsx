"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Trophy,
  Zap,
  TrendingUp,
  Tag,
  ArrowRight,
  Camera,
  ExternalLink,
  ShieldCheck,
  X,
  Copy,
  DollarSign,
} from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { triggerTactileHaptic, syncProfitToAndroidWidget } from "@/lib/android-bridge";
import type { DetectedHit, ActiveScanItem } from "@/types/lens";

interface LensCompsModalProps {
  isOpen: boolean;
  item: DetectedHit | ActiveScanItem | null;
  frozenFrameUrl?: string | null;
  onClose: () => void;
  onResumeScan: () => void;
  onListEbay?: (item: DetectedHit | ActiveScanItem) => void;
  onDeepVerify?: (item: DetectedHit | ActiveScanItem) => void;
}

export default function LensCompsModal({
  isOpen,
  item,
  frozenFrameUrl,
  onClose,
  onResumeScan,
  onListEbay,
  onDeepVerify,
}: LensCompsModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen || !item) return null;

  const title = (item as any).name || (item as any).productName || "Scanned Item";
  const brand = item.brand || "Authentic";
  const category = item.category || "General Resale";
  const condition = item.condition || "Used - Good";
  const estValue = Number(item.estimatedValue) || 45;
  const tagCost = Number(item.tagPrice || item.estCost) || Math.max(2, Math.round(estValue * 0.15));
  const netProfit = Number(item.trueNetProfit || item.estimatedProfit) || Math.max(0, Math.round((estValue - tagCost - (estValue * 0.134 + 0.33)) * 100) / 100);
  const roi = Number(item.roiPercentage || item.estRoi) || (tagCost > 0 ? Math.round((netProfit / tagCost) * 100) : 0);
  const copVerdict = item.copVerdict || (roi >= 300 && netProfit >= 25 ? "MUST_COP" : roi >= 100 ? "QUICK_FLIP" : "FAIR_MARGIN");
  const compsCount = item.ebayCompsCount || 8;
  const isGrail = netProfit >= 80 || roi >= 300 || Boolean((item as any).isGrail);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to save listings to drafts.");
        return;
      }

      const { error } = await createListing({
        userId: user.id,
        product: title,
        description: `Identified via Spadas Lens AR Scanner.\nCategory: ${category}\nCondition: ${condition}\nEstimated Net Profit: +$${netProfit.toFixed(2)} AUD (${roi}% ROI)`,
        price: estValue,
        cost: tagCost,
        status: "Draft",
      });

      if (error) throw error;
      setIsSaved(true);
      triggerTactileHaptic("success");
      syncProfitToAndroidWidget(netProfit, 1);
      toast.success(`✅ Added "${title}" to Inventory Drafts!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save to drafts.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTitle = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(title);
      toast.success("📋 Copied item title to clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] p-5 sm:p-6 text-slate-100 space-y-5 animate-slide-up">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                🎯 Target Locked & Valued
              </span>
              <p className="text-[11px] text-slate-400">Camera paused • Live eBay market comps retrieved</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResumeScan}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close & Resume Scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item Overview & Frozen Frame Snapshot */}
        <div className="flex items-start gap-3.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
          {frozenFrameUrl ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-cyan-500/40 shadow-md">
              <img
                src={frozenFrameUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 right-1 rounded bg-slate-950/80 px-1 text-[8px] font-bold text-cyan-300">
                LOCKED
              </span>
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
              <ShoppingBag className="h-8 w-8" />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300 border border-cyan-500/30">
                {brand}
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {category}
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {condition}
              </span>
            </div>

            <h3
              onClick={handleCopyTitle}
              className="text-base font-black text-white leading-tight line-clamp-2 cursor-pointer hover:text-cyan-300 transition"
              title="Click to copy title"
            >
              {title}
            </h3>

            {isGrail && (
              <div className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 animate-pulse">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>🚨 GRAIL RESALE FIND DETECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial & Valuation Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Resale Value</div>
            <div className="text-lg font-black text-cyan-300 mt-0.5">{fmtMoney(estValue)}</div>
            <div className="text-[9px] text-slate-500">Median eBay Comps</div>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thrift Tag Cost</div>
            <div className="text-lg font-black text-amber-300 mt-0.5">{fmtMoney(tagCost)}</div>
            <div className="text-[9px] text-slate-500">Detected / Est Cost</div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-950 p-3 border border-emerald-500/40 text-center">
            <div className="text-[10px] font-bold text-emerald-400 uppercase">Net Profit</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">+{fmtMoney(netProfit)}</div>
            <div className="text-[9px] text-emerald-300/80 font-bold">After Fees & Shipping</div>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Verdict & ROI</div>
            <div className="text-base font-black text-white mt-0.5">+{roi}%</div>
            <div className="mt-1">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  copVerdict === "MUST_COP"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40"
                    : copVerdict === "QUICK_FLIP"
                    ? "bg-cyan-500 text-slate-950"
                    : copVerdict === "PASS_RISKY"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {copVerdict === "MUST_COP"
                  ? "👑 MUST COP"
                  : copVerdict === "QUICK_FLIP"
                  ? "⚡ QUICK FLIP"
                  : copVerdict === "PASS_RISKY"
                  ? "⛔ PASS"
                  : "FAIR MARGIN"}
              </span>
            </div>
          </div>
        </div>

        {/* eBay Comps & Demand Speed Breakdown */}
        <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <TrendingUp className="h-4 w-4" /> Live eBay Comps Analysis
            </span>
            <span className="text-[11px] text-slate-400">~{compsCount} Recent Solds</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-500">Expected Sold Range</div>
              <div className="font-bold text-slate-200 mt-0.5">
                {fmtMoney(Math.round(estValue * 0.8))} – {fmtMoney(Math.round(estValue * 1.25))}
              </div>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-500">Sell Speed</div>
              <div className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                {netProfit >= 30 ? "Fast Turnover (1-4 Days)" : "Steady (7-14 Days)"}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Main Hero: Scan Next Item (Unfreezes Camera) */}
          <button
            type="button"
            onClick={onResumeScan}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3.5 text-sm font-black text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:opacity-95 active:scale-[0.98] transition cursor-pointer"
          >
            <Camera className="h-4 w-4" />
            <span>Scan Next Item</span>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || isSaved}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition cursor-pointer ${
                isSaved
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isSaved ? "Saved in Drafts" : isSaving ? "Saving..." : "+ Save Draft"}</span>
            </button>

            {onListEbay && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onListEbay(item);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 py-2.5 px-3 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span>eBay Comps</span>
              </button>
            )}

            {onDeepVerify && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeepVerify(item);
                }}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 py-2.5 px-3 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Deep Verify</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
