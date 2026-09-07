"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Camera, TrendingUp, Zap, Loader2, Tag } from "lucide-react";

export interface ScanStep {
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
}

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
    label: "Checking market comps...",
    sublabel: "Querying eBay cleared sold sales",
    icon: TrendingUp,
    progress: 80,
  },
  {
    label: "Calculating net profit...",
    sublabel: "Fees, postage & cop verdict",
    icon: Zap,
    progress: 92,
  },
];

interface ScanProgressiveLoaderProps {
  isActive: boolean;
  variant?: "hud" | "skeleton" | "minimal";
  customLabel?: string;
  className?: string;
}

export function ScanProgressiveLoader({
  isActive,
  variant = "hud",
  customLabel,
  className = "",
}: ScanProgressiveLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentStepIndex(0);
      return;
    }

    // Progression timeline based on real-world vision model round-trip latency
    const t1 = setTimeout(() => setCurrentStepIndex(1), 900);
    const t2 = setTimeout(() => setCurrentStepIndex(2), 2100);
    const t3 = setTimeout(() => setCurrentStepIndex(3), 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isActive]);

  if (!isActive) return null;

  const currentStep = DEFAULT_STEPS[currentStepIndex] || DEFAULT_STEPS[0];
  const StepIcon = currentStep.icon;

  if (variant === "minimal") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/40 px-3.5 py-1.5 shadow-xl backdrop-blur-md text-xs font-bold text-cyan-300 animate-in fade-in duration-200 ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0" />
        <span className="truncate">{customLabel || currentStep.label}</span>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div
        className={`w-full max-w-sm mx-auto rounded-3xl bg-slate-950/90 border border-slate-800/80 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto select-none ${className}`}
      >
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <StepIcon className="h-4 w-4 animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-cyan-300 truncate">
                {customLabel || currentStep.label}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {currentStep.sublabel}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-cyan-400/80 shrink-0">
            {currentStep.progress}%
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden mb-3.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${currentStep.progress}%` }}
          />
        </div>

        {/* Lightweight Shimmering Skeleton Hit Card Placeholder */}
        <div className="space-y-2.5 pt-1">
          {/* Title Skeleton */}
          <div className="h-4 w-3/4 rounded-md bg-slate-800/60 animate-pulse" />
          {/* Brand/Category Tag Skeleton */}
          <div className="flex gap-2">
            <div className="h-3 w-16 rounded-full bg-slate-800/40 animate-pulse" />
            <div className="h-3 w-20 rounded-full bg-slate-800/40 animate-pulse" />
          </div>
          {/* Price & Profit Badges Skeleton */}
          <div className="flex items-center justify-between pt-1">
            <div className="h-6 w-24 rounded-lg bg-slate-800/50 animate-pulse" />
            <div className="h-6 w-20 rounded-lg bg-emerald-500/20 border border-emerald-500/20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Default "hud" variant: Floating HUD badge with radar sweep
  return (
    <div
      className={`rounded-2xl bg-slate-950/95 border border-cyan-500/50 p-3 shadow-[0_4px_30px_rgba(6,182,212,0.3)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-xs w-full pointer-events-auto ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
          <Loader2 className="h-4 w-4 animate-spin" />
          <StepIcon className="absolute h-2.5 w-2.5 text-cyan-300" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-white truncate">
              {customLabel || currentStep.label}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-cyan-400 shrink-0">
              {currentStep.progress}%
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 truncate">
            {currentStep.sublabel}
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-700 ease-out"
          style={{ width: `${currentStep.progress}%` }}
        />
      </div>
    </div>
  );
}
