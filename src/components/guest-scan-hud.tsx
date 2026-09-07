"use client";

import React from "react";
import Link from "next/link";
import { Zap, Sparkles, UserPlus, ShieldAlert } from "lucide-react";
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
  const scansUsed = Math.max(0, MAX_GUEST_SCANS - remainingScans);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-black/75 px-3 py-1.5 shadow-xl backdrop-blur-md text-zinc-200 transition ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-ping" />
        <Zap className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
        <span className="text-[11px] font-black uppercase tracking-wider text-orange-300">
          Guest Mode:
        </span>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_GUEST_SCANS }).map((_, idx) => {
          const isFilled = idx < scansUsed;
          return (
            <div
              key={idx}
              className={`h-2 w-3 rounded-sm transition-all duration-300 ${
                isFilled
                  ? "bg-zinc-600"
                  : "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]"
              }`}
              title={`Scan ${idx + 1}`}
            />
          );
        })}
      </div>

      <span className="text-[11px] font-bold text-white pl-0.5">
        {remainingScans} / {MAX_GUEST_SCANS} Left
      </span>

      <button
        type="button"
        onClick={onOpenAuthModal}
        className="ml-1 inline-flex items-center gap-1 rounded-full bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 px-2 py-0.5 text-[10px] font-bold text-orange-300 hover:text-white transition"
      >
        <UserPlus className="h-3 w-3" />
        <span>Unlock 10</span>
      </button>
    </div>
  );
}
