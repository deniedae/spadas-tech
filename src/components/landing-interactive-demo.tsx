"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Upload, Loader2, ArrowRight, Check, Tag, DollarSign, Layers, Shuffle, RefreshCw } from "lucide-react";

interface SampleItem {
  id: string;
  name: string;
  category: string;
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
    id: "jordan1-chicago",
    name: "Air Jordan 1 Chicago",
    category: "Sneakers",
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80",
    title: "Air Jordan 1 Retro High OG Chicago (2015) Size US 10.5",
    priceMin: 420,
    priceMax: 560,
    medianPrice: 485.0,
    ebayTitle: "Air Jordan 1 Retro High OG Chicago 2015 Size 10.5 555088-101 Authentic",
    fbTitle: "Air Jordan 1 Chicago (2015) US 10.5 - Great Condition w/ Box",
    depopTitle: "air jordan 1 chicago 2015 retro #jordan1 #chicago #sneakers #streetwear",
    description: "Authentic Air Jordan 1 Retro High OG 'Chicago' (2015 release). Size US 10.5. Features high quality varsity red, white, and black leather upper with original Nike Air tongue tagging. Includes original box and extra lacing.",
  },
  {
    id: "nike-jacket",
    name: "Vintage Nike Jacket",
    category: "Streetwear",
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
    category: "Gaming",
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
    name: "Canon AE-1 Film Camera",
    category: "Cameras",
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
  {
    id: "gameboy-color",
    name: "Game Boy Color Purple",
    category: "Gaming",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    title: "Nintendo Game Boy Color Atomic Purple Handheld Console",
    priceMin: 90,
    priceMax: 130,
    medianPrice: 110.0,
    ebayTitle: "Nintendo Game Boy Color Atomic Purple CGB-001 Handheld Console Tested OEM",
    fbTitle: "Nintendo Game Boy Color (Atomic Purple) - Tested & Working",
    depopTitle: "nintendo gameboy color atomic purple #gameboy #nintendo #retro #gaming",
    description: "Original Nintendo Game Boy Color console in iconic Atomic Purple translucent shell. Fully cleaned and tested — screen, speaker audio, directional pad, and buttons function flawlessly.",
  },
  {
    id: "lv-bag",
    name: "Louis Vuitton Pochette",
    category: "Luxury",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
    title: "Louis Vuitton Monogram Pochette Accessoires Canvas Handbag",
    priceMin: 620,
    priceMax: 820,
    medianPrice: 710.0,
    ebayTitle: "Louis Vuitton Monogram Pochette Accessoires Canvas Handbag Vintage Authentic",
    fbTitle: "Authentic Louis Vuitton Monogram Pochette Bag w/ Dustbag",
    depopTitle: "louis vuitton pochette monogram canvas #louisvuitton #designer #luxury",
    description: "Authentic Louis Vuitton Pochette Accessoires in classic Monogram canvas. Honey patina leather strap with minimal wear, brass hardware retains gold shine, clean interior canvas.",
  },
  {
    id: "sony-headphones",
    name: "Sony WH-1000XM4",
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    title: "Sony WH-1000XM4 Wireless Noise Canceling Headphones Black",
    priceMin: 180,
    priceMax: 240,
    medianPrice: 215.0,
    ebayTitle: "Sony WH-1000XM4 Wireless Noise Canceling Headphones Black w/ Case Cable",
    fbTitle: "Sony WH-1000XM4 Headphones Black - Excellent Condition",
    depopTitle: "sony wh1000xm4 wireless noise canceling headphones #sony #audio",
    description: "Sony WH-1000XM4 industry-leading noise-canceling wireless headphones in matte black. Sound quality, active noise cancellation, and battery hold strong. Includes original hard carrying case.",
  },
  {
    id: "pokemon-charizard",
    name: "Charizard Holo Card",
    category: "Collectibles",
    image: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=600&q=80",
    title: "Pokémon Base Set Unlimited Charizard Holo 4/102 Rare Card",
    priceMin: 220,
    priceMax: 380,
    medianPrice: 295.0,
    ebayTitle: "Pokemon Base Set Unlimited Charizard Holo 4/102 Holofoil Card LP Light Play",
    fbTitle: "Base Set Charizard Holo 4/102 - Light Play",
    depopTitle: "base set charizard holo pokemon card #pokemon #charizard #vintage",
    description: "1999 Pokémon TCG Base Set Unlimited Charizard Holofoil card 4/102. Light play condition with vibrant holo pattern, crisp surface art, and clean edges. Preserved inside top-loader sleeve.",
  },
  {
    id: "seiko-skx007",
    name: "Seiko SKX007 Diver",
    category: "Watches",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
    title: "Seiko SKX007K Automatic 200m Diver Watch Stainless Steel",
    priceMin: 270,
    priceMax: 370,
    medianPrice: 315.0,
    ebayTitle: "Seiko SKX007 Automatic Diver 200m 7S26 0020 Mens Watch Stainless Steel OEM",
    fbTitle: "Seiko SKX007 Automatic Diver Watch - Great Condition",
    depopTitle: "seiko skx007 automatic diver watch #seiko #watch #diver #automatic",
    description: "Iconic discontinued Seiko SKX007 200m Automatic Diver's watch. 7S26 movement keeps accurate time, crisp 120-click unidirectional bezel, original Jubilee bracelet included.",
  },
  {
    id: "bose-wave",
    name: "Bose Wave System IV",
    category: "Audio",
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
    title: "Bose Wave Music System IV Platinum White w/ Remote & Power Cable",
    priceMin: 190,
    priceMax: 270,
    medianPrice: 230.0,
    ebayTitle: "Bose Wave Music System IV Platinum White CD Player FM AM Radio Remote Tested",
    fbTitle: "Bose Wave Music System IV White - CD & Radio Tested",
    depopTitle: "bose wave music system iv white #bose #audio #speaker #cdplayer",
    description: "Bose Wave Music System IV in sleek Platinum White. CD player and AM/FM digital tuner tested and working perfectly with signature room-filling sound. Includes original credit card remote control.",
  },
  {
    id: "switch-oled",
    name: "Nintendo Switch OLED",
    category: "Gaming",
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=600&q=80",
    title: "Nintendo Switch OLED Model White Edition Console Set",
    priceMin: 260,
    priceMax: 330,
    medianPrice: 295.0,
    ebayTitle: "Nintendo Switch OLED Model White 64GB Console Set Complete in Box",
    fbTitle: "Nintendo Switch OLED White - Like New in Box",
    depopTitle: "nintendo switch oled white edition #nintendo #switch #gaming",
    description: "Nintendo Switch OLED Model in White. Features 7-inch OLED screen, 64GB internal storage, and enhanced audio dock. Complete with original box, Joy-Cons, HDMI, and power adapter.",
  },
  {
    id: "abbey-road-vinyl",
    name: "The Beatles Abbey Road",
    category: "Vinyl Records",
    image: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=600&q=80",
    title: "The Beatles Abbey Road Original 1969 Stereo Vinyl LP Record",
    priceMin: 75,
    priceMax: 120,
    medianPrice: 95.0,
    ebayTitle: "The Beatles Abbey Road Vinyl LP Original 1969 Pressing PCS 7088 VG+",
    fbTitle: "The Beatles Abbey Road Original 1969 Vinyl LP Record",
    depopTitle: "the beatles abbey road 1969 vinyl record #beatles #vinyl #records",
    description: "Original 1969 pressing of The Beatles landmark album 'Abbey Road'. Vinyl sleeve retains rich artwork color; record gloss is high with minimal faint hairline sleeve scuffs (VG+ audio grading).",
  },
];

export default function LandingInteractiveDemo() {
  const [selectedSample, setSelectedSample] = useState<SampleItem>(SAMPLES[0]);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<SampleItem | null>(SAMPLES[0]);

  // Pick a fresh random item every time user lands on page
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * SAMPLES.length);
    const initialItem = SAMPLES[randomIdx];
    setSelectedSample(initialItem);
    setResult(initialItem);
  }, []);

  const spinRandomItem = () => {
    let nextIdx = Math.floor(Math.random() * SAMPLES.length);
    // ensure it picks a different item
    if (SAMPLES[nextIdx].id === selectedSample.id) {
      nextIdx = (nextIdx + 1) % SAMPLES.length;
    }
    const nextItem = SAMPLES[nextIdx];
    setSelectedSample(nextItem);
    setUserImage(null);
    runDemoAnalysis(nextItem);
  };

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

    const customResult: SampleItem = {
      id: "custom-upload",
      name: file.name.replace(/\.[^/.]+$/, ""),
      category: "Custom Item",
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

    setTimeout(() => setLoadingStep(2), 900);
    setTimeout(() => setLoadingStep(3), 1800);

    setTimeout(() => {
      setLoading(false);
      setResult(targetItem);
    }, 2600);
  };

  return (
    <section className="my-16 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/80 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-300">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Interactive Live Demo
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Try AI Listing Instantly
        </h2>
        <p className="text-sm text-slate-300">
          Upload a sample photo or choose from <strong className="text-blue-400">{SAMPLES.length}+ live templates</strong> to test Spadas AI in real-time.
        </p>
      </div>

      {/* Random Item Spinner & Category Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={spinRandomItem}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 px-5 text-xs font-bold text-white shadow-md transition hover:opacity-90 active:scale-95"
        >
          <Shuffle className="h-4 w-4" />
          <span>🎲 Spin Random Item ({SAMPLES.length} Available)</span>
        </button>
      </div>

      {/* Rotating Sample Selector */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
        {SAMPLES.slice(0, 6).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelectSample(s)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              selectedSample?.id === s.id
                ? "border-blue-400 bg-blue-600 text-white shadow-sm"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10"
            }`}
          >
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Upload Dropzone */}
      <div className="mx-auto max-w-xl mb-10">
        <label className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-slate-950/40 p-7 text-center transition hover:border-blue-500/50 hover:bg-slate-950/60 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-white">
            Upload your own photo
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            JPG or PNG — see instant AI market comps & description
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
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-slate-950/90 p-6 md:p-8 shadow-2xl space-y-6">
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
                  Generated Title • {result.category}
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
