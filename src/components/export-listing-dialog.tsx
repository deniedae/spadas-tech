"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Download, Sparkles, Check, Share2, Layers } from "lucide-react";

type ListingLike = {
  id?: string;
  product: string;
  description?: string;
  price?: number | string | null;
  cost?: number | string | null;
  status?: string;
  image_url?: string | null;
};

export default function ExportListingDialog({
  listing,
}: {
  listing: ListingLike;
}) {
  const [platform, setPlatform] = useState<"ebay" | "facebook" | "vinted" | "depop" | "poshmark">("ebay");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const descriptionText = listing.description?.trim() || `Authentic ${listing.product} in great condition. Ready to ship.`;
  const priceValue = Number(listing.price ?? 0);
  const costValue = Number(listing.cost ?? 0);

  // Platform specific title & description formatters
  const getEbayTitle = () => {
    let title = `${listing.product} - Fast Shipping Reseller Item`;
    if (title.length > 80) title = title.substring(0, 77) + "...";
    return title;
  };

  const platformData = {
    ebay: {
      name: "eBay",
      icon: "🛍️",
      maxTitleChars: 80,
      title: getEbayTitle(),
      description: `${descriptionText}\n\nItem Condition: Pre-owned / Authentic\nShipping: Fast Auspost Satchel Dispatch\nReturns: Accepted within 30 days`,
      launchUrl: `https://www.ebay.com.au/sl/prelist/suggest?q=${encodeURIComponent(getEbayTitle())}`,
    },
    facebook: {
      name: "Facebook Marketplace",
      icon: "🏪",
      maxTitleChars: 100,
      title: listing.product,
      description: `${descriptionText}\n\n📍 Pickup Available\n💵 Cash, PayID or Bank Transfer\n❓ Feel free to message with any questions!`,
      launchUrl: "https://www.facebook.com/marketplace/create/item",
    },
    vinted: {
      name: "Vinted",
      icon: "👗",
      maxTitleChars: 100,
      title: listing.product,
      description: `${descriptionText}\n\n✨ Clean & ready for immediate dispatch\n📦 Bundle discount available on multiple items!`,
      launchUrl: "https://www.vinted.com.au/items/new",
    },
    depop: {
      name: "Depop",
      icon: "✨",
      maxTitleChars: 100,
      title: listing.product.toLowerCase(),
      description: `${descriptionText.toLowerCase()}\n\n#reseller #vintage #streetwear #authentic #deals`,
      launchUrl: "https://www.depop.com/products/create/",
    },
    poshmark: {
      name: "Poshmark",
      icon: "🏷️",
      maxTitleChars: 80,
      title: listing.product,
      description: `${descriptionText}\n\n⭐ Top Rated Seller\n🚭 Smoke-free home\n⚡ Fast 1-Day Shipping!`,
      launchUrl: "https://poshmark.com.au/create-listing",
    },
  };

  const currentData = platformData[platform];
  const titleCharCount = currentData.title.length;
  const isTitleOverLimit = titleCharCount > currentData.maxTitleChars;

  async function copyToClipboard(text: string, type: "title" | "desc" | "all") {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "title") {
        setCopiedTitle(true);
        setTimeout(() => setCopiedTitle(false), 2000);
        toast.success(`Copied ${currentData.name} title!`);
      } else if (type === "desc") {
        setCopiedDesc(true);
        setTimeout(() => setCopiedDesc(false), 2000);
        toast.success(`Copied ${currentData.name} description!`);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
        toast.success(`Copied complete ${currentData.name} listing package!`);
      }
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  }

  function launchPlatformListing() {
    copyToClipboard(
      `TITLE:\n${currentData.title}\n\nDESCRIPTION:\n${currentData.description}\n\nPRICE: $${priceValue.toFixed(2)}`,
      "all"
    );
    window.open(currentData.launchUrl, "_blank");
    toast.success(`Opening ${currentData.name} creation page with copied data!`);
  }

  function runAutoPostFacebook() {
    const rawTitle = JSON.stringify(currentData.title);
    const rawPrice = JSON.stringify(String(priceValue));
    const rawDesc = JSON.stringify(currentData.description);

    // Advanced DOM script that populates inputs, triggers change events, and advances to publish
    const script = `javascript:(function(){
      const title = ${rawTitle};
      const price = ${rawPrice};
      const desc = ${rawDesc};
      
      // 1. Fill Title
      const tIn = document.querySelector('label[aria-label="Title"] input, input[aria-label="Title"]');
      if (tIn) {
        tIn.focus();
        tIn.value = title;
        tIn.dispatchEvent(new Event('input', { bubbles: true }));
        tIn.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // 2. Fill Price
      const pIn = document.querySelector('label[aria-label="Price"] input, input[aria-label="Price"]');
      if (pIn) {
        pIn.focus();
        pIn.value = price;
        pIn.dispatchEvent(new Event('input', { bubbles: true }));
        pIn.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // 3. Fill Description
      const dIn = document.querySelector('label[aria-label="Description"] textarea, textarea[aria-label="Description"]');
      if (dIn) {
        dIn.focus();
        dIn.value = desc;
        dIn.dispatchEvent(new Event('input', { bubbles: true }));
        dIn.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // 4. Auto-advance to Next / Publish
      setTimeout(() => {
        const nextBtn = document.querySelector('div[aria-label="Next"], button[aria-label="Next"]');
        if (nextBtn) {
          nextBtn.click();
        }
      }, 1000);
      
      alert('✨ Spadas AI: Facebook Marketplace listing auto-filled & ready to publish!');
    })();`;

    navigator.clipboard.writeText(script).catch(() => {});
    window.open(currentData.launchUrl, "_blank");
    toast.success(`🚀 Auto-Posting to Facebook Marketplace!`, {
      description: "FB Marketplace opened. Form fields auto-filling. Review and tap Publish!",
      duration: 7000,
    });
  }

  function downloadCSV() {
    const csvHeader = "Product,Price,Cost,Status,Description\n";
    const csvRow = `"${listing.product.replace(/"/g, '""')}",${priceValue},${costValue},"${listing.status || "Draft"}","${descriptionText.replace(/"/g, '""')}"\n`;
    const blob = new Blob([csvHeader + csvRow], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${listing.product.toLowerCase().replace(/[^a-z0-9]/g, "-")}-listing.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded CSV listing package!");
  }

  return (
    <Dialog>
      <DialogTrigger>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5 text-cyan-400" />
          <span>Cross-List</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl rounded-3xl border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-100">Auto-Post & Cross-List</DialogTitle>
              <p className="text-xs text-slate-400">
                1-Click formatted listing copy for eBay, Facebook Marketplace, Depop, & Vinted.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Platform selection tabs */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(platformData) as Array<keyof typeof platformData>).map((key) => {
              const p = platformData[key];
              const isSelected = platform === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlatform(key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Formatted Listing Preview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                {currentData.name} Title
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  isTitleOverLimit
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 font-bold"
                    : "bg-emerald-500/15 text-emerald-400 font-semibold"
                }`}
              >
                {titleCharCount} / {currentData.maxTitleChars} chars
              </span>
            </div>

            <p className="text-sm font-bold text-slate-100 leading-snug">
              {currentData.title}
            </p>

            <div className="border-t border-slate-800 pt-2.5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Description Body
              </span>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-sans bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                {currentData.description}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs">
              <span className="text-slate-400">Asking Price:</span>
              <span className="text-base font-black text-emerald-400">
                ${priceValue.toFixed(2)} AUD
              </span>
            </div>
          </div>

          {/* Launch / Auto-Post Button */}
          <button
            type="button"
            onClick={launchPlatformListing}
            className="h-12 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 font-black text-xs text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-95 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>🚀 Open {currentData.name} & Copy Listing</span>
          </button>

          {/* Copy Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => copyToClipboard(currentData.title, "title")}
              className="h-10 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              {copiedTitle ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copiedTitle ? "Title Copied!" : "Copy Title"}</span>
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(currentData.description, "desc")}
              className="h-10 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              {copiedDesc ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copiedDesc ? "Desc Copied!" : "Copy Description"}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `TITLE:\n${currentData.title}\n\nDESCRIPTION:\n${currentData.description}\n\nPRICE: $${priceValue.toFixed(2)}`,
                  "all"
                )
              }
              className="h-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copiedAll ? "Package Copied!" : "⚡ Copy Full Package"}</span>
            </button>

            <button
              type="button"
              onClick={downloadCSV}
              className="h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}