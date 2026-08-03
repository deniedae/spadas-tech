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

  function runAutoFillDraft() {
    // Generate JS script for DOM field injection on draft page
    const rawTitle = JSON.stringify(currentData.title);
    const rawPrice = JSON.stringify(String(priceValue));
    const rawDesc = JSON.stringify(currentData.description);

    const script = `javascript:(function(){
      const title = ${rawTitle};
      const price = ${rawPrice};
      const desc = ${rawDesc};
      
      const tIn = document.querySelector('label[aria-label="Title"] input, input[aria-label="Title"]');
      if (tIn) { tIn.value = title; tIn.dispatchEvent(new Event('input', { bubbles: true })); }
      
      const pIn = document.querySelector('label[aria-label="Price"] input, input[aria-label="Price"]');
      if (pIn) { pIn.value = price; pIn.dispatchEvent(new Event('input', { bubbles: true })); }
      
      const dIn = document.querySelector('label[aria-label="Description"] textarea, textarea[aria-label="Description"]');
      if (dIn) { dIn.value = desc; dIn.dispatchEvent(new Event('input', { bubbles: true })); }
      
      alert('✨ Spadas AI: Auto-filled ${currentData.name} draft fields!');
    })();`;

    navigator.clipboard.writeText(script).catch(() => {});
    window.open(currentData.launchUrl, "_blank");
    toast.success(`⚡ Auto-Fill: Opening ${currentData.name} draft page!`, {
      description: "Auto-fill script copied. Open address bar and paste script (or Ctrl+V) to fill all fields instantly!",
      duration: 6000,
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
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border hover:bg-muted">
          <Share2 className="h-4 w-4 text-blue-500" />
          <span>Cross-List</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl rounded-2xl border-border bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Marketplace Auto-Lister</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Auto-fills titles, prices, & descriptions as drafts on Facebook, eBay, Vinted, & Depop.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
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
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Formatted Listing Preview */}
          <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                {currentData.name} Title
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isTitleOverLimit
                    ? "bg-red-500/15 text-red-600 border border-red-500/30"
                    : "bg-green-500/15 text-green-600 dark:text-green-400"
                }`}
              >
                {titleCharCount} / {currentData.maxTitleChars} chars
              </span>
            </div>

            <p className="text-sm font-bold text-foreground leading-snug">
              {currentData.title}
            </p>

            <div className="border-t border-border/60 pt-3 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description Body
              </span>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {currentData.description}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="text-muted-foreground">Asking Price:</span>
              <span className="text-base font-bold text-green-600 dark:text-green-400">
                ${priceValue.toFixed(2)} AUD
              </span>
            </div>
          </div>

          {/* 1-Click Auto-Fill Draft Button */}
          <Button
            onClick={runAutoFillDraft}
            className="h-12 w-full gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 font-semibold text-white shadow-md transition hover:opacity-90"
          >
            <Sparkles className="h-5 w-5" />
            <span>⚡ Auto-Fill {currentData.name} Draft</span>
          </Button>

          {/* Copy Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(currentData.title, "title")}
              className="h-11 gap-2 rounded-xl text-xs font-semibold"
            >
              {copiedTitle ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span>{copiedTitle ? "Title Copied!" : "Copy Title"}</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => copyToClipboard(currentData.description, "desc")}
              className="h-11 gap-2 rounded-xl text-xs font-semibold"
            >
              {copiedDesc ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span>{copiedDesc ? "Description Copied!" : "Copy Description"}</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              onClick={() =>
                copyToClipboard(
                  `TITLE:\n${currentData.title}\n\nDESCRIPTION:\n${currentData.description}\n\nPRICE: $${priceValue.toFixed(2)}`,
                  "all"
                )
              }
              variant="outline"
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-semibold border-border hover:bg-muted"
            >
              {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedAll ? "All Copied!" : "⚡ Copy Package"}</span>
            </Button>

            <Button
              variant="outline"
              onClick={downloadCSV}
              className="h-11 gap-2 rounded-xl text-xs font-semibold border-border hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}