"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingCarousel({ onComplete, onSkip }: OnboardingCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);

  const slides = useMemo(
    () => [
      {
        id: 0,
        badge: "INSTANT OPTICAL VISION",
        title: "Stop guessing what to charge",
        description:
          "Point your camera at any thrift find or scan its barcode. Real-time optical vision fetches 30-day verified eBay sold comps directly.",
        icon: Zap,
        accentColor: "from-cyan-500 to-blue-600",
        tagColor: "bg-cyan-950/70 border-cyan-800/60 text-cyan-300",
        preview: (
          <div className="relative w-full max-w-xs mx-auto p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-3 select-none">
            {/* Mock Camera Viewfinder */}
            <div className="relative h-32 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-cyan-500/30 overflow-hidden flex flex-col justify-between p-2.5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none" />

              {/* Viewfinder Reticle Corners */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400 rounded-br" />

              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-cyan-300 z-10">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  LIVE OPTICAL COMPS
                </span>
                <span className="text-zinc-500">VERIFIED</span>
              </div>

              <div className="z-10 p-2 rounded-lg bg-zinc-950/90 border border-cyan-500/40">
                <div className="text-xs font-bold text-white truncate">Vintage 90s Ralph Lauren Polo</div>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-emerald-400 font-bold">
                  <span>Sold Median: $48.50</span>
                  <span className="text-[10px] text-zinc-400">18 sold comps</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400 font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Realized Sold Comps
              </span>
              <span>eBay AU / US Depth</span>
            </div>
          </div>
        ),
      },
      {
        id: 1,
        badge: "REAL-TIME PROFIT WATERFALL",
        title: "Know your real net profit",
        description:
          "Never get burned by hidden fees. Auto-deduct your op-shop tag cost, 13.4% eBay seller cut, and regional postage tiers before buying.",
        icon: DollarSign,
        accentColor: "from-emerald-500 to-teal-600",
        tagColor: "bg-emerald-950/70 border-emerald-800/60 text-emerald-300",
        preview: (
          <div className="relative w-full max-w-xs mx-auto p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-2.5 select-none font-mono">
            <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-zinc-800">
              <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Financial Ledger</span>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                +$28.40 Net Take-Home
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block text-[9px]">Gross Sale</span>
                <span className="text-white font-bold text-xs">$52.00</span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block text-[9px]">Thrift Tag</span>
                <span className="text-rose-400 font-bold text-xs">−$8.00</span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block text-[9px]">eBay Fees (13.4%)</span>
                <span className="text-rose-400 font-bold text-xs">−$7.27</span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block text-[9px]">Parcel Satchel</span>
                <span className="text-rose-400 font-bold text-xs">−$8.33</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 px-1 text-[10px] text-zinc-400">
              <span>ROI: <strong className="text-emerald-400">+355%</strong></span>
              <span>AusPost Standard Satchel</span>
            </div>
          </div>
        ),
      },
      {
        id: 2,
        badge: "OUTLIER & TRAP SHIELD",
        title: "Avoid bad inventory & outliers",
        description:
          "Instantly filter out slow-moving sits and fake asks. See real sell-through velocity, active competitor asks, and clear algorithmic Buy/Pass verdicts.",
        icon: Activity,
        accentColor: "from-purple-500 to-indigo-600",
        tagColor: "bg-purple-950/70 border-purple-800/60 text-purple-300",
        preview: (
          <div className="relative w-full max-w-xs mx-auto p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-3 select-none">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                BUY · HIGH MARGIN
              </span>
              <span className="text-[11px] font-mono text-zinc-400">~2–4 days turn</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Sell-Through Rate</div>
                <div className="text-sm font-bold text-emerald-400 pt-0.5">High Demand</div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Active Asks</div>
                <div className="text-sm font-bold text-zinc-100 pt-0.5">3 Competitors</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Thrift trap detection: zero reproduction risk</span>
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const handleNext = useCallback(() => {
    triggerTactileHaptic("selection");
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      // Completed last slide
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hasSeenOnboarding", "true");
          localStorage.setItem("hasCompletedOnboarding", "true");
        } catch {}
      }
      onComplete();
    }
  }, [currentSlide, slides.length, onComplete]);

  const handleSkip = useCallback(() => {
    triggerTactileHaptic("light");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hasSeenOnboarding", "true");
        localStorage.setItem("hasCompletedOnboarding", "true");
      } catch {}
    }
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }, [onSkip, onComplete]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null) {
      const delta = touchDeltaXRef.current;
      if (delta < -45 && currentSlide < slides.length - 1) {
        handleNext();
      } else if (delta > 45 && currentSlide > 0) {
        triggerTactileHaptic("selection");
        setCurrentSlide((prev) => prev - 1);
      }
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" && currentSlide > 0) {
        e.preventDefault();
        setCurrentSlide((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, currentSlide]);

  const slide = slides[currentSlide];

  return (
    <div
      role="region"
      aria-label="App Walkthrough"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[99999] flex flex-col justify-between bg-[#06080F] text-zinc-100 p-4 sm:p-6 select-none overflow-hidden"
    >
      {/* Ambient Radial Glow Backdrop */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-72 bg-gradient-to-b from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl" />

      {/* Top Header Bar: Progress Dots & Skip Button */}
      <div className="relative z-10 flex items-center justify-between pt-[max(0.5rem,calc(env(safe-area-inset-top)+0.25rem))]">
        {/* Pagination Dots Indicator */}
        <div className="flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                triggerTactileHaptic("light");
                setCurrentSlide(idx);
              }}
              aria-label={`Go to card ${idx + 1}`}
              aria-current={currentSlide === idx ? "true" : undefined}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentSlide === idx
                  ? "w-7 bg-white shadow-sm"
                  : "w-2 bg-zinc-800 hover:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Main Content Area (Animated Crossfade Slide Container) */}
      <div
        key={slide.id}
        className="relative z-10 flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full py-6 space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-300"
      >
        {/* Visual Preview Graphic */}
        <div className="w-full transition-transform duration-300 transform scale-100">
          {slide.preview}
        </div>

        {/* Text Content */}
        <div className="space-y-3 px-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border uppercase shadow-sm">
            <span className={slide.tagColor}>{slide.badge}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {slide.title}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="relative z-10 max-w-md mx-auto w-full pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] space-y-3">
        <button
          type="button"
          onClick={handleNext}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm shadow-md active:scale-[0.98] transition cursor-pointer"
        >
          <span>
            {currentSlide === slides.length - 1
              ? "Start 3-Day Free Trial ($0 Today)"
              : "Continue"}
          </span>
          <ArrowRight className="w-4 h-4 text-zinc-950" />
        </button>

        {currentSlide === slides.length - 1 ? (
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition text-center cursor-pointer"
          >
            3 scans, no card →
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-mono">
            <span>Card {currentSlide + 1} of {slides.length}</span>
            <span>·</span>
            <span>Swipe or tap to navigate</span>
          </div>
        )}
      </div>
    </div>
  );
}
