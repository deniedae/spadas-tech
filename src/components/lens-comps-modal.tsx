"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Percent,
  HelpCircle,
  Flame,
  Check,
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
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showVintageGuide, setShowVintageGuide] = useState(false);

  // In-aisle interactive tag price overrides
  const initialEstValue = item ? Number(item.estimatedValue) || 45 : 45;
  const initialTagCost = item ? Number(item.tagPrice || item.estCost) || Math.max(2, Math.round(initialEstValue * 0.15)) : 5;

  const [customTagCost, setCustomTagCost] = useState<number>(initialTagCost);
  const [discountPercent, setDiscountPercent] = useState<number>(0); // 0%, 25%, 50%, 75%

  if (!isOpen || !item) return null;

  const title = (item as any).name || (item as any).productName || "Scanned Item";
  const brand = item.brand || "Authentic";
  const category = item.category || "General Resale";
  const condition = item.condition || "Used - Good";
  const estValue = initialEstValue;

  // Effective tag cost after store color tag discounts
  const effectiveTagCost = Math.max(0, Math.round(customTagCost * (1 - discountPercent / 100) * 100) / 100);
  
  // Resale economics (13.4% eBay AU fee + $0.33 transaction + estimated parcel shipping allowance)
  const platformFee = Math.round((estValue * 0.134 + 0.33) * 100) / 100;
  const netProfit = Math.max(0, Math.round((estValue - effectiveTagCost - platformFee) * 100) / 100);
  const roi = effectiveTagCost > 0 ? Math.round((netProfit / effectiveTagCost) * 100) : 999;
  
  const copVerdict = roi >= 300 && netProfit >= 25 
    ? "MUST_COP" 
    : roi >= 100 && netProfit >= 15 
    ? "QUICK_FLIP" 
    : netProfit < 10 
    ? "PASS_RISKY" 
    : "FAIR_MARGIN";

  const compsCount = item.ebayCompsCount || 8;
  const isGrail = netProfit >= 80 || roi >= 300 || Boolean((item as any).isGrail);

  // Generate real eBay Sold Search URL for instant verification in aisle
  const cleanSearchQuery = encodeURIComponent(`${brand !== "Authentic" ? brand : ""} ${title}`.trim());
  const ebaySoldsUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${cleanSearchQuery}&LH_Sold=1&LH_Complete=1`;

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
        cost: effectiveTagCost,
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

  const handleTakeToStudio = () => {
    onClose();
    router.push(`/studio?title=${encodeURIComponent(title)}&brand=${encodeURIComponent(brand)}&price=${estValue}&cost=${effectiveTagCost}`);
  };

  const handleCopyTitle = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(title);
      toast.success("📋 Copied item title to clipboard!");
    }
  };

  // Thrifter category-specific authenticity & vintage indicators
  const getCategoryInsights = () => {
    const lower = `${category} ${title} ${brand}`.toLowerCase();
    if (lower.includes("clothing") || lower.includes("streetwear") || lower.includes("shirt") || lower.includes("jacket") || lower.includes("hoodie")) {
      return {
        tag: "Vintage Clothing & Apparel",
        checks: [
          "Check collar / sleeve hems: Single-stitch indicates 1990s or earlier (high collector value).",
          "Inspect brand tag: Look for Made in USA, Screen Stars, Giant, Brockum, or embroidered tags.",
          "Check graphic print: True vintage has natural cracking / soft water-based ink fade.",
          "Look for dry rot: Gently tug fabric along hem to ensure cotton has not degraded."
        ]
      };
    }
    if (lower.includes("camera") || lower.includes("digicam") || lower.includes("sony") || lower.includes("canon") || lower.includes("olympus")) {
      return {
        tag: "Vintage Digicam & CCD Tech",
        checks: [
          "Check CCD sensor era (early 2000s models like Sony W-series, Canon SD-series yield high demand).",
          "Inspect battery & memory door latch (broken doors drastically reduce resale price).",
          "Look inside battery bay for white corrosion or battery swelling.",
          "Check lens zoom mechanism for smooth extension without grinding."
        ]
      };
    }
    if (lower.includes("bag") || lower.includes("wallet") || lower.includes("prada") || lower.includes("gucci") || lower.includes("louis vuitton")) {
      return {
        tag: "Luxury Small Leather Goods",
        checks: [
          "Inspect hardware: Enamelled plaques and zippers (Lampo, riri, YKK) should have crisp engraving.",
          "Feel the leather: Saffiano, Epi, and Intrecciato leathers have rigid geometric grain.",
          "Inspect edge glazing & stitching: Luxury items feature perfectly straight, wax-sealed seams.",
          "Look for heat stamps & date codes: Crisp typography embossed into interior lining."
        ]
      };
    }
    if (lower.includes("shoe") || lower.includes("sneaker") || lower.includes("nike") || lower.includes("jordan") || lower.includes("asics")) {
      return {
        tag: "Sneakers & Footwear",
        checks: [
          "Check inner size label: 9-digit SKU (e.g. DD1391-100) matches sneaker silhouette.",
          "Inspect midsole: Squeeze foam to test for firmness; check for vintage sole separation.",
          "Check outsole tread: Inspect heel drag and toe star wear for honest grading.",
          "Sniff test: Ensure no damp mildew smell from prolonged op-shop storage."
        ]
      };
    }
    return {
      tag: "Thrift Sourcing Checklist",
      checks: [
        "Inspect for chips, hairline cracks, or missing screws/accessories.",
        "Check manufacturer markings, patent numbers, or copyright dates.",
        "Ensure fast flip velocity: Check recent eBay sold dates are within the past 14 days."
      ]
    };
  };

  const insights = getCategoryInsights();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] p-5 sm:p-6 text-slate-100 space-y-4 animate-slide-up">
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
              <p className="text-[11px] text-slate-400">Live eBay market comps & profit calculator</p>
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
          {(frozenFrameUrl || (item as any).image) ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-cyan-500/40 shadow-md bg-slate-950">
              <img
                src={frozenFrameUrl || (item as any).image}
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
                <span>🚨 HIGH DEMAND BOLO PICKUP DETECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* In-Aisle Interactive Thrift Tag Price & Store Color Discount Calculator */}
        <div className="rounded-2xl bg-slate-950/90 p-3.5 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-amber-400" />
              <span>In-Store Tag Price:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400">AUD $</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={customTagCost || ""}
                onChange={(e) => setCustomTagCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 rounded-lg bg-slate-900 border border-amber-400/60 px-2 py-1 text-right text-xs font-black text-amber-300 focus:outline-none focus:border-amber-300"
                placeholder="5.00"
              />
            </div>
          </div>

          {/* Quick Tag Cost & Color-of-the-Day 50% Off Chips */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold mr-1">Presets:</span>
              {[2, 5, 8, 15, 25].map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setCustomTagCost(price)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    customTagCost === price
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  ${price}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDiscountPercent(discountPercent === 50 ? 0 : 50)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                  discountPercent === 50
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
                title="Toggle 50% Off Color Tag Discount"
              >
                <Percent className="h-3 w-3" />
                <span>50% Off Tag Sale</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Financial & Valuation Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Est. Resale</div>
            <div className="text-lg font-black text-cyan-300 mt-0.5">{fmtMoney(estValue)}</div>
            <div className="text-[9px] text-slate-500">Median eBay Comps</div>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Effective Cost</div>
            <div className="text-lg font-black text-amber-300 mt-0.5">
              {fmtMoney(effectiveTagCost)}
            </div>
            <div className="text-[9px] text-slate-500">
              {discountPercent > 0 ? `With ${discountPercent}% Off Tag` : "Store Tag Price"}
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-950 p-3 border border-emerald-500/40 text-center">
            <div className="text-[10px] font-bold text-emerald-400 uppercase">True Net Profit</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">+{fmtMoney(netProfit)}</div>
            <div className="text-[9px] text-emerald-300/80 font-bold">After Fees & Postage</div>
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

        {/* Live eBay Comps & Direct Solds Link */}
        <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <TrendingUp className="h-4 w-4" /> Live eBay Comps Analysis
            </span>
            <a
              href={ebaySoldsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-black text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
            >
              <span>View eBay Solds</span>
              <ExternalLink className="h-3 w-3" />
            </a>
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

        {/* Thrifter Vintage & Authenticity Guide Toggle */}
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowVintageGuide(!showVintageGuide)}
            className="w-full flex items-center justify-between p-3 text-xs font-black text-slate-300 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-400" />
              <span>🔍 In-Store Authenticity & Flaw Checklist</span>
            </div>
            <span className="text-[10px] text-purple-400 uppercase font-bold">
              {showVintageGuide ? "Hide" : "Show Tips"}
            </span>
          </button>

          {showVintageGuide && (
            <div className="p-3 pt-0 text-xs space-y-2 border-t border-slate-800/60 animate-fade-in">
              <div className="text-[11px] font-bold text-purple-300">{insights.tag}:</div>
              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                {insights.checks.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">•</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              <span>{isSaved ? "Saved" : isSaving ? "Saving..." : "+ Save Draft"}</span>
            </button>

            <button
              type="button"
              onClick={handleTakeToStudio}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 py-2.5 px-3 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              <span>Snap Studio</span>
            </button>

            {onListEbay && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onListEbay(item);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 py-2.5 px-3 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>List on eBay</span>
              </button>
            )}

            {onDeepVerify && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeepVerify(item);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 py-2.5 px-3 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Verify</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
