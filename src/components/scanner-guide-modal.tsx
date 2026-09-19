"use client";

import React, { useState } from "react";
import {
  X,
  Scan,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Play,
  ArrowRight,
} from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface ScannerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrySampleScan?: () => void;
}

export function ScannerGuideModal({
  isOpen,
  onClose,
  onTrySampleScan,
}: ScannerGuideModalProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#0B0E17] border border-white/10 shadow-2xl p-5 sm:p-6 text-white space-y-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                How to Scan with Spadas Lens
              </h2>
              <p className="text-[11px] text-zinc-400">
                Master 300ms shelf scanning in 3 steps
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("tap");
              onClose();
            }}
            className="h-7 w-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            aria-label="Close guide"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Visual Steps Navigator */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
              activeStep === 1
                ? "bg-white text-zinc-950 font-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            1. Frame It
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
              activeStep === 2
                ? "bg-emerald-500 text-zinc-950 font-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            2. Lock Focus
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
              activeStep === 3
                ? "bg-cyan-400 text-zinc-950 font-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            3. Instant Comps
          </button>
        </div>

        {/* Step 1 Content */}
        {activeStep === 1 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Visual Viewfinder Simulation */}
            <div className="relative aspect-video rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden flex items-center justify-center p-4">
              {/* Corner Brackets Demonstration */}
              <div className="relative w-36 h-28 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/70" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/70" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/70" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/70" />
                <div className="text-center space-y-1">
                  <Scan className="h-6 w-6 text-zinc-500 mx-auto" />
                  <span className="text-[10px] text-zinc-400 block font-mono">
                    Keep item in frame
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h3 className="text-xs font-bold text-white">
                Step 1: Align Item Within Brackets
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Position any clothing label, sneaker, retro game, or vintage item
                inside the 4 white corner brackets. Maintain a distance of 15–30 cm
                for sharp optical clarity.
              </p>
            </div>
          </div>
        )}

        {/* Step 2 Content */}
        {activeStep === 2 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Visual Focus Lock Demonstration */}
            <div className="relative aspect-video rounded-2xl bg-zinc-950 border border-emerald-500/20 overflow-hidden flex items-center justify-center p-4">
              <div className="relative w-36 h-28 flex items-center justify-center">
                {/* Emerald Focus Lock Brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 transition-colors duration-200" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 transition-colors duration-200" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 transition-colors duration-200" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 transition-colors duration-200" />
                <div className="text-center space-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" /> Focus Locked
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h3 className="text-xs font-bold text-white">
                Step 2: Hold Steady for 200ms
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Hold your device steady for a split second. The corner brackets will
                snap from white to <strong className="text-emerald-400">emerald green</strong> when
                the optical engine locks focus and initiates sub-300ms valuation.
              </p>
            </div>
          </div>
        )}

        {/* Step 3 Content */}
        {activeStep === 3 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Visual Comps Card Demonstration */}
            <div className="rounded-2xl bg-zinc-950 border border-cyan-500/30 p-3.5 space-y-2 text-left shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Real-Time Sold Comps
                </span>
                <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                  MUST COP
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                Vintage 90s Nike Embroidered Swoosh Crewneck
              </p>
              <div className="flex items-baseline justify-between pt-1 border-t border-white/[0.08] text-[11px]">
                <span className="text-zinc-400">Sold Median: <strong className="text-white">$85.00 AUD</strong></span>
                <span className="text-emerald-400 font-bold">+ $68.00 Net</span>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h3 className="text-xs font-bold text-white">
                Step 3: Tap Valuation for eBay Comps & Drafts
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tap the card to view realized 30-day Australian sold transactions,
                deduct postage and platform fees, and push a ready-to-post listing
                directly into your eBay account.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-white/[0.08]">
          {activeStep < 3 ? (
            <button
              type="button"
              onClick={() => setActiveStep((prev) => Math.min(3, prev + 1))}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Next Step</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("success");
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Got it, Start Scanning!</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
