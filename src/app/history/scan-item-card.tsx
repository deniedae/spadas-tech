"use client";

import { useState } from "react";
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Share2,
  Lock,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from "lucide-react";
import { DeleteScanButton } from "./delete-button";
import EbayListingModal from "@/components/ebay-listing-modal";
import CrossListModal from "@/components/cross-list-modal";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import { supabase } from "@/app/lib/supabase";

interface ScanRecord {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
  result_json: any;
  token_count: number;
  status: "completed" | "failed";
}

export function ScanItemCard({
  scan,
  onDeleted,
}: {
  scan: ScanRecord;
  onDeleted?: () => void;
}) {
  const [deleted, setDeleted] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [isEbayModalOpen, setIsEbayModalOpen] = useState(false);
  const [isCrossListOpen, setIsCrossListOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  if (deleted) return null;

  const submitRating = async (value: "up" | "down") => {
    setRating(value);
    await fetch("/api/scans/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: scan.id, rating: value }),
    }).catch(() => {});
  };

  const handleDeleted = () => {
    setDeleted(true);
    if (onDeleted) onDeleted();
  };

  const handleCrossListClick = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/stripe/status", { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      const isPro = Boolean(data?.active || data?.plan === "Pro");
      if (!isPro && scan.user_id !== "owner") {
        setIsPaywallOpen(true);
        return;
      }
    } catch {
      // Fallback
    }
    setIsCrossListOpen(true);
  };

  const res = scan.result_json || {};
  let rawTitle =
    res?.analysis?.product_name ||
    res?.detected_objects?.[0]?.product_name ||
    res?.product_name ||
    res?.item_title ||
    "";

  // Clean, institutional title parsing: strip out low-quality "N/A" and "No Image Available"
  const isInvalidTitle =
    !rawTitle ||
    rawTitle.trim().length < 2 ||
    /^(n\/a|unknown|none|no image available|[.\/_\-–—:;,\s]+)$/i.test(rawTitle.trim());

  let title = rawTitle;
  if (isInvalidTitle) {
    if (res?.analysis?.category && res.analysis.category !== "General") {
      title = `${res.analysis.category} Specimen`;
    } else if (res?.search_query) {
      title = res.search_query;
    } else {
      title = scan.status === "failed" ? "Unresolved Optical Scan" : `Telemetry Asset #${scan.id.slice(0, 6).toUpperCase()}`;
    }
  }

  let rawBrand = res?.analysis?.brand || res?.brand || "";
  if (!rawBrand || /^(n\/a|unknown|none|[.\/_\-–—:;,\s]+)$/i.test(rawBrand.trim())) {
    rawBrand = "Unbranded";
  }
  const brand = rawBrand;

  let rawCategory = res?.analysis?.category || res?.category || "";
  if (!rawCategory || /^(n\/a|unknown|none|[.\/_\-–—:;,\s]+)$/i.test(rawCategory.trim())) {
    rawCategory = "Secondary Asset";
  }
  const category = rawCategory;

  const minPrice = res?.suggested_price_min || 0;
  const maxPrice = res?.suggested_price_max || 0;
  const isFailed = scan.status === "failed";
  const formattedDate = new Date(scan.created_at).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isFailed
            ? "bg-[#140C0E] border-rose-500/30"
            : "bg-[#0A0D15]/80 border-white/[0.08] hover:border-white/[0.14] shadow-sm"
        }`}
      >
        {/* Left Side: Thumbnail & Title Telemetry */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden bg-zinc-950 border border-white/[0.08] shrink-0 flex items-center justify-center">
            {scan.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={scan.image_url}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-600">
                {isFailed ? (
                  <AlertTriangle className="h-5 w-5 text-rose-400/80" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                <span className="text-[9px] font-mono mt-0.5 text-zinc-600 uppercase">
                  {isFailed ? "Error" : "Scan"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-zinc-100 text-sm sm:text-base truncate max-w-md">
                {title}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isFailed
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isFailed ? (
                  <>
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>FAILED</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>COMPLETED</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 flex-wrap">
              <span className="font-semibold text-zinc-300">{brand}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">{category}</span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Resale Valuation & Action Suite */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06] flex-wrap">
          {!isFailed && (minPrice > 0 || maxPrice > 0) ? (
            <div className="text-left md:text-right pr-2">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Resale Valuation
              </div>
              <div className="font-mono text-emerald-400 font-bold text-base tabular-nums">
                ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)} AUD
              </div>
            </div>
          ) : (
            <div className="text-left md:text-right pr-2">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Resale Valuation
              </div>
              <div className="font-mono text-zinc-500 text-xs">
                {isFailed ? "Scan Unresolved" : "Valuation Pending"}
              </div>
            </div>
          )}

          {!isFailed && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEbayModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F97316]/15 to-amber-500/15 hover:from-[#F97316]/30 hover:to-amber-500/30 text-[#F97316] hover:text-amber-200 border border-[#F97316]/40 text-xs font-mono font-bold transition cursor-pointer"
                title="Publish directly to eBay Australia"
              >
                <ShoppingBag className="w-3 h-3 text-[#F97316]" />
                <span>EBAY</span>
              </button>

              <button
                type="button"
                onClick={handleCrossListClick}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold transition cursor-pointer"
                title="Cross-list across multiple marketplaces (PRO)"
              >
                <Share2 className="w-3 h-3" />
                <span>CROSS-LIST</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] px-1 py-0.2 rounded font-black">
                  PRO
                </span>
              </button>
            </div>
          )}

          {/* Precision Icon Feedback Rating (No Emojis) */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => submitRating("up")}
              className={`p-1 rounded transition cursor-pointer ${
                rating === "up"
                  ? "text-emerald-400 bg-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
              title="Confirm accurate identification"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => submitRating("down")}
              className={`p-1 rounded transition cursor-pointer ${
                rating === "down"
                  ? "text-rose-400 bg-rose-500/20"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
              title="Flag inaccurate identification"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <DeleteScanButton scanId={scan.id} onDeleted={handleDeleted} />
        </div>
      </div>

      <EbayListingModal
        isOpen={isEbayModalOpen}
        onClose={() => setIsEbayModalOpen(false)}
        title={title}
        brand={brand}
        price={maxPrice || minPrice || 25}
        currency={res?.currency}
        condition={res?.analysis?.condition || "Used - Good"}
        description={res?.seo_description || res?.detailed_description || ""}
        imageUrls={scan.image_url ? [scan.image_url] : []}
      />

      <CrossListModal
        isOpen={isCrossListOpen}
        onClose={() => setIsCrossListOpen(false)}
        productName={title}
        brand={brand}
        price={maxPrice || minPrice || 25}
        condition={res?.analysis?.condition || "Used - Good"}
        category={category}
        description={res?.seo_description || res?.detailed_description || ""}
      />

      <SubscriptionPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        currentScans={10}
      />
    </>
  );
}
