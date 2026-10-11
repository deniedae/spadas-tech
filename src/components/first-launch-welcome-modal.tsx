"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Crown,
  ChevronRight,
  X,
  Layers,
  HelpCircle,
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-[#05070D]/95 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 bg-gradient-to-br from-cyan-500/15 via-emerald-500/10 to-transparent rounded-full blur-3xl" />

      <div className="relative w-full max-w-md max-h-[94dvh] overflow-y-auto overscroll-contain rounded-3xl bg-[#090C16] border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.85)] text-zinc-100 p-5 sm:p-7 space-y-5">
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("light");
            onStartScanning();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Dismiss and Start Camera"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge & Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>3 FREE SCANS READY</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">Spadas Lens</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
            Instant AI thrift scanner. Point your camera at any thrift store find or barcode to see real eBay sold comps &amp; net profit in 0.5s.
          </p>
        </div>

        {/* 3 Free Scans Quota & Countdown Card */}
        <div className="rounded-2xl bg-zinc-950/80 border border-white/10 p-4 space-y-3.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Starter Free Quota
            </span>
            <span className="font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              3 of 3 Available
            </span>
          </div>

          {/* 3 Step Countdown Timeline */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/40 shadow-sm">
              <div className="text-[10px] text-zinc-400 uppercase">Scan 1</div>
              <div className="text-sm font-black text-emerald-400 pt-0.5">3 Left</div>
              <div className="text-[9px] text-zinc-500">Live comps</div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/40 shadow-sm">
              <div className="text-[10px] text-zinc-400 uppercase">Scan 2</div>
              <div className="text-sm font-black text-emerald-400 pt-0.5">2 Left</div>
              <div className="text-[9px] text-zinc-500">Net profit</div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-amber-500/40 shadow-sm">
              <div className="text-[10px] text-zinc-400 uppercase">Scan 3</div>
              <div className="text-sm font-black text-amber-400 pt-0.5">1 Left</div>
              <div className="text-[9px] text-zinc-500">Final test</div>
            </div>
          </div>

          {/* Upgrade Explanation */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-snug">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Strict 3 Scans Trial:</strong> Once your 3 free scans are used, upgrade to <span className="text-amber-300 font-bold">Spadas Pro ($10 AUD / $6.99 USD/mo)</span> to unlock unlimited 60FPS scans.
            </div>
          </div>
        </div>

        {/* Feature Checkpoints */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 font-medium">
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>eBay Sold Comps</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Fee Deductions</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>1-Tap eBay Drafts</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero Card Required</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Primary CTA: Start 3 Free Scans */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              onStartScanning();
            }}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-slate-950" />
            <span>Start My 3 Free Scans (3/3 Ready)</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>

          {/* Secondary CTA: Go Pro directly */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("light");
              onUpgradePro();
            }}
            className="w-full py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Unlock Unlimited Pro — $10 AUD / month</span>
          </button>

          {/* Optional: View How-To Tutorial */}
          {onViewGuide && (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("light");
                onViewGuide();
              }}
              className="w-full text-center text-[11px] text-zinc-400 hover:text-zinc-200 font-medium py-1 transition cursor-pointer"
            >
              📖 See 30-Second Scanner Guide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
