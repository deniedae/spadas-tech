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

const DEFAULT_STEPS: ScanStep[] = [
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
    label: "Querying marketplace sold comps...",
    sublabel: "Querying live eBay cleared sold listings",
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
}: ScanProgressiveLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Synchronize immediately if explicit stage is provided
  useEffect(() => {
    if (!isActive) {
      setCurrentStepIndex(0);
      return;
    }

    if (stage === "comps") {
      setCurrentStepIndex(2); // Immediately jump to "Querying marketplace sold comps..."
      return;
    }

    if (stage === "profit") {
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

  const currentStep = DEFAULT_STEPS[currentStepIndex] || DEFAULT_STEPS[0];
  const StepIcon = currentStep.icon;

  const displayLabel = customLabel || (currentStepIndex === 2 && detectedTitle
    ? "Querying marketplace sold comps..."
    : currentStep.label);

  const displaySublabel = detectedTitle
    ? `Live eBay comps: "${detectedTitle}"`
    : currentStep.sublabel;

  if (variant === "minimal") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/40 px-3.5 py-1.5 shadow-xl backdrop-blur-md text-xs font-bold text-cyan-300 animate-in fade-in duration-200 ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0" />
        <span className="truncate">{displayLabel}</span>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div
        className={`w-full max-w-sm mx-auto rounded-3xl backdrop-blur-md bg-black/60 border border-white/15 p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto select-none ${className}`}
      >
        {/* Step Indicator Header with Visual Anchor Thumbnail */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewImage ? (
              <div className="relative h-8 w-8 rounded-xl overflow-hidden border border-cyan-400/50 shadow-md shrink-0">
                <img
                  src={previewImage}
                  alt="Scanned Object"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shrink-0">
                <StepIcon className="h-4 w-4 animate-pulse" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-cyan-300 truncate">
                {displayLabel}
              </span>
              <span className="text-[10px] text-slate-300/90 truncate">
                {displaySublabel}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-cyan-400 shrink-0">
            {currentStep.progress}%
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden mb-3.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${currentStep.progress}%` }}
          />
        </div>

        {/* Structural Card Skeleton Placeholder */}
        <div className="space-y-2.5 pt-1">
          {/* Title Area: Displays real detected title if vision completed, or shimmer bar */}
          {detectedTitle ? (
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0 animate-pulse" />
              <span className="text-sm font-black text-white truncate">
                {detectedTitle}
              </span>
            </div>
          ) : (
            <div className="h-4 w-3/4 rounded-md bg-white/10 animate-pulse" />
          )}

          {/* Brand/Category Tag Skeleton */}
          <div className="flex items-center gap-2">
            {detectedBrand ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/25 text-cyan-200 border border-cyan-400/40">
                {detectedBrand}
              </span>
            ) : (
              <div className="h-3 w-16 rounded-full bg-white/10 animate-pulse" />
            )}
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300/90 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30 animate-pulse">
              <TrendingUp className="h-3 w-3 animate-spin text-amber-400 shrink-0" />
              <span>Querying eBay sold comps...</span>
            </div>
          </div>

          {/* Price & Profit Badges Skeleton */}
          <div className="flex items-center justify-between pt-1">
            <div className="h-6 px-3 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center animate-pulse">
              <span className="text-[10px] font-mono font-bold text-slate-300">
                $--- comps
              </span>
            </div>
            <div className="h-6 px-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center animate-pulse">
              <span className="text-[10px] font-black text-emerald-300 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Calculating profit...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default "hud" variant: Floating HUD badge with radar sweep
  return (
    <div
      className={`rounded-2xl backdrop-blur-md bg-black/60 border border-cyan-500/40 p-3 shadow-[0_4px_30px_rgba(6,182,212,0.3)] animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-xs w-full pointer-events-auto ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        {previewImage ? (
          <div className="relative h-8 w-8 rounded-xl overflow-hidden border border-cyan-400/50 shadow-md shrink-0">
            <img
              src={previewImage}
              alt="Scanned Object"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shrink-0">
            <Loader2 className="h-4 w-4 animate-spin" />
            <StepIcon className="absolute h-2.5 w-2.5 text-cyan-300" />
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-white truncate">
              {displayLabel}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-cyan-400 shrink-0">
              {currentStep.progress}%
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 truncate">
            {displaySublabel}
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${currentStep.progress}%` }}
        />
      </div>
    </div>
  );
}
