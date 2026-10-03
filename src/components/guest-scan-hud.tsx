"use client";

import React from "react";
import Link from "next/link";
import { Zap, UserPlus } from "lucide-react";
import { MAX_GUEST_SCANS } from "@/lib/guest-scan-tracker";

interface GuestScanHudProps {
  remainingScans: number;
  onOpenAuthModal?: () => void;
  className?: string;
}

export function GuestScanHud({
  remainingScans,
  onOpenAuthModal,
  className = "",
}: GuestScanHudProps) {
  const pct = Math.min(100, Math.max(0, (remainingScans / MAX_GUEST_SCANS) * 100));

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg bg-[#0F1117]/95 border border-white/[0.12] px-2.5 py-1 text-zinc-200 backdrop-blur-md shadow-lg transition ${className}`}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Guest</span>
      </div>

      {/* Sleek Mini Progress Bar */}
      <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Count readout */}
      <span className="font-mono text-[11px] font-bold text-white tabular-nums">
        {remainingScans}/{MAX_GUEST_SCANS}
      </span>

      {/* Unlock CTA */}
      <button
        type="button"
        onClick={onOpenAuthModal}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-black text-[10px] font-bold hover:bg-zinc-200 transition cursor-pointer active:scale-95 shadow-sm"
      >
        <Zap className="h-2.5 w-2.5 fill-black" />
        <span>Unlock 50/day</span>
      </button>
    </div>
  );
}
