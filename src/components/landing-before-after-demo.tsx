"use client";

import React, { useState } from "react";
import {
  Camera,
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  Tag,
  TrendingUp,
  DollarSign,
  Layers,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface DemoItem {
  id: string;
  tabLabel: string;
  category: string;
  thriftCost: number;
  medianPrice: number;
  priceRange: string;
  netProfit: number;
  roi: number;
  condition: string;
  brand: string;
  size?: string;
  // PLACEHOLDER: Swap image URL below for a real screenshot if desired
  photoUrl: string;
  photoCaption: string;
  listings: {
    ebay: {
      platformName: "eBay";
      title: string;
      charCount: number;
      price: string;
      description: string;
      badgeColor: string;
    };
    depop: {
      platformName: "Depop";
      title: string;
      charCount: number;
      price: string;
      description: string;
      badgeColor: string;
    };
    poshmark: {
      platformName: "Poshmark";
      title: string;
      charCount: number;
      price: string;
      description: string;
      badgeColor: string;
    };
    facebook: {
      platformName: "Facebook Marketplace";
      title: string;
      charCount: number;
      price: string;
      description: string;
      badgeColor: string;
    };
  };
}

const DEMO_ITEMS: DemoItem[] = [
  {
    id: "vintage-nike",
    tabLabel: "Vintage Windbreaker",
    category: "Vintage Streetwear",
    brand: "Nike",
    size: "Men's L",
    condition: "Used - Very Good",
    thriftCost: 12.0,
    medianPrice: 98.0,
    priceRange: "$85 – $125",
    netProfit: 72.95,
    roi: 608,
    photoUrl: "/grok_vintage_jacket_ar_scan.jpg",
    photoCaption: "Illustrative sample • Vintage jacket collar tag match",
    listings: {
      ebay: {
        platformName: "eBay",
        title: "Vintage 90s Nike Spellout Windbreaker Jacket Blue White L Retro Nylon",
        charCount: 71,
        price: "$98.00 AUD",
        description: `Authentic vintage 1990s Nike spellout windbreaker jacket in classic blue & white colorblock.\n\n• Brand: Nike (Grey Tag Era)\n• Size: Men's Large (Pit to pit: 24\", Length: 27\")\n• Material: 100% Nylon shell, breathable mesh lining\n• Condition: Pre-owned, excellent vintage condition with no holes or stains. Zipper runs smoothly.\n\nFast dispatch with tracking via AusPost.`,
        badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
      depop: {
        platformName: "Depop",
        title: "vintage 90s nike spellout windbreaker jacket oversized L",
        charCount: 56,
        price: "$105.00 AUD",
        description: `sick 90s nike spellout windbreaker jacket 🔥 insane blue/white colorblock with embroidered chest logo. oversized boxy fit on a medium/large.\n\npit to pit: 24\"\nlength: 27\"\ncondition: 9/10 clean retro condition\n\n#nike #vintage #90s #streetwear #windbreaker`,
        badgeColor: "bg-red-500/15 text-red-300 border-red-500/30",
      },
      poshmark: {
        platformName: "Poshmark",
        title: "Nike Vintage 90s Colorblock Spellout Windbreaker Jacket Large",
        charCount: 60,
        price: "$95.00 AUD",
        description: `Nike Vintage 90s Spellout Windbreaker Jacket.\nSize: Large\nColor: Royal Blue / White\nFull zip with high collar, elastic cuffs and hem. Clean vintage piece in great condition.\n\nBundle & save on shipping! Questions welcome.`,
        badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
      },
      facebook: {
        platformName: "Facebook Marketplace",
        title: "Vintage Nike Windbreaker Jacket - Size L - Great Condition",
        charCount: 57,
        price: "$90.00 AUD",
        description: `Vintage 90s Nike windbreaker jacket in great condition. Size Large (fits slightly boxy). Clean, no tears or stains, all zippers work. Pick up available or happy to post for $10.`,
        badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      },
    },
  },
  {
    id: "jordan-chicago",
    tabLabel: "Sneakers (Jordan 1)",
    category: "Footwear / Sneakers",
    brand: "Air Jordan / Nike",
    size: "US 10.5",
    condition: "Used - Excellent",
    thriftCost: 45.0,
    medianPrice: 485.0,
    priceRange: "$420 – $560",
    netProfit: 375.0,
    roi: 833,
    photoUrl: "/grok_retro_sneaker_ar_scan.jpg",
    photoCaption: "Illustrative sample • Retro sneaker barcode & silhouette match",
    listings: {
      ebay: {
        platformName: "eBay",
        title: "Air Jordan 1 Retro High OG Chicago 2015 Size 10.5 555088-101 Authentic",
        charCount: 71,
        price: "$485.00 AUD",
        description: `100% Authentic Air Jordan 1 Retro High OG 'Chicago' (2015 release).\n\n• Style Code: 555088-101\n• Size: US Men's 10.5 / UK 9.5 / EU 44.5\n• Condition: Pre-owned 8.5/10. Light toe-box creasing, stars fully visible on outsole, clean collars.\n• Includes: Original box and replacement red/white lacing.\n\nDispatched double-boxed with signature on delivery via AusPost Express.`,
        badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
      depop: {
        platformName: "Depop",
        title: "air jordan 1 high og chicago 2015 size 10.5 authentic",
        charCount: 53,
        price: "$495.00 AUD",
        description: `holy grail air jordan 1 chicago 2015 OG high top 🔴⚪️ size 10.5 US. leather is super butter, light wear on stars, 100% authentic.\n\nships express double boxed with tracking.\n\n#jordan #jordan1 #chicago #sneakers #streetwear`,
        badgeColor: "bg-red-500/15 text-red-300 border-red-500/30",
      },
      poshmark: {
        platformName: "Poshmark",
        title: "Nike Air Jordan 1 Retro High OG Chicago (2015) Size 10.5",
        charCount: 56,
        price: "$480.00 AUD",
        description: `Authentic Nike Air Jordan 1 Retro High OG 'Chicago' (2015).\nSize 10.5 US Men.\nGently worn with minor creasing. Comes in original box. Verified authentic.\n\nFast shipping!`,
        badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
      },
      facebook: {
        platformName: "Facebook Marketplace",
        title: "Air Jordan 1 High Chicago (2015) US 10.5 - Great Condition",
        charCount: 57,
        price: "$470.00 AUD",
        description: `Selling my Air Jordan 1 Chicago 2015 high tops. Size 10.5 US. Condition 8.5/10. 100% authentic, comes with original box. Cash on pick up preferred or express post available.`,
        badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      },
    },
  },
  {
    id: "workwear-jacket",
    tabLabel: "Workwear (Carhartt)",
    category: "Vintage Workwear",
    brand: "Carhartt",
    condition: "Pre-owned - Faded",
    thriftCost: 25.0,
    medianPrice: 175.0,
    priceRange: "$145 – $210",
    netProfit: 124.25,
    roi: 497,
    photoUrl: "/grok_authentic_thrift_carhartt.jpg",
    photoCaption: "Illustrative sample • Heavy canvas workwear jacket with label inspection",
    listings: {
      ebay: {
        platformName: "eBay",
        title: "Vintage Carhartt Detroit Duck Canvas Blanket Lined Workwear Jacket Faded Tan",
        charCount: 75,
        price: "$175.00 AUD",
        description: `Authentic vintage Carhartt Detroit workwear jacket in heavyweight duck canvas with blanket lining.\n\n• Brand: Carhartt Work in Progress / Vintage USA\n• Condition: Pre-owned with natural workwear patina and authentic fading. No structural tears; heavy-duty brass zipper intact.\n• Fit: Boxy relaxed fit\n\nCarefully packed and dispatched promptly via AusPost tracked satchel.`,
        badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
      depop: {
        platformName: "Depop",
        title: "vintage carhartt detroit jacket blanket lined faded tan",
        charCount: 56,
        price: "$185.00 AUD",
        description: `grail vintage carhartt detroit jacket in washed duck tan 🛠️ blanket lined with corduroy collar. beautiful authentic sun fade and distressing.\n\n#carhartt #detroit #workwear #vintage #streetwear`,
        badgeColor: "bg-red-500/15 text-red-300 border-red-500/30",
      },
      poshmark: {
        platformName: "Poshmark",
        title: "Vintage Carhartt Detroit Blanket Lined Work Jacket Tan",
        charCount: 54,
        price: "$170.00 AUD",
        description: `Vintage Carhartt Detroit canvas jacket with blanket lining and corduroy collar. Authentic workwear wear throughout. Heavy duty zipper works smoothly.\n\nFast dispatch!`,
        badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
      },
      facebook: {
        platformName: "Facebook Marketplace",
        title: "Vintage Carhartt Detroit Jacket (Blanket Lined) - Great Patina",
        charCount: 63,
        price: "$165.00 AUD",
        description: `Selling a vintage Carhartt Detroit workwear jacket. Blanket lined, corduroy collar, heavyweight canvas with natural fading. Pick up or tracked post available.`,
        badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      },
    },
  },
  {
    id: "gameboy-color",
    tabLabel: "Retro Gaming",
    category: "Gaming Handheld",
    brand: "Nintendo",
    condition: "Used - Very Good",
    thriftCost: 15.0,
    medianPrice: 110.0,
    priceRange: "$95 – $130",
    netProfit: 80.4,
    roi: 536,
    photoUrl: "/screenshot-lens.png",
    photoCaption: "Illustrative sample • Handheld gaming console camera lookup",
    listings: {
      ebay: {
        platformName: "eBay",
        title: "Nintendo Game Boy Color Atomic Purple CGB-001 Handheld Console Tested OEM",
        charCount: 75,
        price: "$110.00 AUD",
        description: `Original OEM Nintendo Game Boy Color handheld console in iconic Atomic Purple translucent housing (Model CGB-001).\n\n• Condition: Thoroughly tested and 100% operational\n• Audio: Speaker is loud and crisp\n• Controls: D-pad, A/B buttons, Start/Select are responsive\n• Display: Clean OEM screen with minimal surface marks\n• Battery compartment: Clean contacts with original battery cover\n\nCarefully packaged and shipped with tracking.`,
        badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
      depop: {
        platformName: "Depop",
        title: "nintendo game boy color atomic purple vintage 90s console",
        charCount: 57,
        price: "$115.00 AUD",
        description: `vintage y2k atomic purple game boy color handheld 👾 fully tested and working perfectly! sound is loud, all buttons responsive, battery cover intact.\n\n#nintendo #gameboy #retrogaming #90s #y2k`,
        badgeColor: "bg-red-500/15 text-red-300 border-red-500/30",
      },
      poshmark: {
        platformName: "Poshmark",
        title: "Nintendo Game Boy Color Atomic Purple Handheld System Tested",
        charCount: 60,
        price: "$105.00 AUD",
        description: `Authentic Nintendo Game Boy Color in Atomic Purple.\nTested and working great. Sound is crisp, screen is clean, original battery cover included.\n\nFast dispatch!`,
        badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
      },
      facebook: {
        platformName: "Facebook Marketplace",
        title: "Nintendo Game Boy Color (Atomic Purple) - Tested & Working",
        charCount: 57,
        price: "$100.00 AUD",
        description: `Selling an original Nintendo Game Boy Color in Atomic Purple. Fully tested, sound works great, buttons are responsive, battery contacts clean. Pick up or tracked post.`,
        badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      },
    },
  },
];

export default function LandingBeforeAfterDemo() {
  const [selectedItem, setSelectedItem] = useState<DemoItem>(DEMO_ITEMS[0]);
  const [activePlatform, setActivePlatform] = useState<"ebay" | "depop" | "poshmark" | "facebook">("ebay");
  const [copied, setCopied] = useState(false);

  const activeListing = selectedItem.listings[activePlatform];

  const handleCopyListing = () => {
    const textToCopy = `TITLE: ${activeListing.title}\nPRICE: ${activeListing.price}\n\nDESCRIPTION:\n${activeListing.description}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success(`Copied ${activeListing.platformName} listing details to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="demo" className="my-16 scroll-mt-20">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-8 px-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          See it in action
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Snap a photo of any item. Spadas Lens pulls live sold comps, calculates fees, and writes finished listings.
        </p>
      </div>

      {/* Preset Item Selector Pills */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto px-4 pb-4 max-w-4xl mx-auto no-scrollbar">
        {DEMO_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedItem(item);
              setCopied(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 border ${
              selectedItem.id === item.id
                ? "bg-white text-zinc-950 border-white shadow-lg shadow-white/10 scale-[1.02]"
                : "bg-zinc-900/80 text-zinc-400 border-white/[0.08] hover:text-white hover:border-white/20"
            }`}
          >
            {item.tabLabel}
          </button>
        ))}
      </div>

      {/* Side-by-Side Before & After Container */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl border border-white/[0.1] bg-[#0A0D14]/90 backdrop-blur-xl p-4 sm:p-6 md:p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
            
            {/* ── LEFT COLUMN: The Thrift Snap (Before) ───────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-zinc-500" />
                  Your photo
                </span>
              </div>

              {/* Photo Frame Container (Easily swappable with screenshot) */}
              <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-inner group">
                {/* PLACEHOLDER: Swap image URL in DEMO_ITEMS for a real screenshot */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedItem.photoUrl}
                  alt={selectedItem.tabLabel}
                  width={600}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />

                {/* 4 Minimalist Optical Focus Brackets */}
                <div className="absolute inset-5 pointer-events-none z-10">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>

                {/* Illustrative Sample Pill Overlay */}
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 z-20">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-medium text-zinc-200">
                    Illustrative sample scan
                  </span>
                </div>

                {/* Sourcing Cost Badge */}
                <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="block text-[10px] text-zinc-500">
                      Sourced at
                    </span>
                    <span className="font-bold text-zinc-200">
                      ${selectedItem.thriftCost.toFixed(2)} AUD
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-zinc-500">
                      Sold comps range
                    </span>
                    <span className="font-bold text-cyan-400">
                      {selectedItem.priceRange}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sourcing Context Subtitle */}
              <p className="text-[11px] text-zinc-500 text-center">
                {selectedItem.photoCaption}
              </p>
            </div>

            {/* ── RIGHT COLUMN: The Finished Listing (After) ───────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready-to-post listing
                </span>
                
                {/* Platform Selector Mini Tabs */}
                <div className="inline-flex rounded-lg bg-zinc-900 border border-white/[0.08] p-0.5">
                  {(["ebay", "depop", "poshmark", "facebook"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePlatform(p)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                        activePlatform === p
                          ? "bg-white text-zinc-950 shadow-xs"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {p === "facebook" ? "FB" : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styled Mock Marketplace Listing Card */}
              <div className="rounded-2xl border border-white/[0.12] bg-zinc-900/90 p-4 sm:p-5 space-y-4 shadow-xl">
                
                {/* Header: Platform & Profit Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${activeListing.badgeColor}`}>
                      {activeListing.platformName}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      +${selectedItem.netProfit.toFixed(2)} Net ({selectedItem.roi}% ROI)
                    </span>
                  </div>
                </div>

                {/* Listing Title */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Listing title</span>
                    <span className="text-zinc-500">{activeListing.charCount} chars</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white bg-zinc-950/90 p-3 rounded-xl border border-white/[0.08] leading-snug">
                    {activeListing.title}
                  </p>
                </div>

                {/* Price & Sold Comps Snapshot */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-500 block">
                      Listing price
                    </span>
                    <span className="text-base font-bold text-white">
                      {activeListing.price}
                    </span>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-500 block">
                      30-day sold median
                    </span>
                    <span className="text-xs font-bold text-cyan-400">
                      ${selectedItem.medianPrice.toFixed(2)} AUD
                    </span>
                  </div>
                </div>

                {/* Item Specifics Row */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-white/[0.06] text-zinc-300">
                    {selectedItem.brand}
                  </span>
                  {selectedItem.size && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-white/[0.06] text-zinc-300">
                      {selectedItem.size}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-white/[0.06] text-zinc-300">
                    {selectedItem.condition}
                  </span>
                </div>

                {/* Listing Description Preview */}
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 block">
                    Description
                  </span>
                  <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-950/90 p-3 rounded-xl border border-white/[0.08] max-h-28 overflow-y-auto font-sans">
                    {activeListing.description}
                  </div>
                </div>

                {/* Action Row */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyListing}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy for {activeListing.platformName}</span>
                      </>
                    )}
                  </button>

                  <a
                    href="/lens"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-white/10 transition active:scale-95"
                  >
                    <span>Start free</span>
                    <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
