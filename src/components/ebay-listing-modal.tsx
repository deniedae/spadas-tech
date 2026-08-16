"use client";

import React, { useState } from "react";
import { ShoppingBag, CheckCircle2, ExternalLink, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  isConnected = false,
}: EbayListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);

  const [inputTitle, setInputTitle] = useState(initialTitle.slice(0, 80));
  const [inputPrice, setInputPrice] = useState(initialPrice);
  const [inputCondition, setInputCondition] = useState(initialCondition);
  const [inputDescription, setInputDescription] = useState(
    initialDescription || `Authentic ${initialBrand} ${initialTitle}. Clean pre-owned condition, tested & working.`
  );

  if (!isOpen) return null;

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
        setPublishedUrl(data.listingUrl || "https://sandbox.ebay.com/itm/SPADAS-DEMO-ITEM");
        setIsDemo(!!data.isDemoMode);
        toast.success(
          data.isDemoMode
            ? "Published to eBay Sandbox Demo!"
            : "Successfully published to eBay Seller Hub!"
        );
      }
    } catch (err: any) {
      setError(err?.message || "Publish request failed");
      toast.error(err?.message || "Failed to publish listing to eBay.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <ShoppingBag className="w-5 h-5" />
            <span>List Item on eBay</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {publishedUrl ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-100">
                {isDemo ? "Draft Created (Demo Mode)" : "Published to eBay!"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isDemo
                  ? "Item pre-filled in sandbox mode. Connect your real eBay Seller account in Settings for live Seller Hub sync."
                  : "Your item draft is now active in your eBay Seller Hub dashboard."}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition"
              >
                <span>View on eBay</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Pre-filled Listing Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isConnected && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between gap-3 text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>eBay account not linked. Publishing will create a Sandbox Demo draft.</span>
                </div>
                <a
                  href="/api/auth/ebay/connect"
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-lg text-[11px] shrink-0 transition"
                >
                  Connect eBay
                </a>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* eBay Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <label htmlFor="ebay-title">eBay Item Title (Max 80 Chars)</label>
                <span className={`text-[11px] font-mono ${inputTitle.length > 80 ? "text-rose-400 font-bold" : "text-slate-500"}`}>
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
                <label htmlFor="ebay-price" className="text-xs font-semibold text-slate-300 block">Buy It Now (AUD)</label>
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
                <label htmlFor="ebay-condition" className="text-xs font-semibold text-slate-300 block">Condition</label>
                <select
                  id="ebay-condition"
                  value={inputCondition}
                  onChange={(e) => setInputCondition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="Used - Good">Used - Good</option>
                  <option value="used_working">Used - Working</option>
                  <option value="New / Sealed">New / Sealed</option>
                  <option value="For Parts / Repair">For Parts / Repair</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label htmlFor="ebay-description" className="text-xs font-semibold text-slate-300 block">Item Description</label>
              <textarea
                id="ebay-description"
                rows={3}
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 resize-none font-sans"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || inputTitle.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing to eBay...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Publish Listing</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
