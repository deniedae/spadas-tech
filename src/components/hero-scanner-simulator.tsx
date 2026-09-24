"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scan,
  Crosshair,
  TrendingUp,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  DollarSign,
} from "lucide-react";

interface ThriftSample {
  id: string;
  name: string;
  category: string;
  tagCost: number;
  medianSold: number;
  ebayFee: number;
  shipping: number;
  netProfit: number;
  roi: number;
  velocity: string;
  demandRate: string;
  confidence: number;
  sourceTag: string;
  icon: string;
}

const SAMPLES: ThriftSample[] = [
  {
    id: "camera",
    name: "Yashica Electro 35 GTN 35mm",
    category: "Vintage Electronics",
    tagCost: 3.99,
    medianSold: 89.00,
    ebayFee: 11.79,
    shipping: 10.50,
    netProfit: 62.72,
    roi: 1572,
    velocity: "1-3 Days",
    demandRate: "88% Sell-Through",
    confidence: 99.4,
    sourceTag: "Goodwill Shelf Tag: $3.99",
    icon: "📷",
  },
  {
    id: "sneakers",
    name: "Nike Air Max Plus OG Hyper Blue",
    category: "Sneakers & Streetwear",
    tagCost: 18.00,
    medianSold: 165.00,
    ebayFee: 21.86,
    shipping: 14.50,
    netProfit: 110.64,
    roi: 614,
    velocity: "Immediate (< 24h)",
    demandRate: "96% Sell-Through",
    confidence: 98.7,
    sourceTag: "Thrift Rack Tag: $18.00",
    icon: "👟",
  },
  {
    id: "pokemon",
    name: "Pokemon Emerald GBA (Authentic PCB)",
    category: "Retro Gaming",
    tagCost: 5.00,
    medianSold: 195.00,
    ebayFee: 25.84,
    shipping: 8.50,
    netProfit: 155.66,
    roi: 3113,
    velocity: "Same-Day Flip",
    demandRate: "99% Grail",
    confidence: 99.8,
    sourceTag: "Garage Sale Bin: $5.00",
    icon: "🎮",
  },
];

export default function HeroScannerSimulator() {
  const [selectedSample, setSelectedSample] = useState<ThriftSample>(SAMPLES[0]);
  const [isScanning, setIsScanning] = useState(false);

  const handleSelect = (sample: ThriftSample) => {
    if (sample.id === selectedSample.id) return;
    setIsScanning(true);
    setTimeout(() => {
      setSelectedSample(sample);
      setIsScanning(false);
    }, 280);
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-12 px-2 sm:px-4">
      {/* Container Frame with Obsidian Glow */}
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-cyan-500/30 via-white/10 to-emerald-500/20 shadow-2xl shadow-cyan-950/40">
        <div className="relative rounded-[23px] bg-[#070A10]/95 backdrop-blur-2xl p-4 sm:p-8 overflow-hidden">
          
          {/* Subtle Ambient Radial Cones */}
          <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                </span>
                <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                  Interactive Live AR Viewfinder
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Tap an item to test optical detection
              </h3>
            </div>

            {/* Thrift Item Quick Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {SAMPLES.map((sample) => {
                const isActive = sample.id === selectedSample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelect(sample)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 border ${
                      isActive
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-950/50"
                        : "bg-zinc-900/60 border-white/[0.08] text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <span>{sample.icon}</span>
                    <span className="truncate max-w-[130px] sm:max-w-none">{sample.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Viewport Split Grid */}
          <div className="grid lg:grid-cols-12 gap-6 pt-6 items-center">
            
            {/* Left: Simulated AR Camera Viewfinder (7 cols) */}
            <div className="lg:col-span-7 relative aspect-[4/3] sm:aspect-[16/10] rounded-2xl bg-zinc-950/90 border border-white/[0.1] overflow-hidden flex flex-col justify-between p-4 shadow-inner">
              
              {/* Camera Grid Background Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
              
              {/* Animated Laser Sweep Line */}
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-sweep pointer-events-none z-10 opacity-80" />

              {/* Viewfinder Header Telemetry */}
              <div className="relative z-20 flex items-center justify-between text-[11px] font-mono font-bold text-zinc-400">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md">
                  <span className="text-cyan-400">FPS: 60</span>
                  <span className="text-zinc-600">|</span>
                  <span>ISO 100</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-emerald-400">TARGET ACQUIRED</span>
                </div>
                <div className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-cyan-300 font-mono text-[10px]">
                  REC ● 4K 60
                </div>
              </div>

              {/* Center Holographic Target Reticle */}
              <div className="relative z-20 my-auto flex flex-col items-center justify-center">
                <div className={`relative w-48 sm:w-60 h-36 sm:h-44 transition-all duration-300 ${isScanning ? "scale-95 opacity-50" : "scale-100 opacity-100"}`}>
                  
                  {/* AR Corner Brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

                  {/* Pulsing Crosshair Center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Crosshair className="h-8 w-8 text-cyan-400/40 animate-spin-slow" />
                  </div>

                  {/* Center Detected Subject Card */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-4xl mb-1 filter drop-shadow-md">{selectedSample.icon}</span>
                    <span className="text-xs font-bold text-white tracking-wide truncate max-w-[90%]">
                      {selectedSample.name}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 mt-0.5">
                      LOCK CONFIDENCE: {selectedSample.confidence}%
                    </span>
                  </div>
                </div>

                {/* Floating Source Tag Badge */}
                <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono tracking-tight flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  {selectedSample.sourceTag}
                </div>
              </div>

              {/* Viewfinder Bottom Telemetry Bar */}
              <div className="relative z-20 flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Optical Horizon Level</span>
                </div>
                <div className="text-cyan-400 font-bold">
                  Latency: 0.38s
                </div>
              </div>
            </div>

            {/* Right: Instant Valuation & Net Profit Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              
              {/* Verdict Header Badge */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wide uppercase">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  VERIFIED MUST COP
                </span>
                <span className="text-xs font-bold text-zinc-400 font-mono">
                  {selectedSample.demandRate}
                </span>
              </div>

              {/* Title & Category */}
              <div>
                <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase font-mono">
                  {selectedSample.category}
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white mt-1 leading-snug">
                  {selectedSample.name}
                </h4>
              </div>

              {/* Big Profit Highlight Box */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 to-zinc-950 border border-emerald-500/30 p-5 shadow-xl shadow-emerald-950/30">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider font-mono">
                    Estimated Net Profit
                  </span>
                  <span className="text-xs font-extrabold font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                    +{selectedSample.roi}% ROI
                  </span>
                </div>
                
                <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
                  +${selectedSample.netProfit.toFixed(2)}
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-500/20 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-mono">EBAY SOLD AVG</span>
                    <span className="text-white font-bold font-mono">${selectedSample.medianSold.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-mono">THRIFT COST</span>
                    <span className="text-red-400 font-bold font-mono">-${selectedSample.tagCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-mono">FEES &amp; POST</span>
                    <span className="text-zinc-400 font-bold font-mono">-${(selectedSample.ebayFee + selectedSample.shipping).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Turnaround Velocity */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-xs font-medium">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  Estimated Sales Velocity:
                </span>
                <span className="text-white font-bold font-mono">
                  {selectedSample.velocity}
                </span>
              </div>

              {/* Launch CTA */}
              <Link
                href="/lens"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 font-black px-6 py-4 text-sm transition-all duration-150 active:scale-98 shadow-lg shadow-cyan-950/50 cursor-pointer min-h-[50px]"
              >
                <Scan className="h-4 w-4" />
                Launch Live Scanner on Your Phone
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="text-center text-[11px] text-zinc-500">
                10 free scans daily · Works right in your browser or install as app
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
