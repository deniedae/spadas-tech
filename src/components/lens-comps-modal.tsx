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
  RefreshCw,
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
        toast.error("Please sign in to save inventory drafts.");
        router.push("/login?redirect=/lens");
        return;
      }

      const { error } = await createListing({
        userId: user.id,
        product: title,
        description: `Sourced via Spadas Lens AR. Category: ${category}. Condition: ${condition}. True Net Profit: +$${netProfit} AUD (${roi}% ROI). Verified sold comps source: eBay AU.`,
        price: estValue,
        cost: effectiveTagCost,
        status: "Draft",
        image: frozenFrameUrl || (item as any).image || undefined,
      });

      if (error) throw error;

      setIsSaved(true);
      triggerTactileHaptic("success");
      syncProfitToAndroidWidget(netProfit, 1);
      toast.success(`✅ Saved "${title.slice(0, 24)}..." (+$${netProfit} Net Profit)!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save listing draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTitle = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(title);
      triggerTactileHaptic("light");
      toast.success("📋 Title copied to clipboard!");
    }
  };

  const handleTakeToStudio = () => {
    triggerTactileHaptic("medium");
    router.push(`/studio?title=${encodeURIComponent(title)}&price=${estValue}&cost=${effectiveTagCost}&category=${encodeURIComponent(category)}`);
  };

  const getCategoryInsights = () => {
    const lower = `${title} ${category}`.toLowerCase();
    if (lower.includes("vintage") || lower.includes("tee") || lower.includes("jacket") || lower.includes("hoodie") || lower.includes("shirt")) {
      return {
        tag: "Vintage Clothing & Y2K Authentication",
        checks: [
          "Check collar tag: Single stitch on hems indicates pre-1996 vintage USA production.",
          "Inspect graphic print: Genuine vintage has slight fine-line cracking rather than thick modern plastic vinyl.",
          "Check wash tags & RN numbers: Look for Made in USA, Mexico, or Australia vintage RN tags.",
          "Inspect armpits & collar edge for ring-around-the-collar stains or dry rot."
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden animate-slide-up">
        
        {/* ── 1. Top Fixed Header ───────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 p-3.5 sm:p-4 bg-slate-950/95 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block truncate">
                Target Locked & Valued
              </span>
              <p className="text-[10px] text-slate-400 truncate">eBay sold comps & margin calculator</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResumeScan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 text-xs font-black transition cursor-pointer active:scale-95"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Scan Next</span>
            </button>
            <button
              type="button"
              onClick={onResumeScan}
              className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 2. Scrollable Body Content (Full Unrestricted Touch Scroll) ─────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 touch-pan-y" style={{ WebkitOverflowScrolling: "touch" }}>
          {/* Item Overview & Snapshot */}
          <div className="flex items-start gap-3 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            {(frozenFrameUrl || (item as any).image) ? (
              <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-cyan-500/40 shadow-md bg-slate-950">
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
              <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
                <ShoppingBag className="h-7 w-7" />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-cyan-500/30">
                  {brand}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                  {category}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                  {condition}
                </span>
              </div>

              <h3
                onClick={handleCopyTitle}
                className="text-sm sm:text-base font-black text-white leading-tight line-clamp-2 cursor-pointer hover:text-cyan-300 transition"
                title="Click to copy title"
              >
                {title}
              </h3>

              {isGrail && (
                <div className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 animate-pulse">
                  <Trophy className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>HIGH DEMAND BOLO PICKUP DETECTED</span>
                </div>
              )}
            </div>
          </div>

          {/* In-Aisle Interactive Thrift Tag Price & Store Color Discount Calculator */}
          <div className="rounded-2xl bg-slate-950/90 p-3 border border-slate-800 space-y-2">
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

            {/* Quick Tag Cost Presets */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-bold mr-1">Presets:</span>
                {[2, 5, 8, 15, 25].map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => {
                      setCustomTagCost(price);
                      triggerTactileHaptic("light");
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                      customTagCost === price
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    ${price}
                  </button>
                ))}
              </div>

              {/* Tag Color Discount Buttons */}
              <div className="flex items-center gap-1">
                {[
                  { label: "0%", val: 0 },
                  { label: "25%", val: 25 },
                  { label: "50% Off", val: 50 },
                  { label: "75%", val: 75 },
                ].map((disc) => (
                  <button
                    key={disc.val}
                    type="button"
                    onClick={() => {
                      setDiscountPercent(disc.val);
                      triggerTactileHaptic("light");
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition cursor-pointer ${
                      discountPercent === disc.val
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {disc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card (Net Profit, Resale Price, ROI) */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3.5 border border-slate-800 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Projected Net Profit
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight flex items-baseline gap-1">
                  <span>+{fmtMoney(netProfit)}</span>
                  <span className="text-xs text-slate-400 font-bold">AUD</span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-lg ${
                    copVerdict === "MUST_COP"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10"
                      : copVerdict === "QUICK_FLIP"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-500/10"
                      : copVerdict === "FAIR_MARGIN"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/10"
                  }`}
                >
                  <Flame className="h-3 w-3" />
                  {copVerdict === "MUST_COP"
                    ? "👑 MUST COP"
                    : copVerdict === "QUICK_FLIP"
                    ? "⚡ QUICK FLIP"
                    : copVerdict === "FAIR_MARGIN"
                    ? "⚖️ FAIR MARGIN"
                    : "⛔ PASS / RISKY"}
                </span>
                <div className="text-[10px] font-black text-indigo-300 mt-0.5">
                  +{roi}% Net ROI
                </div>
              </div>
            </div>

            {/* Financial Ledger Details */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/60">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Sold Comps</span>
                <span className="text-xs font-black text-cyan-300">{fmtMoney(estValue)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/60">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Thrift Cost</span>
                <span className="text-xs font-black text-amber-300">{fmtMoney(effectiveTagCost)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/60">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">eBay Fees</span>
                <span className="text-xs font-bold text-slate-400">-{fmtMoney(platformFee)}</span>
              </div>
            </div>
          </div>

          {/* Real Live eBay Sold Listings Link */}
          <a
            href={ebaySoldsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerTactileHaptic("light")}
            className="flex items-center justify-between p-3 rounded-2xl bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                <ExternalLink className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block">View Live eBay AU Solds</span>
                <span className="text-[10px] text-cyan-400/80">30-day verified transaction comps</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* In-Aisle Inspection Checklist */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
            <button
              type="button"
              onClick={() => setShowVintageGuide(!showVintageGuide)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-purple-300 font-extrabold">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                <span>{insights.tag}</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {showVintageGuide ? "Hide Guide ▲" : "Show Checklist ▼"}
              </span>
            </button>

            {showVintageGuide && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 animate-fade-in">
                <ul className="text-[11px] text-slate-300 space-y-1.5">
                  {insights.checks.map((check, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-purple-400 font-bold shrink-0">•</span>
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Compact Sticky Bottom Action Bar (Never Blocked) ────────────── */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md space-y-2 z-20 pb-6 sm:pb-4">
          {/* Primary Action Button: Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || isSaved}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs sm:text-sm font-black text-white shadow-lg transition cursor-pointer active:scale-95 ${
              isSaved
                ? "bg-emerald-600/90 text-white border border-emerald-400/50"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-500/20"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{isSaved ? "Saved to Inventory Drafts ✓" : isSaving ? "Saving to Drafts..." : `+ Save Draft (+${fmtMoney(netProfit)} Net)`}</span>
          </button>

          {/* Secondary Quick Action Tools */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleTakeToStudio}
              className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 py-2 px-2 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              <span>Studio</span>
            </button>

            {onListEbay && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onListEbay(item);
                }}
                className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 py-2 px-2 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>eBay</span>
              </button>
            )}

            {onDeepVerify && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeepVerify(item);
                }}
                className="flex items-center justify-center gap-1 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 py-2 px-2 text-xs font-bold transition cursor-pointer active:scale-95"
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
