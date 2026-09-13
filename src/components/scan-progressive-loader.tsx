"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Camera, TrendingUp, Zap, Loader2, Tag } from "lucide-react";

export interface ScanStep {
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
}

export type ScanStage = "vision" | "comps" | "profit" | "complete";

const STANDARD_STEPS: ScanStep[] = [
  {
    label: "Analyzing image...",
    sublabel: "Visual feature detection",
    icon: Camera,
    progress: 25,
  },
  {
    label: "Extracting brand & tags...",
    sublabel: "OCR & condition appraisal",
    icon: Tag,
    progress: 55,
  },
  {
    label: "Querying historical eBay sold comps...",
    sublabel: "Live eBay cleared sold listings",
    icon: TrendingUp,
    progress: 82,
  },
  {
    label: "Calculating net profit & verdict...",
    sublabel: "Platform fees, shipping & cop rating",
    icon: Zap,
    progress: 95,
  },
];

const INTEL_STEPS: ScanStep[] = [
  {
    label: "Analyzing image...",
    sublabel: "Visual feature detection",
    icon: Camera,
    progress: 25,
  },
  {
    label: "Extracting brand & tags...",
    sublabel: "OCR & condition appraisal",
    icon: Tag,
    progress: 55,
  },
  {
    label: "Querying marketplace & local P2P comps...",
    sublabel: "Aggregating eBay comps & marketplace intel",
    icon: TrendingUp,
    progress: 82,
  },
  {
    label: "Calculating net profit & verdict...",
    sublabel: "Platform fees, shipping & cop rating",
    icon: Zap,
    progress: 95,
  },
];

interface ScanProgressiveLoaderProps {
  isActive: boolean;
  stage?: ScanStage;
  variant?: "hud" | "skeleton" | "minimal";
  customLabel?: string;
  className?: string;
  detectedTitle?: string;
  detectedBrand?: string;
  previewImage?: string | null;
  isIntelMode?: boolean;
}

export function ScanProgressiveLoader({
  isActive,
  stage,
  variant = "hud",
  customLabel,
  className = "",
  detectedTitle,
  detectedBrand,
  previewImage,
  isIntelMode = false,
}: ScanProgressiveLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const activeSteps = isIntelMode ? INTEL_STEPS : STANDARD_STEPS;

  // Synchronize immediately if explicit stage is provided
  useEffect(() => {
    if (!isActive) {
      setCurrentStepIndex(0);
      return;
    }

    if (stage === "comps") {
      setCurrentStepIndex(2); // Jump to comps query step
      return;
    }

    if (stage === "profit") {
      setCurrentStepIndex(3);
      return;
    }

    if (stage === "complete") {
      setCurrentStepIndex(3);
      return;
    }

    // Default timeline progression if no explicit stage is forced
    const t1 = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.max(prev, 1));
    }, 850);

    const t2 = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.max(prev, 2));
    }, 1800);

    const t3 = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.max(prev, 3));
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isActive, stage]);

  if (!isActive) return null;

  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];
  const StepIcon = currentStep.icon;

  const isComplete = stage === "complete";
  const displayProgress = isComplete ? 100 : currentStep.progress;

  const displayLabel = isComplete
    ? (isIntelMode ? "Intel Comps Valued & Verified" : "eBay Comps Valued & Verified")
    : customLabel || (currentStepIndex === 2 && detectedTitle
      ? (isIntelMode ? "Querying marketplace & local P2P comps..." : "Querying historical eBay sold comps...")
      : currentStep.label);

  const displaySublabel = isComplete
    ? (detectedTitle ? `Verified: ${detectedTitle}` : "Ready for pricing & profit analysis")
    : detectedTitle
    ? (isIntelMode ? `Marketplace & eBay comps: "${detectedTitle}"` : `Live eBay comps: "${detectedTitle}"`)
    : currentStep.sublabel;

  if (variant === "skeleton") {
    return (
      <div className={`w-full max-w-sm mx-auto select-none ${className}`}>
        <div className="relative rounded-2xl bg-[#080C18] border border-cyan-500/40 p-3.5 shadow-[0_0_25px_rgba(6,182,212,0.15)] overflow-hidden">
          {/* Pulsing Laser Line Traversing Vertically */}
          <div className="absolute inset-x-0 h-[2px] pointer-events-none z-20 laser-scan-line-y">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]" />
          </div>

          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="relative h-5 w-5 rounded-full border border-cyan-400/40 bg-cyan-950/60 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 radar-sweep-cone" />
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee]" />
              </div>
              <span className="text-[11px] font-mono font-black text-cyan-300 uppercase tracking-wider">
                {displayLabel}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
              {displayProgress}%
            </span>
          </div>

          {detectedTitle && (
            <p className="text-xs font-bold text-white truncate mb-2">
              {detectedTitle}
            </p>
          )}

          {/* Micro Skeleton Rows */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-white/[0.06] laser-skeleton" />
            <div className="h-3 w-4/5 rounded bg-white/[0.04] laser-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div
        className={`relative inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/40 px-3 py-1 shadow-xl backdrop-blur-md text-xs font-bold text-cyan-300 animate-in fade-in duration-200 overflow-hidden ${className}`}
      >
        {/* Subtle sweeping laser line */}
        <div className="absolute inset-y-0 w-8 pointer-events-none laser-scan-line-x">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
        </div>

        {/* Radar Blip Reticle */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="h-3 w-3 rounded-full border border-cyan-400/50 bg-cyan-950/60 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 radar-sweep-cone" />
            <div className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_4px_#22d3ee]" />
          </div>
        </div>
        <span className="truncate">{displayLabel}</span>
      </div>
    );
  }

  // Streamlined Non-Obstructing Pill & Top Progress Bar with Smooth State Transitions & Radar Sweep
  return (
    <div className={`flex flex-col items-center gap-1.5 pointer-events-auto select-none ${className}`}>
      {/* 1. Top Edge Laser Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-slate-950/60 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.8)] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_12px_#22d3ee] laser-shimmer"
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* 2. Floating Translucent HUD Status Pill with Radar Sweep & Laser Line */}
      <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/40 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.2)] text-xs animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
        {/* Subtle sweeping horizontal laser line */}
        <div className="absolute inset-y-0 w-12 pointer-events-none laser-scan-line-x">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        </div>

        {previewImage ? (
          <div className="relative h-4 w-4 rounded-full overflow-hidden border border-cyan-400/60 shrink-0 shadow-sm">
            <img src={previewImage} alt="Scan target" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shrink-0 overflow-hidden">
            {isComplete ? (
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            ) : (
              <>
                <div className="absolute inset-0 radar-sweep-cone" />
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee]" />
              </>
            )}
          </div>
        )}

        <div key={`${currentStepIndex}-${displayLabel}`} className="flex items-center gap-1.5 min-w-0 max-w-[240px] sm:max-w-xs lens-stage-morph">
          {detectedTitle ? (
            <span className="font-black text-white truncate max-w-[140px] text-[11px]">
              {detectedTitle}
            </span>
          ) : null}
          <span className={`font-semibold truncate text-[11px] ${isComplete ? "text-emerald-300 font-bold" : "text-cyan-300"}`}>
            {displayLabel}
          </span>
        </div>

        <span className="text-[10px] font-mono font-black text-cyan-400 pl-1.5 border-l border-cyan-500/30 shrink-0">
          {displayProgress}%
        </span>
      </div>
    </div>
  );
}
