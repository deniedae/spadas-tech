"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Loader2,
  ArrowRight,
  Check,
  Tag,
  DollarSign,
  Layers,
  Shuffle,
  Volume2,
  Zap,
  ShoppingBag,
  ShieldCheck,
  TrendingUp,
  Crosshair,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

interface SampleItem {
  id: string;
  name: string;
  category: string;
  image: string;
  title: string;
  cost: number;
  priceMin: number;
  priceMax: number;
  medianPrice: number;
  ebayTitle: string;
  fbTitle: string;
  depopTitle: string;
  description: string;
  velocity: string;
}

const SAMPLES: SampleItem[] = [
  {
    id: "nike-jacket",
    name: "Vintage 90s Nike Jacket",
    category: "Streetwear",
    image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80",
    title: "Vintage 90s Nike Spellout Windbreaker Jacket Blue / White L",
    cost: 12.0,
    priceMin: 85,
    priceMax: 125,
    medianPrice: 98.0,
    ebayTitle: "Vintage 90s Nike Spellout Windbreaker Jacket Blue White L Large Retro",
    fbTitle: "Vintage Nike Windbreaker Jacket - Size L - Great Condition",
    depopTitle: "vintage 90s nike spellout windbreaker #nike #vintage #90s #streetwear",
    description: "Authentic vintage 90s Nike spellout windbreaker jacket. Features classic colorblock design, full zip front, and embroidered chest logo. Lightweight nylon shell with clean lining. No major flaws or stains.",
    velocity: "⚡ Sells in < 2 Days",
  },
  {
    id: "jordan1-chicago",
    name: "Air Jordan 1 Chicago",
    category: "Sneakers",
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80",
    title: "Air Jordan 1 Retro High OG Chicago (2015) Size US 10.5",
    cost: 45.0,
    priceMin: 420,
    priceMax: 560,
    medianPrice: 485.0,
    ebayTitle: "Air Jordan 1 Retro High OG Chicago 2015 Size 10.5 555088-101 Authentic",
    fbTitle: "Air Jordan 1 Chicago (2015) US 10.5 - Great Condition w/ Box",
    depopTitle: "air jordan 1 chicago 2015 retro #jordan1 #chicago #sneakers #streetwear",
    description: "Authentic Air Jordan 1 Retro High OG 'Chicago' (2015 release). Size US 10.5. Features high quality varsity red, white, and black leather upper with original Nike Air tongue tagging. Includes original box and extra lacing.",
    velocity: "🔥 Instant Sell (Hours)",
  },
  {
    id: "canon-camera",
    name: "Canon AE-1 Film Camera",
    category: "Cameras",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
    title: "Canon AE-1 35mm Vintage Film Camera w/ 50mm f/1.8 Lens",
    cost: 25.0,
    priceMin: 140,
    priceMax: 210,
    medianPrice: 175.0,
    ebayTitle: "Canon AE-1 35mm SLR Film Camera with FD 50mm 1:1.8 Lens Tested Working",
    fbTitle: "Canon AE-1 35mm Film Camera + 50mm Lens (Tested)",
    depopTitle: "canon ae1 35mm film camera vintage #film #analog #camera #canon",
    description: "Classic Canon AE-1 35mm SLR film camera with Canon FD 50mm f/1.8 prime lens. Shutter fires smoothly at all speeds, light meter tested and working, clear viewfinder with minimal dust.",
    velocity: "⚡ Sells in 1-3 Days",
  },
  {
    id: "gameboy-color",
    name: "Game Boy Color Purple",
    category: "Retro Gaming",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    title: "Nintendo Game Boy Color Atomic Purple Handheld Console",
    cost: 15.0,
    priceMin: 90,
    priceMax: 130,
    medianPrice: 110.0,
    ebayTitle: "Nintendo Game Boy Color Atomic Purple CGB-001 Handheld Console Tested OEM",
    fbTitle: "Nintendo Game Boy Color (Atomic Purple) - Tested & Working",
    depopTitle: "nintendo gameboy color atomic purple #gameboy #nintendo #retro #gaming",
    description: "Original Nintendo Game Boy Color console in iconic Atomic Purple translucent shell. Fully cleaned and tested — screen, speaker audio, directional pad, and buttons function flawlessly.",
    velocity: "⚡ Sells in 24 Hours",
  },
  {
    id: "lv-bag",
    name: "Louis Vuitton Pochette",
    category: "Luxury",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
    title: "Louis Vuitton Monogram Pochette Accessoires Canvas Handbag",
    cost: 80.0,
    priceMin: 620,
    priceMax: 820,
    medianPrice: 710.0,
    ebayTitle: "Louis Vuitton Monogram Pochette Accessoires Canvas Handbag Vintage Authentic",
    fbTitle: "Authentic Louis Vuitton Monogram Pochette Bag w/ Dustbag",
    depopTitle: "louis vuitton pochette monogram canvas #louisvuitton #designer #luxury",
    description: "Authentic Louis Vuitton Pochette Accessoires in classic Monogram canvas. Honey patina leather strap with minimal wear, brass hardware retains gold shine, clean interior canvas.",
    velocity: "🔥 High Demand",
  },
];

export default function LandingInteractiveDemo() {
  const [selectedSample, setSelectedSample] = useState<SampleItem>(SAMPLES[0]);
  const [activeTab, setActiveTab] = useState<"vision" | "copy" | "ebay">("vision");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [simulatingEbay, setSimulatingEbay] = useState(false);
  const [simulatedPublished, setSimulatedPublished] = useState(false);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      toast.success("🔊 Audio Chime: High-Margin Grail Detected!");
    } catch {}
  };

  const handleSelectSample = (sample: SampleItem) => {
    setSelectedSample(sample);
    setSimulatedPublished(false);
    setLoading(true);
    setLoadingStep(1);

    setTimeout(() => setLoadingStep(2), 500);
    setTimeout(() => {
      setLoading(false);
      playChime();
    }, 1100);
  };

  const handleSimulateEbay = () => {
    setSimulatingEbay(true);
    toast.info("⏳ Connecting to eBay AU Inventory API...");

    setTimeout(() => {
      toast.info("📦 Registering Merchant Location & SKU...");
    }, 700);

    setTimeout(() => {
      setSimulatingEbay(false);
      setSimulatedPublished(true);
      toast.success(`🚀 Live on eBay AU! Offer Created at $${selectedSample.medianPrice} AUD.`);
    }, 1600);
  };

  const estProfit = selectedSample.medianPrice - selectedSample.cost - (selectedSample.medianPrice * 0.134 + 0.33);

  return (
    <section className="my-16 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-10 shadow-2xl backdrop-blur-xl space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Interactive Live Scanner Simulator
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
          Test the Magic Live in Your Browser
        </h2>
        <p className="text-sm text-slate-300">
          Tap any thrift item below to see how Spadas AI identifies grails, calculates sold comps, and generates listings in &lt; 1.5 seconds.
        </p>
      </div>

      {/* Preset Item Selector Carousel */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelectSample(s)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              selectedSample.id === s.id
                ? "border-cyan-400 bg-cyan-500 text-slate-950 font-black shadow-[0_0_18px_rgba(6,182,212,0.4)] scale-105"
                : "border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Viewport */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl">
        {/* Viewport Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 p-3 px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("vision")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "vision"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔮 1. AR Vision HUD
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("copy")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "copy"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🤖 2. AI Copywriter
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ebay")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "ebay"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🛍️ 3. 1-Click eBay AU
            </button>
          </div>

          <button
            type="button"
            onClick={playChime}
            aria-label="Play audio alert for item detection"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            title="Test Audio Chime"
          >
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Play Chime</span>
          </button>
        </div>

        {/* Dynamic Interactive Body */}
        {loading ? (
          <div className="p-16 text-center space-y-4 animate-pulse">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400" />
            <div className="space-y-1">
              <p className="text-base font-black text-white">
                {loadingStep === 1 ? "🔍 Continuous 60FPS AR Scanning..." : "📊 Pulling Live eBay AU Sold Comps..."}
              </p>
              <p className="text-xs text-slate-400">Estimating net profit after platform fees...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8">
            {activeTab === "vision" && (
              <div className="grid gap-6 md:grid-cols-2 items-center">
                {/* Simulated Camera Viewfinder */}
                <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-900 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <img
                    src={selectedSample.image}
                    alt={selectedSample.title}
                    className="h-full w-full object-cover"
                  />

                  {/* AR Bounding Box & Target HUD */}
                  <div className="absolute inset-6 rounded-2xl border-2 border-dashed border-cyan-400/80 pointer-events-none flex items-center justify-center animate-pulse">
                    <Crosshair className="h-10 w-10 text-cyan-400/60" />
                  </div>

                  {/* AR Hit Card Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 p-3 backdrop-blur-md space-y-1.5 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Grail Detected (99% Match)
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {selectedSample.velocity}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-white truncate">
                      {selectedSample.title}
                    </p>

                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Sold Median</span>
                        <span className="text-sm font-black text-white">${selectedSample.medianPrice} AUD</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Est. Net Profit</span>
                        <span className="text-sm font-black text-emerald-400">+${estProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reseller Profit Breakdown */}
                <div className="space-y-4 text-left">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      {selectedSample.category} • Sold Comps
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {selectedSample.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time 30-day completed eBay Australia sales analysis.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Typical Op-Shop Cost:</span>
                      <span className="font-bold text-slate-200">${selectedSample.cost.toFixed(2)} AUD</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">eBay AU Sold Median:</span>
                      <span className="font-black text-white">${selectedSample.medianPrice.toFixed(2)} AUD</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Estimated eBay & Payment Fees (13.4%):</span>
                      <span className="font-bold text-amber-400">-${(selectedSample.medianPrice * 0.134 + 0.33).toFixed(2)} AUD</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                      <span className="font-black text-emerald-400">Projected Net Profit:</span>
                      <span className="text-lg font-black text-emerald-400">+${estProfit.toFixed(2)} AUD</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("ebay")}
                    className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-black text-xs text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
                  >
                    <span>⚡ Test 1-Click Publish to eBay</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "copy" && (
              <div className="space-y-4 text-left">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      eBay 80-Character SEO Title
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      {selectedSample.ebayTitle.length}/80 Chars
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {selectedSample.ebayTitle}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2">
                  <span className="text-xs font-black text-slate-400">Marketplace Body Description</span>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {selectedSample.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("ebay")}
                  className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-black text-xs text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 transition cursor-pointer"
                >
                  <span>Proceed to 1-Click Publish Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {activeTab === "ebay" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-center space-y-4">
                {simulatedPublished ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                        Live API Simulation Complete
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        Offer Created: {selectedSample.name}
                      </h3>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        Listed on eBay Australia at <strong className="text-emerald-400">${selectedSample.medianPrice}.00 AUD</strong> • Projected Profit: <strong className="text-emerald-400">+${estProfit.toFixed(2)} AUD</strong>
                      </p>
                    </div>

                    <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link
                        href="/lens"
                        className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-xs font-black text-slate-950 shadow-xl shadow-cyan-500/30 hover:scale-105 transition active:scale-95 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Launch Real Camera on Your Items</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSimulatedPublished(false)}
                        className="w-full sm:w-auto inline-flex h-12 items-center justify-center px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition cursor-pointer"
                      >
                        Reset Demo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 mx-auto text-slate-950 font-black shadow-lg shadow-cyan-500/30">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white">
                        Live eBay Australia API Publisher
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Spadas AI creates warehouse inventory, sets AUD pricing, generates specifics, and publishes your listing in 1 background API call.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={simulatingEbay}
                      onClick={handleSimulateEbay}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-8 font-black text-xs text-slate-950 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
                    >
                      {simulatingEbay ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                          <span>Publishing to eBay AU...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          <span>🚀 Test Live Publish to eBay AU</span>
                        </>
                      )}
                    </button>

                    <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-400">
                      <Link
                        href="/signup"
                        className="text-cyan-400 font-bold hover:underline"
                      >
                        Create Free Account to Use on Real Items →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA Footer */}
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-slate-950 p-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold text-sm">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Ready to turn op-shop finds into high-margin cash?</span>
        </div>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Start scanning shelves with continuous 60FPS AR vision and auto-publishing directly to your eBay store.
        </p>
        <Link
          href="/lens"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 transition active:scale-95 cursor-pointer"
        >
          <span>🚀 Launch Spadas Lens AR Now</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
