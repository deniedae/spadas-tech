"use client";

import React, { useState } from "react";
import { Copy, Check, X, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface CrossListModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  brand?: string;
  price?: number;
  condition?: string;
  category?: string;
  description?: string;
}

export default function CrossListModal({
  isOpen,
  onClose,
  productName,
  brand = "Authentic",
  price = 25,
  condition = "Used - Good",
  category = "Resale",
  description = "",
}: CrossListModalProps) {
  const [activePlatform, setActivePlatform] = useState<"ebay" | "depop" | "facebook">("depop");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const itemBrand = brand || "Authentic";
  const itemPrice = Number(price || 25);
  const itemCond = condition || "Used - Good";

  // Pre-generate platform copy packages
  const ebayTitle = `${itemBrand} ${productName}`.slice(0, 80);
  const ebayDesc = description || `Authentic ${itemBrand} ${productName}.\nCondition: ${itemCond}.\nInspected and tested. Fast dispatch from Australia with tracking.`;

  const depopTitle = `${productName.toLowerCase()} #${itemBrand.toLowerCase().replace(/\s+/g, "")} #vintage`;
  const depopHashtags = `#${itemBrand.toLowerCase().replace(/\s+/g, "")} #vintage #y2k #streetwear #thrift`;
  const depopDesc = `${productName}\nBrand: ${itemBrand}\nCondition: ${itemCond}\n\nPrice: $${itemPrice} AUD\n\n${depopHashtags}`;

  const fbTitle = `${itemBrand} ${productName} - ${itemCond}`;
  const fbDesc = `Authentic ${productName}.\nCondition: ${itemCond}.\n\nPrice: $${itemPrice} AUD.\nPick up available or fast dispatch with tracking across Australia.`;

  const currentTitle = activePlatform === "ebay" ? ebayTitle : activePlatform === "depop" ? depopTitle : fbTitle;
  const currentDesc = activePlatform === "ebay" ? ebayDesc : activePlatform === "depop" ? depopDesc : fbDesc;

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`Copied ${label} for ${activePlatform.toUpperCase()} to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <Share2 className="w-5 h-5" />
            <span>Cross-Platform Listing Copy Generator</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => setActivePlatform("depop")}
            className={`py-2 rounded-lg transition cursor-pointer ${
              activePlatform === "depop"
                ? "bg-rose-500 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Depop
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform("facebook")}
            className={`py-2 rounded-lg transition cursor-pointer ${
              activePlatform === "facebook"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            FB Market
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform("ebay")}
            className={`py-2 rounded-lg transition cursor-pointer ${
              activePlatform === "ebay"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            eBay
          </button>
        </div>

        {/* Title Copy Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Platform Title ({currentTitle.length} Chars)</span>
            <button
              type="button"
              onClick={() => handleCopy(currentTitle, "Title")}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              {copiedField === "Title" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === "Title" ? "Copied!" : "Copy Title"}</span>
            </button>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 break-words">
            {currentTitle}
          </div>
        </div>

        {/* Description Copy Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Listing Description & Hashtags</span>
            <button
              type="button"
              onClick={() => handleCopy(currentDesc, "Description")}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              {copiedField === "Description" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === "Description" ? "Copied!" : "Copy Description"}</span>
            </button>
          </div>
          <textarea
            readOnly
            rows={4}
            value={currentDesc}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-300 focus:outline-none resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <span className="text-[11px] font-mono text-emerald-400 font-bold">Price: ${itemPrice} AUD</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
