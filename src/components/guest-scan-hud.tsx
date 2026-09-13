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
      className={`inline-flex items-center gap-2.5 rounded-full glass px-3 py-1.5 shadow-xl text-zinc-200 transition ${className}`}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <div className="status-active-dot pulse" />
        <span className="hud-chip text-[#00F2FE]">Guest</span>
      </div>

      {/* Pip counter */}
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_GUEST_SCANS }).map((_, idx) => {
          const isFilled = idx < scansUsed;
          return (
            <div
              key={idx}
              className={`h-1.5 w-2.5 rounded-sm transition-all duration-300 ${
                isFilled
                  ? "bg-zinc-800"
                  : "bg-[#00F2FE]/70 shadow-[0_0_6px_rgba(0,242,254,0.5)]"
              }`}
              title={`Scan ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Count readout */}
      <span className="hud-value text-[11px] text-white">
        {remainingScans}/{MAX_GUEST_SCANS}
      </span>

      {/* Unlock CTA */}
      <button
        type="button"
        onClick={onOpenAuthModal}
        className="badge-active cursor-pointer hover:bg-[#00F2FE]/15 transition active:scale-95"
      >
        <UserPlus className="h-2.5 w-2.5" />
        <span>Unlock</span>
      </button>
    </div>
  );
}
