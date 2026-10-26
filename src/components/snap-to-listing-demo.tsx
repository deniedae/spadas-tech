"use client";

import React, { useEffect, useState } from "react";
import { Camera, TrendingUp, FileText, CheckCircle2, Shirt, ArrowRight } from "lucide-react";

interface SnapToListingDemoProps {
  sym: string;
  isUK: boolean;
}

const STEPS = [
  { key: "snap", label: "Snap", icon: Camera },
  { key: "comps", label: "Comps", icon: TrendingUp },
  { key: "list", label: "Listing", icon: FileText },
  { key: "live", label: "Live", icon: CheckCircle2 },
] as const;

const STEP_MS = 2200;
const FINAL_HOLD_MS = 3200;

/**
 * Looping "snap -> sold comps -> drafted listing -> live on eBay" walkthrough.
 * Illustrative only: it reuses the sample item/price from the first carousel mock-up and is
 * labelled "Example" so it is never presented as a real result.
 */
export function SnapToListingDemo({ sym, isUK }: SnapToListingDemoProps) {
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const price = `${sym}${isUK ? "38.50" : "48.50"}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);
    if (reduce) setStep(STEPS.length - 1);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const delay = step === STEPS.length - 1 ? FINAL_HOLD_MS : STEP_MS;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), delay);
    return () => clearTimeout(t);
  }, [step, reducedMotion]);

  return (
    <div className="relative w-full max-w-xs mx-auto p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-3 select-none">
      {/* Step chips */}
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <React.Fragment key={s.key}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Show step ${i + 1}: ${s.label}`}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                    : done
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500"
                }`}
              >
                <Icon className="w-3 h-3" />
                {s.label}
              </button>
              {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-700 shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step body */}
      <div key={step} className="h-36 animate-in fade-in duration-300">
        {step === 0 && (
          <div className="relative h-full rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-cyan-500/30 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400 rounded-br" />
            <Shirt className="w-14 h-14 text-zinc-500" />
            <span className="absolute bottom-2 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SNAP YOUR FIND
            </span>
          </div>
        )}

        {step === 1 && (
          <div className="h-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 flex flex-col justify-center gap-2 font-mono">
            <div className="text-xs font-bold text-white truncate font-sans">Vintage 90s Ralph Lauren Polo</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Sold median</span>
              <span className="text-emerald-400 font-bold">{price}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Sold comps</span>
              <span className="text-zinc-200">18 found</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Verified eBay sold data
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="h-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 flex flex-col justify-center gap-1.5 text-[11px]">
            <div className="text-[9px] font-mono uppercase tracking-wider text-cyan-400">Listing draft</div>
            <div className="font-bold text-white leading-snug">
              Vintage 90s Ralph Lauren Polo Shirt Men&apos;s
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-400">Price</span>
              <span className="text-white font-bold">{price}</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-400">Category</span>
              <span className="text-zinc-200">Clothing</span>
            </div>
            <div className="text-[10px] text-zinc-500">Title, category and item specifics filled in for you</div>
          </div>
        )}

        {step === 3 && (
          <div className="h-full rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 flex flex-col items-center justify-center gap-2 text-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            <div className="text-sm font-extrabold text-white">Live on eBay</div>
            <div className="text-[11px] text-zinc-300 leading-snug">
              Vintage 90s Ralph Lauren Polo
              <br />
              <span className="font-mono font-bold text-emerald-300">{price}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] font-mono text-zinc-500">
        Example · tap a step to jump
      </div>
    </div>
  );
}

export default SnapToListingDemo;
