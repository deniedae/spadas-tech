"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Sparkles, ShoppingBag, Edit3, DollarSign, Tag, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { syncProfitToAndroidWidget, triggerTactileHaptic } from "@/lib/android-bridge";
import { OmniMarketplaceCompareCard } from "@/components/omni-marketplace-compare-card";
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

  const handleCurrencyChange = (newCurrency: SupportedCurrency) => {
    const currentCurr = ((data.currency || "AUD").toUpperCase()) as SupportedCurrency;
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

  const activeCurrency = ((data.currency || "AUD").toUpperCase()) as SupportedCurrency;
  const currConfig = CURRENCY_CONFIGS[activeCurrency] || CURRENCY_CONFIGS.AUD;

  const handleCopyCrossList = () => {
    const formattedText = `🏷️ ${data.productName}\n💰 Price: ${currConfig.symbol}${data.priceMedian.toFixed(2)} ${activeCurrency}\n📏 Size: ${data.size || "One Size"}\n✨ Condition: ${data.condition || "Used - Good"}\n\n${data.description}\n\n📦 Fast dispatch. Message with any questions!`;
    navigator.clipboard.writeText(formattedText);
    toast.success("📋 Copied formatted listing for Depop & Facebook Marketplace!");
  };

  const handleFastListEbay = () => {
    const formattedDesc = `${data.description}\n\nSize: ${data.size || "N/A"}\nCondition: ${data.condition || "Pre-owned"}\nWeight: ${data.weight || "N/A"}\nDimensions: ${data.dimensions || "N/A"}`;
    const copyPayload = `Title: ${data.productName}\nPrice: ${currConfig.symbol}${data.priceMedian.toFixed(2)} ${activeCurrency}\nCondition: ${data.condition || "Used - Good"}\nBrand: ${data.brand || "Unbranded"}\n\nDescription:\n${formattedDesc}`;
    navigator.clipboard.writeText(copyPayload);

    const prefillUrl = generateEbayPrefillUrl({
      title: data.productName,
      priceAud: data.priceMedian,
      currency: activeCurrency,
      brand: data.brand,
    });

    const marketLabel = activeCurrency === "USD" ? "eBay US" : activeCurrency === "GBP" ? "eBay UK" : "eBay AU";
    toast.success(`📋 Listing details copied! Opening ${marketLabel}...`, { duration: 4000 });
    window.open(prefillUrl, "_blank");
  };

  const handlePublishEbay = async () => {
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        toast.error("Please log in to publish listings.");
        router.push("/login?redirect=/listings");
        return;
      }

      const cost = Math.max(3, Math.round(data.priceMedian * 0.35));
      await createListing({
        userId,
        product: data.productName,
        description: `${data.description}\n\nSize: ${data.size || "N/A"}\nCondition: ${data.condition || "Pre-owned"}\nWeight: ${data.weight || "N/A"}\nDimensions: ${data.dimensions || "N/A"}`,
        price: data.priceMedian,
        cost,
        status: "Active",
      });

      // 1-Tap Direct Live Publish to eBay
      const publishRes = await fetch("/api/marketplaces/ebay/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: data.productName,
          description: `${data.description}\n\nSize: ${data.size || "N/A"}\nCondition: ${data.condition || "Pre-owned"}\nWeight: ${data.weight || "N/A"}\nDimensions: ${data.dimensions || "N/A"}`,
          price: data.priceMedian,
          currency: activeCurrency,
          condition: data.condition,
          brand: data.brand,
          imageUrls: data.photos,
        }),
      }).catch(() => null);

      const pubData = await publishRes?.json().catch(() => null);
      const marketLabel = activeCurrency === "USD" ? "eBay US" : activeCurrency === "GBP" ? "eBay UK" : "eBay AU";
      const draftsUrl = activeCurrency === "USD" ? "https://www.ebay.com/sh/lst/drafts" : activeCurrency === "GBP" ? "https://www.ebay.co.uk/sh/lst/drafts" : "https://www.ebay.com.au/sh/lst/drafts";

      if (pubData?.isDemoMode) {
        toast.success(`🚀 ${pubData.message}`);
      } else if (publishRes?.ok && pubData?.success) {
        if (pubData.isLive) {
          toast.success(`🚀 Live on ${marketLabel} (${activeCurrency})! Listing published successfully.`);
        } else {
          toast.success(`📋 Draft saved in your ${marketLabel} Seller Hub (${activeCurrency})! Review shipping to activate.`, {
            duration: 6000,
            action: {
              label: "Open Seller Hub",
              onClick: () => window.open(pubData.listingUrl || draftsUrl, "_blank"),
            },
          });
        }
      } else {
        const errorMsg = pubData?.error || `Direct eBay sync failed. Opening 1-Tap Fast-List for ${marketLabel}...`;
        toast.error(errorMsg, { duration: 5000 });
        handleFastListEbay();
      }

      if (onSaved) onSaved();
      else router.push("/listings");
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish listing.");
    } finally {
      setIsSaving(false);
    }
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

        {/* Title / Product Name Field */}
        <div
          onClick={() => openEditor("productName", "Product Name")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Title</span>
            <p className="text-sm font-extrabold text-white line-clamp-1">{data.productName}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
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
                <div className="flex items-center gap-1">
                  {data.copVerdict && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      data.copVerdict === "MUST_COP"
                        ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30"
                        : data.copVerdict === "QUICK_FLIP"
                        ? "bg-cyan-500 text-slate-950 font-black"
                        : data.copVerdict === "VERIFY_FIRST"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {data.copVerdict === "MUST_COP" ? "👑 MUST COP" : data.copVerdict === "QUICK_FLIP" ? "⚡ QUICK FLIP" : data.copVerdict === "VERIFY_FIRST" ? "🔍 VERIFY FIRST" : "FAIR MARGIN"}
                    </span>
                  )}
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black">
                    +{sym}{currentNetProfit.toFixed(2)} {activeCurrency} Profit
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Range: {sym}{data.priceMin.toFixed(0)} - {sym}{data.priceMax.toFixed(0)} {activeCurrency}
                </span>
              </div>

              {/* Transparent Profit Math */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs font-bold text-slate-300 flex-wrap">
                <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
                  Sell: {sym}{data.priceMedian.toFixed(2)}
                </span>
                <span className="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  {data.buyCost ? "🏷️ Tag Buy: " : "Est Buy: "}{sym}{currentBuyCost.toFixed(2)}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Net Profit: +{sym}{currentNetProfit.toFixed(2)} ({currentRoi}% ROI)
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
                  ⚡ Fast Flip ({sym}{Math.max(5, Math.round(data.priceMin || data.priceMedian * 0.85))})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const origBase = initialData.priceMedian;
                    const origCurr = ((initialData.currency || "AUD").toUpperCase()) as SupportedCurrency;
                    const convertedMedian = convertCurrency(origBase, origCurr, activeCurrency);
                    setData(prev => ({ ...prev, priceMedian: Number(convertedMedian.toFixed(2)) }));
                  }}
                  className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                    Math.abs(data.priceMedian - convertCurrency(initialData.priceMedian, ((initialData.currency || "AUD").toUpperCase()) as SupportedCurrency, activeCurrency)) < 0.5
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
                      : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  🎯 Median ({sym}{convertCurrency(initialData.priceMedian, ((initialData.currency || "AUD").toUpperCase()) as SupportedCurrency, activeCurrency).toFixed(0)})
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
            </div>
          );
        })()}

        {/* Compare The Market: Omni-Marketplace Comps & Links */}
        <OmniMarketplaceCompareCard
          productName={data.productName}
          brand={data.brand}
          estimatedPrice={data.priceMedian}
          costOfGoods={data.buyCost}
          currency={activeCurrency}
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
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] md:bottom-0 inset-x-0 max-w-lg mx-auto p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] md:pb-4 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl z-40 space-y-3 shadow-2xl">
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
            className="py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
          >
            <span>⚡ 1-Tap eBay</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handlePublishEbay}
            className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[11px] shadow-[0_0_20px_rgba(37,99,235,0.5)] transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
          >
            <span>🚀 Sync eBay</span>
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
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
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
    </div>
  );
}
