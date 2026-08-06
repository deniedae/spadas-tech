"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Zap, Flame, TrendingUp, ShieldCheck, ArrowRight, Layers, Tag, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";

interface CopilotItem {
  id: string;
  title: string;
  category: string;
  buyPrice: number;
  estResale: number;
  estProfit: number;
  roi: number;
  sellThroughRate: number; // percentage
  verdict: "FAST FLIP" | "HIGH MARGIN" | "STEADY PASS";
  imageUrl: string;
  ebayFormat: { title: string; desc: string; price: number; tags: string[] };
  depopFormat: { title: string; desc: string; price: number; hashtags: string[] };
  poshmarkFormat: { title: string; desc: string; price: number; category: string };
  mercariFormat: { title: string; desc: string; price: number; shippingTier: string };
}

const SAMPLE_ARBITRAGE_DEALS: CopilotItem[] = [
  {
    id: "deal-1",
    title: "Vintage Nike ACG Fleece Jacket 90s Teal",
    category: "Streetwear",
    buyPrice: 18.00,
    estResale: 95.00,
    estProfit: 64.65,
    roi: 359,
    sellThroughRate: 94,
    verdict: "FAST FLIP",
    imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80",
    ebayFormat: {
      title: "Vintage 90s Nike ACG Fleece Jacket Mens Medium Teal Retro Gorpcore",
      desc: "Authentic vintage 1990s Nike ACG fleece jacket in rare teal colorway. Excellent condition with no rips or stains. Soft fleece material, original zippers intact.",
      price: 95.00,
      tags: ["Nike ACG", "Vintage Fleece", "Gorpcore", "90s Retro"],
    },
    depopFormat: {
      title: "Rare Vintage Nike ACG Fleece Jacket",
      desc: "Grail piece! 90s vintage Nike ACG fleece jacket in teal. Insane gorpcore aesthetic, super warm and oversized fit.",
      price: 110.00,
      hashtags: ["#nikeacg", "#vintage", "#gorpcore", "#streetwear", "#90s"],
    },
    poshmarkFormat: {
      title: "Nike ACG Vintage Teal Zip Fleece Jacket",
      desc: "Gorgeous vintage Nike ACG full zip fleece jacket. High quality warmth, comfortable athletic fit. Clean condition.",
      price: 98.00,
      category: "Men > Jackets & Coats > Fleece",
    },
    mercariFormat: {
      title: "Nike ACG Vintage Fleece Jacket Teal M",
      desc: "Men's Medium vintage Nike ACG fleece. Fast shipping guaranteed!",
      price: 92.00,
      shippingTier: "1 lb 4 oz ($7.99)",
    },
  },
  {
    id: "deal-2",
    title: "Sony Handycam DCR-TRV280 Digital8 Camcorder",
    category: "Tech",
    buyPrice: 25.00,
    estResale: 145.00,
    estProfit: 101.15,
    roi: 404,
    sellThroughRate: 88,
    verdict: "HIGH MARGIN",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
    ebayFormat: {
      title: "Sony Handycam DCR-TRV280 Digital8 NTSC Camcorder VCR Tape Transfer Tested",
      desc: "Fully tested and working Sony Handycam Digital8 DCR-TRV280. Perfect for digitizing old 8mm / Hi8 tapes. Includes battery and charger.",
      price: 145.00,
      tags: ["Sony Handycam", "Digital8", "Y2K Camcorder", "Tape Transfer"],
    },
    depopFormat: {
      title: "Y2K Sony Digital8 Camcorder Handycam",
      desc: "Ultra popular Y2K skate video camcorder! Sony Handycam Digital8, tested and working 100%. Comes with battery & charger.",
      price: 160.00,
      hashtags: ["#camcorder", "#y2k", "#sony", "#skatevideo", "#retro"],
    },
    poshmarkFormat: {
      title: "Sony Handycam Digital8 Video Camera Tested",
      desc: "Tested Sony Digital8 video camera. Includes battery and charger cable. Great condition.",
      price: 150.00,
      category: "Electronics > Cameras > Camcorders",
    },
    mercariFormat: {
      title: "Sony Handycam Digital8 Camcorder Tested",
      desc: "Sony Digital8 DCR-TRV280. Works great for tape transfers!",
      price: 140.00,
      shippingTier: "2 lbs ($9.99)",
    },
  },
];

export default function SpadasRadarCopilot() {
  const [selectedDeal, setSelectedDeal] = useState<CopilotItem>(SAMPLE_ARBITRAGE_DEALS[0]);
  const [activePlatform, setActivePlatform] = useState<"ebay" | "depop" | "poshmark" | "mercari">("ebay");
  const [copied, setCopied] = useState(false);

  const handleCopyListing = () => {
    let content = "";
    if (activePlatform === "ebay") {
      content = `TITLE: ${selectedDeal.ebayFormat.title}\nPRICE: $${selectedDeal.ebayFormat.price}\n\nDESCRIPTION:\n${selectedDeal.ebayFormat.desc}\n\nKEYWORDS: ${selectedDeal.ebayFormat.tags.join(", ")}`;
    } else if (activePlatform === "depop") {
      content = `TITLE: ${selectedDeal.depopFormat.title}\nPRICE: $${selectedDeal.depopFormat.price}\n\nDESCRIPTION:\n${selectedDeal.depopFormat.desc}\n\nHASHTAGS: ${selectedDeal.depopFormat.hashtags.join(" ")}`;
    } else if (activePlatform === "poshmark") {
      content = `TITLE: ${selectedDeal.poshmarkFormat.title}\nPRICE: $${selectedDeal.poshmarkFormat.price}\nCATEGORY: ${selectedDeal.poshmarkFormat.category}\n\nDESCRIPTION:\n${selectedDeal.poshmarkFormat.desc}`;
    } else {
      content = `TITLE: ${selectedDeal.mercariFormat.title}\nPRICE: $${selectedDeal.mercariFormat.price}\nSHIPPING: ${selectedDeal.mercariFormat.shippingTier}\n\nDESCRIPTION:\n${selectedDeal.mercariFormat.desc}`;
    }

    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`Copied ${activePlatform.toUpperCase()} listing to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 rounded-3xl border border-blue-500/30 bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            Spadas AI Sourcing Copilot
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">
            Live Arbitrage Radar & Cross-Platform Exporter
          </h2>
          <p className="mt-1 text-xs md:text-sm text-slate-300">
            AI evaluates real-time sell-through rates and instantly formats listings for eBay, Depop, Poshmark & Mercari.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-300">Radar Live Feed Active</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Deal Selector Column */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Detected High-Profit Arbitrage Deals
          </h3>

          <div className="space-y-3">
            {SAMPLE_ARBITRAGE_DEALS.map((deal) => {
              const isSelected = selectedDeal.id === deal.id;
              return (
                <div
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className={`group cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="h-16 w-16 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          deal.verdict === "FAST FLIP"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}>
                          {deal.verdict}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          +{deal.roi}% ROI
                        </span>
                      </div>

                      <h4 className="mt-1.5 text-sm font-semibold text-white truncate">
                        {deal.title}
                      </h4>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Buy: <strong className="text-white">${deal.buyPrice}</strong></span>
                        <span className="text-slate-400">Profit: <strong className="text-emerald-400">${deal.estProfit.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cross-Platform Exporter Column */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-5 md:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Cross-Platform Listing Format
              </span>

              {/* Platform Switcher */}
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
                {(["ebay", "depop", "poshmark", "mercari"] as const).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setActivePlatform(platform)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition ${
                      activePlatform === platform
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Content Output */}
            <div className="mt-5 space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Optimized Title</label>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white font-mono leading-relaxed">
                  {activePlatform === "ebay" && selectedDeal.ebayFormat.title}
                  {activePlatform === "depop" && selectedDeal.depopFormat.title}
                  {activePlatform === "poshmark" && selectedDeal.poshmarkFormat.title}
                  {activePlatform === "mercari" && selectedDeal.mercariFormat.title}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Target Resale Price</label>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  ${activePlatform === "ebay" && selectedDeal.ebayFormat.price}
                  ${activePlatform === "depop" && selectedDeal.depopFormat.price}
                  ${activePlatform === "poshmark" && selectedDeal.poshmarkFormat.price}
                  ${activePlatform === "mercari" && selectedDeal.mercariFormat.price}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Description & Keywords</label>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 leading-relaxed font-sans min-h-[90px]">
                  {activePlatform === "ebay" && selectedDeal.ebayFormat.desc}
                  {activePlatform === "depop" && (
                    <>
                      <p>{selectedDeal.depopFormat.desc}</p>
                      <p className="mt-2 text-blue-400 font-mono">{selectedDeal.depopFormat.hashtags.join(" ")}</p>
                    </>
                  )}
                  {activePlatform === "poshmark" && selectedDeal.poshmarkFormat.desc}
                  {activePlatform === "mercari" && selectedDeal.mercariFormat.desc}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              STR Rate: <strong className="text-emerald-400">{selectedDeal.sellThroughRate}% Sell-Through</strong>
            </span>

            <button
              onClick={handleCopyListing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied Format!" : `Copy ${activePlatform.toUpperCase()} Listing`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
