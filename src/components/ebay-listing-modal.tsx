"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShoppingBag,
  CheckCircle2,
  ExternalLink,
  Loader2,
  X,
  AlertCircle,
  Bookmark,
  Copy,
  Zap,
  Link2,
  Camera,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { generateEbayPrefillUrl } from "@/app/lib/marketplaces/ebay-prefill";
import { convertCurrency, SupportedCurrency } from "@/app/lib/currency-routing";

export const REGION_OPTIONS = [
  { id: "AUD", label: "eBay AU", country: "Australia", flag: "🇦🇺", code: "AUD", symbol: "$", site: "ebay.com.au" },
  { id: "USD", label: "eBay US", country: "United States", flag: "🇺🇸", code: "USD", symbol: "$", site: "ebay.com" },
  { id: "GBP", label: "eBay UK", country: "United Kingdom", flag: "🇬🇧", code: "GBP", symbol: "£", site: "ebay.co.uk" },
] as const;

export type EbayRegionCode = (typeof REGION_OPTIONS)[number]["id"];

interface EbayListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  brand?: string;
  price?: number;
  currency?: string;
  condition?: string;
  description?: string;
  imageUrls?: string[];
  activeScanImage?: string;
  isConnected?: boolean;
}

export default function EbayListingModal({
  isOpen,
  onClose,
  title: initialTitle,
  brand: initialBrand = "Authentic",
  price: initialPrice = 25,
  currency: initialCurrency,
  condition: initialCondition = "Used - Good",
  description: initialDescription = "",
  imageUrls = [],
  activeScanImage,
}: EbayListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);

  // 1. Strict Image Transmission: Cleanly inherit original scan image as primary listing photo
  const initialImagesList = useMemo(() => {
    const resolved: string[] = [];
    if (activeScanImage && typeof activeScanImage === "string" && activeScanImage.trim()) {
      resolved.push(activeScanImage.trim());
    }
    if (Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        if (typeof url === "string" && url.trim() && !resolved.includes(url.trim())) {
          resolved.push(url.trim());
        }
      }
    }
    return resolved;
  }, [activeScanImage, imageUrls]);

  const [images, setImages] = useState<string[]>(initialImagesList);
  const [lastInitialImages, setLastInitialImages] = useState<string[]>(initialImagesList);

  if (initialImagesList !== lastInitialImages) {
    setLastInitialImages(initialImagesList);
    setImages(initialImagesList);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedSku, setPublishedSku] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isLiveListing, setIsLiveListing] = useState<boolean>(false);

  const [selectedCurrency, setSelectedCurrency] = useState<string>("AUD");
  const [inputTitle, setInputTitle] = useState(initialTitle.slice(0, 80));
  const [inputPrice, setInputPrice] = useState(initialPrice);
  const [inputCondition, setInputCondition] = useState(initialCondition);
  const [inputDescription, setInputDescription] = useState(
    initialDescription ||
      `Authentic ${initialBrand} ${initialTitle}.\n\n• Brand: ${initialBrand}\n• Model: ${initialTitle}\n• Material/Color: Standard finish\n• Condition: ${initialCondition}. Tested and operating as intended.\n\nPlease review all photos for exact details.`
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {

      let initialCurr = (initialCurrency || "").toUpperCase();
      if (!["AUD", "USD", "GBP"].includes(initialCurr)) {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("spadas_selected_currency");
          if (stored && ["AUD", "USD", "GBP"].includes(stored.toUpperCase())) {
            initialCurr = stored.toUpperCase();
          }
        }
      }
      const targetCurr = (initialCurr && ["AUD", "USD", "GBP"].includes(initialCurr) ? initialCurr : "AUD") as SupportedCurrency;
      setSelectedCurrency(targetCurr);
      setInputTitle((initialTitle || "").slice(0, 80));

      // Accurately convert base price to selected currency
      const rawPrice = Number(initialPrice) || 25;
      const baseCurr = (initialCurrency && ["AUD", "USD", "GBP"].includes(initialCurrency.toUpperCase())
        ? initialCurrency.toUpperCase()
        : "AUD") as SupportedCurrency;
      const convertedPrice = convertCurrency(rawPrice, baseCurr, targetCurr);
      setInputPrice(Number(convertedPrice.toFixed(2)));

      setInputCondition(initialCondition || "Used - Good");
      setInputDescription(
        initialDescription ||
          (initialTitle
            ? `Authentic ${initialBrand} ${initialTitle}.\n\n• Brand: ${initialBrand}\n• Model: ${initialTitle}\n• Material/Color: Standard finish\n• Condition: ${initialCondition || "Used - Good"}. Tested and operating as intended.\n\nPlease review all photos for exact details.`
            : "")
      );
      setError(null);
      setPublishedUrl(null);
      setPublishedSku(null);
      setIsLiveListing(false);
    }
  }, [isOpen, initialTitle, initialPrice, initialCondition, initialDescription, initialBrand, initialCurrency, activeScanImage, imageUrls]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const activeRegion = REGION_OPTIONS.find((r) => r.id === selectedCurrency) || REGION_OPTIONS[0];

  const handleRegionChange = (newCurrency: string) => {
    if (newCurrency !== selectedCurrency) {
      const currentPriceNum = Number(inputPrice) || 0;
      if (currentPriceNum > 0) {
        const converted = convertCurrency(
          currentPriceNum,
          selectedCurrency as SupportedCurrency,
          newCurrency as SupportedCurrency
        );
        setInputPrice(Number(converted.toFixed(2)));
      }
      setSelectedCurrency(newCurrency);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("spadas_selected_currency", newCurrency);
        } catch {}
      }
    }
  };

  const handleFastList = () => {
    const copyPayload = `Title: ${inputTitle}\nPrice: ${activeRegion.symbol}${Number(inputPrice).toFixed(2)} ${activeRegion.code}\nCondition: ${inputCondition}\nBrand: ${initialBrand}\n\nDescription:\n${inputDescription}`;
    navigator.clipboard.writeText(copyPayload);

    const prefillUrl = generateEbayPrefillUrl({
      title: inputTitle,
      priceAud: Number(inputPrice),
      brand: initialBrand,
      currency: activeRegion.code,
    });

    toast.success(`📋 Listing details copied! Opening ${activeRegion.label} Sell wizard...`, { duration: 4500 });
    window.open(prefillUrl, "_blank");
  };

  // Additive Multi-Photo Attachment Handler
  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loaded = 0;
    const added: string[] = [];

    fileList.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          added.push(result);
        }
        loaded++;
        if (loaded === fileList.length) {
          if (added.length > 0) {
            setImages((prev) => {
              const next = [...prev];
              added.forEach((img) => {
                if (!next.includes(img)) {
                  next.push(img);
                }
              });
              return next;
            });
            toast.success(`Attached ${added.length} additional photo angle${added.length > 1 ? "s" : ""}!`);
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.onerror = () => {
        loaded++;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveDraftLocal = async () => {
    const finalImages = images.filter((img) => typeof img === "string" && img.trim().length > 0);
    setSavingLocal(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await createListing({
          userId: user.id,
          product: inputTitle,
          price: Number(inputPrice),
          description: inputDescription,
          status: "Draft",
          image: finalImages[0] || undefined,
        });
        toast.success("💾 Saved draft to your Spadas AI Listings tab!");
        onClose();
      } else {
        toast.error("Please log in to save drafts to your account.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft.";
      toast.error(msg);
    } finally {
      setSavingLocal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Safety check to prevent empty submissions
    const finalImages = images.filter((img) => typeof img === "string" && img.trim().length > 0);
    if (finalImages.length === 0) {
      toast.warning("Please attach at least one photo for your eBay listing.", {
        id: "empty-photos-warning",
      });
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      product: inputTitle,
      brand: initialBrand,
      price: Number(inputPrice),
      currency: selectedCurrency,
      condition: inputCondition,
      description: inputDescription,
      imageUrls: finalImages, // Strict Guarantee: Primary listing photo is finalImages[0]
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/marketplaces/ebay/publish", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to publish listing to eBay.");
      }

      if (data.success) {
        setPublishedUrl(data.listingUrl || `https://www.${activeRegion.site}/sh/lst/active`);
        setPublishedSku(data.sku || null);
        setIsDemo(!!data.isDemoMode);
        setIsLiveListing(!!data.isLive);

        // Also save to Spadas AI local listings for convenience
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await createListing({
              userId: user.id,
              product: inputTitle,
              price: Number(inputPrice),
              description: inputDescription,
              status: "Active",
            });
          }
        } catch {
          // ignore local save error if published to eBay
        }

        if (data.isLive) {
          toast.success(`🚀 Live on ${activeRegion.label}! Listing published successfully.`);
        } else {
          toast.success(`📋 Draft saved in ${activeRegion.label} Seller Hub!`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Publish request failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:pb-4 flex min-h-full items-center justify-center overscroll-contain animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto text-slate-100">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm sm:text-base">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>List Item on {activeRegion.label}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {publishedUrl ? (
          /* Success Screen */
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] sm:pb-6 space-y-4 text-center">
              <div className={`w-14 h-14 ${isLiveListing ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"} rounded-full flex items-center justify-center mx-auto border`}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-100">
                  {isLiveListing
                    ? `🚀 Live on ${activeRegion.label}!`
                    : `📋 Draft Saved in ${activeRegion.label} Seller Hub!`}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {publishedSku ? (
                    <span className="font-mono text-cyan-400 block mb-1 text-[11px]">
                      SKU: {publishedSku}
                    </span>
                  ) : null}
                  {isLiveListing
                    ? `Your item has been published live and is now visible to buyers across ${activeRegion.country}.`
                    : `Your item details, price, and photos are saved in your ${activeRegion.label} Seller Hub account. Open Seller Hub drafts to review and activate it live.`}
                </p>
              </div>
            </div>

            <div className="shrink-0 p-3.5 sm:p-4 pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] border-t border-slate-800 bg-slate-900/95 backdrop-blur flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 ${isLiveListing ? "bg-emerald-500 hover:bg-emerald-400" : "bg-cyan-500 hover:bg-cyan-400"} text-slate-950 font-extrabold rounded-xl text-xs shadow-lg transition cursor-pointer w-full sm:w-auto`}
              >
                <span>{isLiveListing ? `View Live on ${activeRegion.label}` : `Open ${activeRegion.label} Drafts`}</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer w-full sm:w-auto"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Pre-filled Listing Form */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body with Nav Bar Clearance */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] sm:pb-6 space-y-4 touch-pan-y">
              {/* Target Marketplace Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Target eBay Marketplace
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                  {REGION_OPTIONS.map((region) => {
                    const isSelected = selectedCurrency === region.id;
                    return (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => handleRegionChange(region.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                      >
                        <span className="text-sm">{region.flag}</span>
                        <span className="truncate">{region.id} ({region.symbol})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick 1-Tap Fast-List Option Banner */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="text-slate-200 text-xs">
                    Zero setup needed: opens official {activeRegion.label} listing form pre-filled in {activeRegion.code}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFastList}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shrink-0 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ 1-Tap Fast-List ({activeRegion.id})</span>
                </button>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleFastList}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Open in 1-Tap Fast-List ({activeRegion.id})</span>
                    </button>
                    <a
                      href="/api/auth/ebay/connect?prompt=login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg text-xs transition cursor-pointer border border-cyan-500/30"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Connect eBay Account</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Additive Multi-Photo Attachment Row */}
              <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Listing Photos ({images.length})
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      • 1st photo is eBay primary
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Angle</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddPhotos}
                  />
                </div>

                {/* Horizontal Scrollable Thumbnail Strip */}
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {images.map((img, idx) => (
                    <div
                      key={`photo-${idx}`}
                      className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 group shadow-md"
                    >
                      <img
                        src={img}
                        alt={`Listing angle ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {idx === 0 ? (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5 pointer-events-none">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Primary</span>
                        </div>
                      ) : (
                        <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-slate-900/80 text-slate-300 text-[9px] font-mono pointer-events-none">
                          #{idx + 1}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer opacity-80 hover:opacity-100"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add Photo Button Tile */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border-2 border-dashed border-slate-700/90 hover:border-cyan-400/60 bg-slate-900/50 hover:bg-slate-800/80 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                    title="Tap to select additional photos from gallery"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-bold">Add Photo</span>
                  </button>
                </div>

                {images.length === 0 && (
                  <p className="text-[11px] text-amber-300 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>No photo attached yet. Tap &quot;Add Angle&quot; to attach photos before publishing.</span>
                  </p>
                )}
              </div>

              {/* eBay Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label htmlFor="ebay-title">eBay Item Title (Max 80 Chars)</label>
                  <span
                    className={`text-[11px] font-mono ${
                      inputTitle.length > 80 ? "text-rose-400 font-bold" : "text-slate-500"
                    }`}
                  >
                    {inputTitle.length}/80
                  </span>
                </div>
                <input
                  id="ebay-title"
                  type="text"
                  maxLength={80}
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                  required
                />
              </div>

              {/* Price & Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="ebay-price" className="text-xs font-semibold text-slate-300 block">
                    Buy It Now ({activeRegion.code})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                      {activeRegion.symbol}
                    </span>
                    <input
                      id="ebay-price"
                      type="number"
                      step="0.01"
                      min="1"
                      value={inputPrice}
                      onChange={(e) => setInputPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="ebay-condition"
                    className="text-xs font-semibold text-slate-300 block"
                  >
                    Condition
                  </label>
                  <select
                    id="ebay-condition"
                    value={inputCondition}
                    onChange={(e) => setInputCondition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="Used - Good">Used - Good</option>
                    <option value="Pre-owned - Excellent">Pre-owned - Excellent</option>
                    <option value="Brand New">Brand New</option>
                    <option value="For Parts / Repair">For Parts / Repair</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label htmlFor="ebay-description">Item Description</label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inputDescription);
                      toast.success("Description copied to clipboard!");
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-normal"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy text</span>
                  </button>
                </div>
                <textarea
                  id="ebay-description"
                  rows={3}
                  value={inputDescription}
                  onChange={(e) => setInputDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                />
              </div>

              {/* Safe padding spacer at bottom of scrollable content */}
              <div className="h-6 sm:h-2" />
            </div>

            {/* Pinned Sticky Actions Footer with Safe-Area Clearance */}
            <div className="shrink-0 p-3.5 sm:p-4 pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] border-t border-slate-800 bg-slate-900/95 backdrop-blur flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraftLocal}
                disabled={savingLocal || loading || inputTitle.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Save draft locally in your Spadas AI account under My Listings"
              >
                {savingLocal ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <Bookmark className="w-4 h-4 text-slate-400" />
                )}
                <span>Save to Spadas</span>
              </button>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || inputTitle.length === 0}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Syncing {activeRegion.label}...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Sync to {activeRegion.label}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
