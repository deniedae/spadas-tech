"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Upload, Loader2, ArrowRight, Check, Tag, DollarSign, Layers } from "lucide-react";

interface SampleItem {
  id: string;
  name: string;
  image: string;
  title: string;
  priceMin: number;
  priceMax: number;
  medianPrice: number;
  ebayTitle: string;
  fbTitle: string;
  depopTitle: string;
  description: string;
}

const SAMPLES: SampleItem[] = [
  {
    id: "nike-jacket",
    name: "Vintage Nike Jacket",
    image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80",
    title: "Vintage 90s Nike Spellout Windbreaker Jacket Blue / White",
    priceMin: 85,
    priceMax: 125,
    medianPrice: 98.5,
    ebayTitle: "Vintage 90s Nike Spellout Windbreaker Jacket Blue White L Large Retro",
    fbTitle: "Vintage Nike Windbreaker Jacket - Size L - Great Condition",
    depopTitle: "vintage 90s nike spellout windbreaker #nike #vintage #90s #streetwear",
    description: "Authentic vintage 90s Nike spellout windbreaker jacket. Features classic colorblock design, full zip front, and embroidered chest logo. Lightweight nylon shell with clean lining. No major flaws or stains.",
  },
  {
    id: "ps5-controller",
    name: "PS5 Wireless Controller",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80",
    title: "Sony PlayStation 5 DualSense Wireless Controller Midnight Black",
    priceMin: 55,
    priceMax: 75,
    medianPrice: 68.0,
    ebayTitle: "Sony PlayStation 5 PS5 DualSense Wireless Controller Midnight Black OEM",
    fbTitle: "PS5 Controller Midnight Black - Works Great",
    depopTitle: "ps5 controller midnight black dualsense #playstation #gaming #ps5",
    description: "Official Sony PlayStation 5 DualSense controller in Midnight Black. Tested and 100% fully functional with no stick drift. Buttons and haptic feedback are firm and responsive.",
  },
  {
    id: "canon-camera",
    name: "Canon Vintage SLR",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
    title: "Canon AE-1 35mm Vintage Film Camera w/ 50mm f/1.8 Lens",
    priceMin: 140,
    priceMax: 210,
    medianPrice: 175.0,
    ebayTitle: "Canon AE-1 35mm SLR Film Camera with FD 50mm 1:1.8 Lens Tested Working",
    fbTitle: "Canon AE-1 35mm Film Camera + 50mm Lens (Tested)",
    depopTitle: "canon ae1 35mm film camera vintage #film #analog #camera #canon",
    description: "Classic Canon AE-1 35mm SLR film camera with Canon FD 50mm f/1.8 prime lens. Shutter fires smoothly at all speeds, light meter tested and working, clear viewfinder with minimal dust.",
  },
];

export default function LandingInteractiveDemo() {
  const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<SampleItem | null>(null);

  const handleSelectSample = (sample: SampleItem) => {
    setSelectedSample(sample);
    setUserImage(null);
    runDemoAnalysis(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUserImage(url);
    setSelectedSample(null);

    // Dynamic mock for uploaded custom photo
    const customResult: SampleItem = {
      id: "custom-upload",
      name: file.name.replace(/\.[^/.]+$/, ""),
      image: url,
      title: "Authentic Reseller Item - AI Optimized Title",
      priceMin: 65,
      priceMax: 110,
      medianPrice: 85.0,
      ebayTitle: "Authentic Reseller Item Premium Condition Fast Shipping",
      fbTitle: "Reseller Item - Great Condition",
      depopTitle: "authentic reseller item #vintage #resell #deals",
      description: "AI-generated product description ready for instant cross-listing. Features item condition breakdown, key specifications, and buyer shipping policies.",
    };

    runDemoAnalysis(customResult);
  };

  const runDemoAnalysis = (targetItem: SampleItem) => {
    setLoading(true);
    setLoadingStep(1);
    setResult(null);

    setTimeout(() => setLoadingStep(2), 1000);
    setTimeout(() => setLoadingStep(3), 2000);

    setTimeout(() => {
      setLoading(false);
      setResult(targetItem);
    }, 3000);
  };

  return (
    <section className="my-16 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/80 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
          <Sparkles className="h-3.5 w-3.5" />
          Interactive Live Demo
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Try AI Listing Instantly
        </h2>
        <p className="text-sm text-slate-300">
          Upload a sample photo or choose an item below to test Spadas AI in real-time.
        </p>
      </div>

      {/* Sample Selectors */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs font-semibold text-slate-400">Try a sample:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelectSample(s)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              selectedSample?.id === s.id
                ? "border-blue-400 bg-blue-600 text-white shadow-md"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25 hover:bg-white/10"
            }`}
          >
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Upload Dropzone */}
      <div className="mx-auto max-w-xl mb-10">
        <label className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-slate-950/40 p-8 text-center transition hover:border-blue-500/50 hover:bg-slate-950/60 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">
            Click to upload a sample photo
          </p>
          <p className="mt-1 text-xs text-slate-400">
            JPG or PNG — see instant AI pricing & description
          </p>
        </label>
      </div>

      {/* 3-Second Loading Animation */}
      {loading && (
        <div className="mx-auto max-w-md rounded-2xl border border-blue-500/30 bg-blue-500/10 p-8 text-center space-y-4 animate-pulse">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" />
          <div className="space-y-1">
            <p className="text-base font-bold text-white">
              {loadingStep === 1 && "🔍 Scanning image features & condition..."}
              {loadingStep === 2 && "📊 Pulling eBay & Facebook sold comps..."}
              {loadingStep === 3 && "✍️ Formatting multi-marketplace titles..."}
            </p>
            <p className="text-xs text-slate-300">
              Generating marketplace-ready pricing & copy...
            </p>
          </div>
        </div>
      )}

      {/* Generated Result Container */}
      {result && !loading && (
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-slate-950/80 p-6 md:p-8 shadow-2xl space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Image Preview */}
            <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-slate-900">
              <img
                src={userImage || result.image}
                alt={result.title}
                className="h-full w-full object-cover"
              />
              <span className="absolute top-2 left-2 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 uppercase">
                AI Analyzed
              </span>
            </div>

            {/* Generated Details */}
            <div className="md:col-span-2 space-y-4 text-left">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  Generated Title
                </span>
                <h3 className="text-lg font-bold text-white leading-snug">
                  {result.title}
                </h3>
              </div>

              {/* Price Estimate Pill */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <DollarSign className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-emerald-200">
                    Est. Market Range: ${result.priceMin} – ${result.priceMax} AUD
                  </div>
                  <div className="text-xs text-slate-300">
                    Suggested Median: <strong>${result.medianPrice.toFixed(2)} AUD</strong>
                  </div>
                </div>
              </div>

              {/* Marketplace Titles */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Tag className="h-3.5 w-3.5 text-blue-400" />
                  <strong>eBay Title:</strong> <span className="text-slate-200 truncate">{result.ebayTitle}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  <strong>Depop Hashtags:</strong> <span className="text-slate-200 truncate">{result.depopTitle}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formatted Description Preview */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-left space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Formatted Description
            </span>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.description}
            </p>
          </div>

          {/* Inline Sign Up CTA Banner */}
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-600/20 p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-blue-300 font-bold text-sm">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Listing ready! Want to save & auto-post this item?</span>
            </div>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Create a 100% free account to save your inventory, scan barcodes, and cross-list to eBay, FB Marketplace, Vinted, & Depop in 1 tap.
            </p>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              <span>Sign Up Free to Save & Cross-List</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
