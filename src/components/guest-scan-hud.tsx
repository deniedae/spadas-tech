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
  const scansUsed = Math.max(0, MAX_GUEST_SCANS - remainingScans);

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-lg bg-[#0F1117]/90 border border-white/[0.10] px-2.5 py-1 text-zinc-200 backdrop-blur-md transition ${className}`}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Guest</span>
      </div>

      {/* Pip counter */}
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_GUEST_SCANS }).map((_, idx) => {
          const isFilled = idx < scansUsed;
          return (
            <div
              key={idx}
              className={`h-1.5 w-2 rounded-[2px] transition-all duration-200 ${
                isFilled
                  ? "bg-zinc-700"
                  : "bg-white/80"
              }`}
              title={`Scan ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Count readout */}
      <span className="font-mono text-[11px] font-semibold text-white">
        {remainingScans}/{MAX_GUEST_SCANS}
      </span>

      {/* Unlock CTA */}
      <button
        type="button"
        onClick={onOpenAuthModal}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-black text-[10px] font-bold hover:bg-zinc-200 transition cursor-pointer active:scale-95"
      >
        <UserPlus className="h-2.5 w-2.5" />
        <span>Unlock</span>
      </button>
    </div>
  );
}
