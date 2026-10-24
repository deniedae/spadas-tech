"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Sparkles, ShoppingBag, Edit3, DollarSign, Tag, Info, Copy, Zap, Scale } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { syncProfitToAndroidWidget, triggerTactileHaptic } from "@/lib/android-bridge";
import { OmniMarketplaceCompareCard, OmniMarketplaceCompareModal } from "@/components/omni-marketplace-compare-card";
import EbayListingModal from "@/components/ebay-listing-modal";
import { generateEbayPrefillUrl } from "@/app/lib/marketplaces/ebay-prefill";
import { convertCurrency, CURRENCY_CONFIGS, SupportedCurrency } from "@/app/lib/currency-routing";
import type { CopVerdict } from "@/types/lens";

export interface SpadasListingData {
  productName: string;
  brand: string;
  category: string;
  condition: string;
  size: string;
  description: string;
  weight: string;
  dimensions: string;
  priceMedian: number;
  priceMin: number;
  priceMax: number;
  currency: string;
  photos: string[];
  buyCost?: number;
  trueNetProfit?: number;
  roiPercentage?: number;
  copVerdict?: CopVerdict;
  valuationState?: "VERIFIED_SOLD_COMPS" | "ACTIVE_ASKS_ONLY" | "VERIFY_FIRST" | "NO_MARKET_DATA";
  valuationDetail?: string;
  ebayCompsCount?: number;
  activeCompsCount?: number;
  rawComps?: any[];
}

interface Props {
  data: SpadasListingData;
  onBack: () => void;
  onSaved?: () => void;
}

export function SpadasListingDetailsSheet({ data: initialData, onBack, onSaved }: Props) {
  const router = useRouter();
  const [data, setData] = useState<SpadasListingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isEbayModalOpen, setIsEbayModalOpen] = useState(false);
  const [isCompsModalOpen, setIsCompsModalOpen] = useState(false);

  const handleCurrencyChange = (newCurrency: SupportedCurrency) => {
    const currentCurr = ((data.currency || "USD").toUpperCase()) as SupportedCurrency;
    if (newCurrency === currentCurr) return;

    const newMedian = Number(convertCurrency(data.priceMedian, currentCurr, newCurrency).toFixed(2));
    const newMin = Number(convertCurrency(data.priceMin, currentCurr, newCurrency).toFixed(2));
    const newMax = Number(convertCurrency(data.priceMax, currentCurr, newCurrency).toFixed(2));
    const newBuyCost = data.buyCost ? Number(convertCurrency(data.buyCost, currentCurr, newCurrency).toFixed(2)) : undefined;

    setData((prev) => ({
      ...prev,
      currency: newCurrency,
      priceMedian: newMedian,
      priceMin: newMin,
      priceMax: newMax,
      buyCost: newBuyCost,
    }));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_selected_currency", newCurrency);
      } catch {}
    }
    const symbol = CURRENCY_CONFIGS[newCurrency]?.symbol || "$";
    toast.success(`Switched to ${newCurrency} (${symbol}) · Resale price: ${symbol}${newMedian}`);
  };

  const openEditor = (field: keyof SpadasListingData, label: string) => {
    setEditingField(field);
    setEditValue(String(data[field] || ""));
  };

  const saveField = () => {
    if (!editingField) return;
    setData((prev) => ({
      ...prev,
      [editingField]: editValue,
    }));
    setEditingField(null);
    toast.success("Updated field");
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      triggerTactileHaptic("tap");
      toast.success(`Copied ${label} to clipboard!`);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        toast.error("Please log in to save listing drafts.");
        router.push("/login?redirect=/listings");
        return;
      }

      const cost = Math.max(3, Math.round(data.priceMedian * 0.35));
      const res = await createListing({
        userId,
        product: data.productName,
        description: `${data.description}\n\nSize: ${data.size || "N/A"}\nCondition: ${data.condition || "Pre-owned"}\nWeight: ${data.weight || "N/A"}\nDimensions: ${data.dimensions || "N/A"}`,
        price: data.priceMedian,
        cost,
        status: "Draft",
      });

      if (res?.error) {
        toast.error(res.error.message || "Failed to save draft.");
      } else {
        triggerTactileHaptic("success");
        syncProfitToAndroidWidget(data.priceMedian - cost, 1);
        toast.success("Saved to Drafts!");
        if (onSaved) onSaved();
        else router.push("/listings");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCurrency = ((data.currency || "USD").toUpperCase()) as SupportedCurrency;
  const currConfig = CURRENCY_CONFIGS[activeCurrency] || CURRENCY_CONFIGS.USD;
  const valuationStateUi = (() => {
    switch (data.valuationState) {
      case "VERIFY_FIRST":
        return {
          label: "Verify First",
          detail: data.valuationDetail || "Secondary verification is recommended before trusting this valuation.",
          className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
        };
      case "NO_MARKET_DATA":
        return {
          label: "No Market Data",
          detail: data.valuationDetail || "No solid sold evidence was found. Treat this value as guidance only.",
          className: "bg-zinc-800 border-zinc-700 text-zinc-300",
        };
      case "ACTIVE_ASKS_ONLY":
        return {
          label: "Active Asks Only",
          detail: data.valuationDetail || "This value is grounded by current asking prices, not completed sold listings.",
          className: "bg-violet-500/10 border-violet-500/30 text-violet-300",
        };
      default:
        return {
          label: "Verified Sold Comps",
          detail: data.valuationDetail || "This value is grounded by recent sold listings after filtering and cleanup.",
          className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        };
    }
  })();

  const handleCopyCrossList = () => {
    const formattedText = `🏷️ ${data.productName}\n💰 Price: ${currConfig.symbol}${data.priceMedian.toFixed(2)} ${activeCurrency}\n📏 Size: ${data.size || "One Size"}\n✨ Condition: ${data.condition || "Used - Good"}\n\n${data.description}\n\n📦 Fast dispatch. Message with any questions!`;
    navigator.clipboard.writeText(formattedText);
    toast.success("📋 Copied formatted listing for Depop & Facebook Marketplace!");
  };

  const handleFastListEbay = () => {
    triggerTactileHaptic("tap");
    setIsEbayModalOpen(true);
  };

  const handlePublishEbay = () => {
    triggerTactileHaptic("tap");
    setIsEbayModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-lg mx-auto pb-[calc(env(safe-area-inset-bottom,0px)+9rem)] sm:pb-32 animate-fade-in">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black tracking-tight text-white">Listing Details</h1>
        <div className="w-10" />
      </header>

      {/* Main Form Fields Container */}
      <div className="p-4 space-y-3">
        {/* Photo Carousel Preview */}
        {data.photos && data.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {data.photos.map((img, idx) => (
              <div
                key={idx}
                className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Item angle ${idx + 1}`} className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-300">
                  {idx === 0 ? "Main" : `#${idx + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Title / Product Name Field with SellRaze 80-Char Counter */}
        <div className="space-y-2">
          <div
            onClick={() => openEditor("productName", "Product Name")}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400">eBay Optimized Title</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    data.productName.length >= 60 && data.productName.length <= 80
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : data.productName.length > 80
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {data.productName.length}/80 chars {data.productName.length >= 60 && data.productName.length <= 80 ? "· Optimal" : ""}
                </span>
              </div>
              <p className="text-sm font-extrabold text-white line-clamp-2">{data.productName}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
          </div>

          {/* Quick Copy Chips for Cross-Posting */}
          <div className="flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={() => copyToClipboard(data.productName, "title")}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Copy className="h-3.5 w-3.5 text-cyan-400" />
              <span>Copy Title</span>
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(data.description, "description")}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Copy className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copy Description</span>
            </button>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${valuationStateUi.className}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide">{valuationStateUi.label}</span>
            <span className="text-[10px] font-mono text-slate-300">
              {typeof data.ebayCompsCount === "number" || typeof data.activeCompsCount === "number"
                ? `${data.ebayCompsCount || 0} sold · ${data.activeCompsCount || 0} active`
                : "Evidence state"}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{valuationStateUi.detail}</p>
        </div>

        {/* Resale Price Card with Transparent Profit Math */}
        {(() => {
          const sym = currConfig.symbol;
          const currentBuyCost = data.buyCost || Math.max(3, Math.round(data.priceMedian * 0.15));
          const fixedFee = activeCurrency === "GBP" ? 0.25 : activeCurrency === "USD" ? 0.30 : 0.33;
          const currentEbayFee = (data.priceMedian * 0.134) + fixedFee;
          const currentNetProfit = Math.max(0, data.priceMedian - currentBuyCost - currentEbayFee);
          const currentRoi = currentBuyCost > 0 ? Math.round((currentNetProfit / currentBuyCost) * 100) : 0;

          return (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    💰 Suggested Resale Price
                  </span>
                </div>
                {/* Direct Currency Switcher Pills in Suggested Resale Price Card */}
                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-0.5 rounded-xl">
                  {(["AUD", "USD", "GBP"] as const).map((currCode) => {
                    const isSelected = activeCurrency === currCode;
                    return (
                      <button
                        key={currCode}
                        type="button"
                        onClick={() => handleCurrencyChange(currCode)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title={`View comps in ${currCode}`}
                      >
                        <span>{currCode === "AUD" ? "🇦🇺" : currCode === "USD" ? "🇺🇸" : "🇬🇧"}</span>
                        <span>{currCode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">{sym}{data.priceMedian.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 font-bold">{activeCurrency}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {data.copVerdict && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${
                      data.copVerdict === "MUST_COP"
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                        : data.copVerdict === "QUICK_FLIP"
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-850"
                        : data.copVerdict === "VERIFY_FIRST"
                        ? "bg-zinc-850 text-zinc-300 border-zinc-700"
                        : "bg-zinc-850 text-zinc-400 border-zinc-800"
                    }`}>
                      {data.copVerdict === "MUST_COP" ? "STRONG MARGIN" : data.copVerdict === "QUICK_FLIP" ? "FAST TURN" : data.copVerdict === "VERIFY_FIRST" ? "VERIFY COMP" : "STANDARD MARGIN"}
                    </span>
                  )}
                  <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-semibold">
                    +{sym}{currentNetProfit.toFixed(2)} {activeCurrency} Net
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-zinc-400 block font-mono">
                  Range: {sym}{data.priceMin.toFixed(0)} - {sym}{data.priceMax.toFixed(0)} {activeCurrency}
                </span>
              </div>

              {/* Transparent Profit Math */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800 text-xs font-mono text-zinc-300 flex-wrap">
                <span className="bg-zinc-850 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700">
                  Target: {sym}{data.priceMedian.toFixed(2)}
                </span>
                <span className="bg-zinc-850 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700">
                  {data.buyCost ? "Cost: " : "Est Cost: "}{sym}{currentBuyCost.toFixed(2)}
                </span>
                <span className="bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800/50">
                  Net: +{sym}{currentNetProfit.toFixed(2)} ({currentRoi}% ROI)
                </span>
              </div>

              {/* Smart Pricing Selector Pills */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, priceMedian: Math.max(5, Math.round(prev.priceMin || prev.priceMedian * 0.85)) }))}
                  className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                    data.priceMedian <= data.priceMin
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md"
                      : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  Fast Flip ({sym}{Math.max(5, Math.round(data.priceMin || data.priceMedian * 0.85))})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const origBase = initialData.priceMedian;
                    const origCurr = ((initialData.currency || "USD").toUpperCase()) as SupportedCurrency;
                    const convertedMedian = convertCurrency(origBase, origCurr, activeCurrency);
                    setData(prev => ({ ...prev, priceMedian: Number(convertedMedian.toFixed(2)) }));
                  }}
                  className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                    Math.abs(data.priceMedian - convertCurrency(initialData.priceMedian, ((initialData.currency || "USD").toUpperCase()) as SupportedCurrency, activeCurrency)) < 0.5
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
                      : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  Median ({sym}{convertCurrency(initialData.priceMedian, ((initialData.currency || "USD").toUpperCase()) as SupportedCurrency, activeCurrency).toFixed(0)})
                </button>
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, priceMedian: Math.round(prev.priceMax || prev.priceMedian * 1.2) }))}
                  className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                    data.priceMedian >= data.priceMax
                      ? "bg-purple-500 text-white border-purple-400 shadow-md"
                      : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  👑 Top Dollar ({sym}{Math.round(data.priceMax || data.priceMedian * 1.2)})
                </button>
              </div>

              {/* Professional Comps & Intelligence Dialogue Trigger */}
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("selection");
                  setIsCompsModalOpen(true);
                }}
                className="w-full mt-2.5 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-between transition active:scale-95 cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span>Deep Comps &amp; Market Intelligence</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                  <span>Open Full Dialogue</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          );
        })()}

        {/* Compare The Market: Omni-Marketplace Comps & Links */}
        <OmniMarketplaceCompareCard
          productName={data.productName}
          brand={data.brand}
          category={data.category}
          condition={data.condition}
          estimatedPrice={data.priceMedian}
          costOfGoods={data.buyCost}
          currency={activeCurrency}
          rawComps={data.rawComps}
          valuationState={data.valuationState}
          valuationDetail={data.valuationDetail}
          onCurrencyChange={handleCurrencyChange}
        />

        {/* Size Card */}
        <div
          onClick={() => openEditor("size", "Size")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Size</span>
            <p className="text-sm font-bold text-white">{data.size || "One Size"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Condition Card */}
        <div
          onClick={() => openEditor("condition", "Condition")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Condition</span>
            <p className="text-sm font-bold text-emerald-400">{data.condition || "Pre-owned - Like New"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Description Card */}
        <div
          onClick={() => openEditor("description", "Description")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5 max-w-[85%]">
            <span className="text-xs font-bold text-slate-400">Description</span>
            <p className="text-xs font-medium text-slate-300 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Weight Card */}
        <div
          onClick={() => openEditor("weight", "Weight")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Weight</span>
            <p className="text-sm font-bold text-white">{data.weight || "12 oz / 340g"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Dimensions Card */}
        <div
          onClick={() => openEditor("dimensions", "Dimensions")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Dimensions</span>
            <p className="text-sm font-bold text-white">{data.dimensions || "4 x 4 x 10 in"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>
      </div>

      {/* Floating Bottom Earnings & Actions Bar (Positioned above Mobile Nav with Safe-Area Clearance) */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] md:bottom-0 inset-x-0 max-w-lg mx-auto p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] md:pb-4 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl z-[55] space-y-3 shadow-2xl">
        {/* Estimated Earning Row */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Estimated earning:</span>
            <span className="text-emerald-400 font-black text-sm">
              +{currConfig.symbol}{(data.priceMedian - Math.max(3, Math.round(data.priceMedian * 0.35))).toFixed(2)} {activeCurrency}
            </span>
          </div>
          <span className="text-white font-extrabold text-xs">
            List Price: {currConfig.symbol}{data.priceMedian.toFixed(2)}
          </span>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraft}
            className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-[11px] border border-slate-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleFastListEbay}
            className="py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>1-Tap eBay</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handlePublishEbay}
            className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[11px] shadow-[0_0_20px_rgba(37,99,235,0.5)] transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-white" />
            <span>Sync eBay</span>
          </button>
        </div>
      </div>

      {/* Inline Field Editor Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white">Edit {editingField}</h3>
            {editingField === "description" ? (
              <textarea
                rows={5}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
                {editingField === "productName" && (
                  <div className="flex items-center justify-between text-[11px] font-mono px-1">
                    <span className="text-slate-400">eBay 80-char limit</span>
                    <span
                      className={`font-bold ${
                        editValue.length >= 60 && editValue.length <= 80
                          ? "text-emerald-400"
                          : editValue.length > 80
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {editValue.length}/80 chars {editValue.length >= 60 && editValue.length <= 80 ? "(Optimal)" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveField}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs hover:bg-cyan-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Tap Professional eBay Listing Modal */}
      <EbayListingModal
        isOpen={isEbayModalOpen}
        onClose={() => setIsEbayModalOpen(false)}
        sessionId={`snap_${Date.now()}`}
        title={data.productName}
        brand={data.brand}
        price={data.priceMedian}
        currency={activeCurrency}
        condition={data.condition}
        description={data.description}
        imageUrls={data.photos}
        activeScanImage={data.photos?.[0]}
      />

      {/* Professional Full Comps Dialogue Modal */}
      <OmniMarketplaceCompareModal
        isOpen={isCompsModalOpen}
        onClose={() => setIsCompsModalOpen(false)}
        productName={data.productName}
        brand={data.brand}
        category={data.category}
        condition={data.condition}
        estimatedPrice={data.priceMedian}
        costOfGoods={data.buyCost}
        currency={activeCurrency}
        rawComps={data.rawComps}
        valuationState={data.valuationState}
        valuationDetail={data.valuationDetail}
        onCurrencyChange={handleCurrencyChange}
      />
    </div>
  );
}
