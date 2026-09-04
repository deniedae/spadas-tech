"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { generateEbayPrefillUrl } from "@/app/lib/marketplaces/ebay-prefill";

interface EbayListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  brand?: string;
  price?: number;
  condition?: string;
  description?: string;
  imageUrls?: string[];
  isConnected?: boolean;
}

export default function EbayListingModal({
  isOpen,
  onClose,
  title: initialTitle,
  brand: initialBrand = "Authentic",
  price: initialPrice = 25,
  condition: initialCondition = "Used - Good",
  description: initialDescription = "",
  imageUrls = [],
}: EbayListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedSku, setPublishedSku] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isLiveListing, setIsLiveListing] = useState<boolean>(false);

  const [inputTitle, setInputTitle] = useState(initialTitle.slice(0, 80));
  const [inputPrice, setInputPrice] = useState(initialPrice);
  const [inputCondition, setInputCondition] = useState(initialCondition);
  const [inputDescription, setInputDescription] = useState(
    initialDescription ||
      `Authentic ${initialBrand} ${initialTitle}. Clean pre-owned condition, tested & working.`
  );

  useEffect(() => {
    if (isOpen) {
      setInputTitle((initialTitle || "").slice(0, 80));
      setInputPrice(Number(initialPrice) || 25);
      setInputCondition(initialCondition || "Used - Good");
      setInputDescription(
        initialDescription ||
          (initialTitle ? `Authentic ${initialBrand} ${initialTitle}. Clean pre-owned condition, tested & working.` : "")
      );
      setError(null);
      setPublishedUrl(null);
      setPublishedSku(null);
      setIsLiveListing(false);
    }
  }, [isOpen, initialTitle, initialPrice, initialCondition, initialDescription, initialBrand]);

  if (!isOpen) return null;

  const handleFastList = () => {
    const copyPayload = `Title: ${inputTitle}\nPrice: $${Number(inputPrice).toFixed(2)} AUD\nCondition: ${inputCondition}\nBrand: ${initialBrand}\n\nDescription:\n${inputDescription}`;
    navigator.clipboard.writeText(copyPayload);

    const prefillUrl = generateEbayPrefillUrl({
      title: inputTitle,
      priceAud: Number(inputPrice),
      brand: initialBrand,
    });

    toast.success("📋 Listing details copied! Opening eBay AU Sell wizard...", { duration: 4500 });
    window.open(prefillUrl, "_blank");
  };

  const handleSaveDraftLocal = async () => {
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
    setLoading(true);
    setError(null);

    const payload = {
      product: inputTitle,
      brand: initialBrand,
      price: Number(inputPrice),
      condition: inputCondition,
      description: inputDescription,
      imageUrls,
    };

    try {
      const res = await fetch("/api/marketplaces/ebay/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish listing to eBay.");
      }

      if (data.success) {
        setPublishedUrl(data.listingUrl || "https://www.ebay.com.au/sh/lst/drafts");
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
          toast.success("🚀 Live on eBay AU! Listing published successfully.");
        } else {
          toast.success("📋 Saved to your eBay Seller Hub Drafts!");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <ShoppingBag className="w-5 h-5" />
            <span>List Item on eBay</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {publishedUrl ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className={`w-14 h-14 ${isLiveListing ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"} rounded-full flex items-center justify-center mx-auto border`}>
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-100">
                {isLiveListing
                  ? "🚀 Live on eBay AU!"
                  : "📋 Draft Saved in eBay Seller Hub!"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {publishedSku ? (
                  <span className="font-mono text-cyan-400 block mb-1 text-[11px]">
                    SKU: {publishedSku}
                  </span>
                ) : null}
                {isLiveListing
                  ? "Your item has been published live and is now visible to buyers across eBay Australia."
                  : "Your item details, price, and photos are saved in your eBay account. Open Seller Hub drafts to review your postage options and activate it live."}
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 ${isLiveListing ? "bg-emerald-500 hover:bg-emerald-400" : "bg-cyan-500 hover:bg-cyan-400"} text-slate-950 font-extrabold rounded-xl text-xs shadow-lg transition cursor-pointer w-full sm:w-auto`}
              >
                <span>{isLiveListing ? "View Live on eBay" : "Open eBay Seller Hub Drafts"}</span>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick 1-Tap Fast-List Option Banner */}
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="text-slate-200 text-xs">
                  Zero setup needed: opens official eBay AU listing form pre-filled.
                </span>
              </div>
              <button
                type="button"
                onClick={handleFastList}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shrink-0 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ 1-Tap Fast-List</span>
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
                    <span>Open in 1-Tap Fast-List instead</span>
                  </button>
                  <a
                    href="/api/auth/ebay/connect"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg text-xs transition cursor-pointer border border-cyan-500/30"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Connect eBay Account</span>
                  </a>
                </div>
              </div>
            )}

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
                  Buy It Now (AUD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
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

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || inputTitle.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Syncing eBay...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Sync to eBay</span>
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
