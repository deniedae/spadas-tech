"use client";

import React, { useState } from "react";
import { Copy, Check, X, Share2, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { triggerTactileHaptic } from "@/lib/android-bridge";

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
  const [activePlatform, setActivePlatform] = useState<"ebay" | "depop" | "poshmark" | "mercari" | "facebook">("depop");
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

  const poshmarkTitle = `${itemBrand} ${productName}`.slice(0, 50);
  const poshmarkDesc = `Authentic ${itemBrand} ${productName}.\nSize: One Size / See details.\nCondition: ${itemCond}.\n\nFast shipping & smoke-free home! Reasonable offers welcome.`;

  const mercariTitle = `${itemBrand} ${productName}`.slice(0, 40);
  const mercariDesc = `Authentic ${itemBrand} ${productName}.\nCondition: ${itemCond}.\n\nShips securely within 24 hours. Check photos for exact details!`;

  const fbTitle = `${itemBrand} ${productName} - ${itemCond}`;
  const fbDesc = `Authentic ${productName}.\nCondition: ${itemCond}.\n\nPrice: $${itemPrice} AUD.\nPick up available or fast dispatch with tracking across Australia.`;

  const currentTitle =
    activePlatform === "ebay"
      ? ebayTitle
      : activePlatform === "depop"
      ? depopTitle
      : activePlatform === "poshmark"
      ? poshmarkTitle
      : activePlatform === "mercari"
      ? mercariTitle
      : fbTitle;

  const currentDesc =
    activePlatform === "ebay"
      ? ebayDesc
      : activePlatform === "depop"
      ? depopDesc
      : activePlatform === "poshmark"
      ? poshmarkDesc
      : activePlatform === "mercari"
      ? mercariDesc
      : fbDesc;

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedField(label);
      triggerTactileHaptic("light");
      toast.success(`Copied ${label} for ${activePlatform.toUpperCase()}!`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCopyAllBundle = () => {
    const fullBundle = `📌 TITLE:\n${currentTitle}\n\n💰 PRICE: $${itemPrice} AUD\n\n📝 DESCRIPTION:\n${currentDesc}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(fullBundle);
      triggerTactileHaptic("success");
      toast.success(`📋 Copied complete ${activePlatform.toUpperCase()} listing package!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 p-5 sm:p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <Share2 className="w-5 h-5" />
            <span>Cross-Platform Listing Generator</span>
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
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-extrabold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActivePlatform("depop")}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activePlatform === "depop"
                ? "bg-rose-500 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Depop
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform("ebay")}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activePlatform === "ebay"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            eBay
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform("poshmark")}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activePlatform === "poshmark"
                ? "bg-rose-700 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Poshmark
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform("mercari")}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activePlatform === "mercari"
                ? "bg-blue-500 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Mercari
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform("facebook")}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activePlatform === "facebook"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            FB Market
          </button>
        </div>

        {/* 1-Tap Copy Full Bundle Button */}
        <button
          type="button"
          onClick={handleCopyAllBundle}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Copy Complete {activePlatform.toUpperCase()} Listing Package</span>
        </button>

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
            <span>Listing Description & Tags</span>
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
            rows={3}
            value={currentDesc}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-300 focus:outline-none resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <span className="text-xs font-mono text-emerald-400 font-bold">Price: ${itemPrice} AUD</span>
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
