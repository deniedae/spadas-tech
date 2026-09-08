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

  const currentStep = DEFAULT_STEPS[currentStepIndex] || DEFAULT_STEPS[0];
  const StepIcon = currentStep.icon;

  const isComplete = stage === "complete";
  const displayProgress = isComplete ? 100 : currentStep.progress;

  const displayLabel = isComplete
    ? "Comps Valued & Verified"
    : customLabel || (currentStepIndex === 2 && detectedTitle
      ? "Querying marketplace sold comps..."
      : currentStep.label);

  const displaySublabel = isComplete
    ? (detectedTitle ? `Verified: ${detectedTitle}` : "Ready for pricing & profit analysis")
    : detectedTitle
    ? `Live eBay comps: "${detectedTitle}"`
    : currentStep.sublabel;

  if (variant === "minimal") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/40 px-3 py-1 shadow-xl backdrop-blur-md text-xs font-bold text-cyan-300 animate-in fade-in duration-200 ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0" />
        <span className="truncate">{displayLabel}</span>
      </div>
    );
  }

  // Streamlined Non-Obstructing Pill & Top Progress Bar (Replaces massive grey skeleton)
  return (
    <div className={`flex flex-col items-center gap-1.5 pointer-events-auto select-none ${className}`}>
      {/* 1. Top Edge Laser Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-slate-950/60 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.8)] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_12px_#22d3ee]"
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* 2. Floating Translucent HUD Status Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/40 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.2)] text-xs animate-in fade-in slide-in-from-top-2 duration-200">
        {previewImage ? (
          <div className="relative h-4 w-4 rounded-full overflow-hidden border border-cyan-400/60 shrink-0 shadow-sm">
            <img src={previewImage} alt="Scan target" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 shrink-0">
            <StepIcon className="h-2.5 w-2.5 animate-spin text-cyan-400" />
          </div>
        )}

        <div className="flex items-center gap-1.5 min-w-0 max-w-[240px] sm:max-w-xs">
          {detectedTitle ? (
            <span className="font-black text-white truncate max-w-[140px] text-[11px]">
              {detectedTitle}
            </span>
          ) : null}
          <span className="text-cyan-300 font-semibold truncate text-[11px]">
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
