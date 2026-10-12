"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scan,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Tag,
  DollarSign,
} from "lucide-react";
import { OpenScannerLink } from "@/components/open-scanner-link";

interface ThriftSample {
  id: string;
  name: string;
  category: string;
  tagCost: number;
  medianSold: number;
  priceRange: string;
  ebayFee: number;
  shipping: number;
  netProfit: number;
  soldCount: number;
  condition: string;
  market: string;
  sourceTag: string;
  icon: string;
}

const SAMPLES: ThriftSample[] = [
  {
    id: "camera",
    name: "Yashica Electro 35 GTN 35mm",
    category: "Vintage Electronics",
    tagCost: 15.0,
    medianSold: 85.0,
    priceRange: "A$70 – A$105",
    ebayFee: 11.69,
    shipping: 10.6,
    netProfit: 47.71,
    soldCount: 14,
    condition: "Pre-owned · Good",
    market: "eBay Australia",
    sourceTag: "Thrift Shelf Price: $15.00",
    icon: "📷",
  },
  {
    id: "sneakers",
    name: "Nike Air Max Plus OG Hyper Blue",
    category: "Sneakers & Streetwear",
    tagCost: 35.0,
    medianSold: 155.0,
    priceRange: "A$130 – A$180",
    ebayFee: 21.07,
    shipping: 14.5,
    netProfit: 84.43,
    soldCount: 28,
    condition: "Pre-owned · Very Good",
    market: "eBay Australia",
    sourceTag: "Thrift Rack Price: $35.00",
    icon: "👟",
  },
  {
    id: "pokemon",
    name: "Pokemon Emerald GBA (Authentic OEM)",
    category: "Retro Gaming",
    tagCost: 20.0,
    medianSold: 165.0,
    priceRange: "A$140 – A$190",
    ebayFee: 22.41,
    shipping: 10.6,
    netProfit: 111.99,
    soldCount: 32,
    condition: "Tested Authentic Cartridge",
    market: "eBay Australia",
    sourceTag: "Market Bin Price: $20.00",
    icon: "🎮",
  },
];

export function HeroScannerSimulator() {
  const [selectedSample, setSelectedSample] = useState<ThriftSample>(SAMPLES[0]);
  const [isScanning, setIsScanning] = useState(false);

  const handleSelect = (sample: ThriftSample) => {
    if (sample.id === selectedSample.id) return;
    setIsScanning(true);
    setTimeout(() => {
      setSelectedSample(sample);
      setIsScanning(false);
    }, 220);
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-12 px-2 sm:px-4">
      {/* Outer Card Frame */}
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-cyan-500/25 via-white/10 to-emerald-500/20 shadow-2xl shadow-cyan-950/30">
        <div className="relative rounded-[23px] bg-[#070A10]/95 backdrop-blur-2xl p-4 sm:p-8 overflow-hidden">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                  Interactive Valuation Preview
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Select a sample item to inspect realized sold evidence
              </h3>
            </div>

            {/* Item Switcher Tabs */}
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
                    <span className="truncate max-w-[140px] sm:max-w-none">{sample.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid lg:grid-cols-12 gap-6 pt-6 items-stretch">
            {/* Left: Illustrative Viewfinder Preview (7 cols) */}
            <div className="lg:col-span-7 relative rounded-2xl bg-zinc-950/90 border border-white/[0.1] overflow-hidden flex flex-col justify-between p-4 min-h-[340px]">
              {/* Header Info */}
              <div className="relative z-20 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md">
                  <span className="text-cyan-400">CAMERA PREVIEW</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300">{selectedSample.category}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-emerald-400 font-mono text-[10px]">
                  SOLDS MATCHED
                </div>
              </div>

              {/* Center Target Box */}
              <div className="relative z-20 my-auto flex flex-col items-center justify-center py-6">
                <div
                  className={`relative w-48 sm:w-60 h-36 sm:h-44 transition-all duration-300 ${
                    isScanning ? "scale-95 opacity-50" : "scale-100 opacity-100"
                  }`}
                >
                  {/* Focus Brackets */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

                  {/* Detected Item Info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                    <span className="text-4xl mb-2">{selectedSample.icon}</span>
                    <span className="text-xs font-bold text-white tracking-wide truncate max-w-[95%]">
                      {selectedSample.name}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300 mt-1">
                      {selectedSample.condition}
                    </span>
                  </div>
                </div>

                {/* Sourcing Cost Pill */}
                <div className="mt-3 px-3.5 py-1 rounded-full bg-zinc-900 border border-white/15 text-zinc-300 text-xs font-mono font-medium flex items-center gap-1.5 shadow-md">
                  <Tag className="h-3.5 w-3.5 text-cyan-400" />
                  {selectedSample.sourceTag}
                </div>
              </div>

              {/* Viewfinder Bottom Status */}
              <div className="relative z-20 flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Market: {selectedSample.market}</span>
                </div>
                <div className="text-zinc-400">
                  Evidence: {selectedSample.soldCount} sold listings
                </div>
              </div>
            </div>

            {/* Right: Valuation Breakdown Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              {/* Verdict Header Badge */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sold comps · Strong margin
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Last 90 days
                </span>
              </div>

              {/* Title */}
              <div>
                <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase font-mono">
                  {selectedSample.category}
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-snug">
                  {selectedSample.name}
                </h4>
              </div>

              {/* Profit Box */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-950/50 to-zinc-950 border border-emerald-500/30 p-5 shadow-lg">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                    Estimated Net Take-Home
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Typical: {selectedSample.priceRange}
                  </span>
                </div>

                <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
                  +A${selectedSample.netProfit.toFixed(2)}
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-500/20 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-mono">SOLD MEDIAN</span>
                    <span className="text-white font-bold font-mono">A${selectedSample.medianSold.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-mono">THRIFT COST</span>
                    <span className="text-zinc-300 font-bold font-mono">-A${selectedSample.tagCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-mono">FEES &amp; POST</span>
                    <span className="text-zinc-400 font-bold font-mono">-A${(selectedSample.ebayFee + selectedSample.shipping).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Evidence Provenance Table */}
              <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-3 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Completed Sales Sample</span>
                  <span className="text-zinc-200">{selectedSample.soldCount} realized listings</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Deductions Factored</span>
                  <span className="text-zinc-200">13.4% eBay fee + AusPost Satchel</span>
                </div>
              </div>

              {/* Open Scanner CTA */}
              <OpenScannerLink
                href="/lens"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 font-black px-6 py-3.5 text-sm transition-all duration-150 active:scale-98 shadow-lg shadow-cyan-950/40 cursor-pointer min-h-[48px]"
              >
                <Scan className="h-4 w-4" />
                Scan Item or Barcode
                <ArrowRight className="h-4 w-4" />
              </OpenScannerLink>

              <p className="text-center text-[11px] text-zinc-500">
                3 starter scans included · No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroScannerSimulator;
