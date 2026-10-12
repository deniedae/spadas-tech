"use client";

import React from "react";
import {
  Scan,
  Camera,
  Zap,
  TrendingUp,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface FirstLaunchWelcomeModalProps {
  isOpen: boolean;
  onStartScanning: () => void;
  onUpgradePro: () => void;
  onViewGuide?: () => void;
}

export function FirstLaunchWelcomeModal({
  isOpen,
  onStartScanning,
  onUpgradePro,
  onViewGuide,
}: FirstLaunchWelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-3xl bg-[#0D1017] border border-white/[0.10] shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-zinc-100 p-6 sm:p-7 space-y-6">
        {/* Subtle Top Dismiss */}
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("light");
            onStartScanning();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Section */}
        <div className="text-center space-y-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center mx-auto text-white shadow-inner">
            <Scan className="w-6 h-6 text-white" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Spadas Lens
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Instant camera scanner for resellers. Scan barcodes or thrift finds to calculate live eBay sold comps and net profit.
            </p>
          </div>
        </div>

        {/* Core Capabilities (Clean Linear / Apple Rows) */}
        <div className="space-y-3.5 py-3 border-y border-white/[0.08]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 text-zinc-300">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-white">
                0.5s Optical Recognition
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Scan barcodes or products directly on store shelves.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 text-zinc-300">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-white">
                Live Sold Comps &amp; Profit
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Real market values with platform fees and shipping factored in.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 text-zinc-300">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-white">
                1-Tap Marketplace Drafts
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Auto-generate ready-to-post listings from your scan photos.
              </div>
            </div>
          </div>
        </div>

        {/* Transparent Trial Bar */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="font-medium text-zinc-200">3 free scans included</span>
          </div>
          <span className="text-zinc-500 font-mono text-[11px]">$10 AUD/mo after</span>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              onStartScanning();
            }}
            className="w-full h-11 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.99] text-zinc-950 font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-zinc-950" />
            <span>Start Scanning (3 Free Scans)</span>
            <ArrowRight className="w-4 h-4 text-zinc-950" />
          </button>

          <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("light");
                onUpgradePro();
              }}
              className="hover:text-white transition font-medium cursor-pointer"
            >
              Upgrade to Pro ($10 AUD/mo)
            </button>

            {onViewGuide && (
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("light");
                  onViewGuide();
                }}
                className="hover:text-white transition font-medium text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                How it works
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
