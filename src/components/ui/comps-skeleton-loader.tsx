"use client";

import React from "react";
import { TrendingUp, Sparkles, Percent, Calendar, Tag, ArrowUpRight, CheckCircle2 } from "lucide-react";

/**
 * ── 1. LaserLineSkeleton ────────────────────────────────────────────────────────
 * Wraps any component or skeleton container with a sleek, pulsing laser beam line
 * that traverses smoothly across the UI element while eBay comps are querying.
 */
export function LaserLineSkeleton({
  children,
  className = "",
  direction = "vertical", // 'vertical' (top-to-bottom) or 'horizontal' (left-to-right)
  laserColor = "cyan",    // 'cyan' | 'emerald' | 'amber' | 'purple'
  showGlow = true,
}: {
  children?: React.ReactNode;
  className?: string;
  direction?: "vertical" | "horizontal";
  laserColor?: "cyan" | "emerald" | "amber" | "purple";
  showGlow?: boolean;
}) {
  const colorMap = {
    cyan: {
      line: "from-transparent via-cyan-400 to-transparent",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.8),0_0_30px_rgba(6,182,212,0.4)]",
      dot: "bg-cyan-300",
    },
    emerald: {
      line: "from-transparent via-emerald-400 to-transparent",
      glow: "shadow-[0_0_15px_rgba(52,211,153,0.8),0_0_30px_rgba(52,211,153,0.4)]",
      dot: "bg-emerald-300",
    },
    amber: {
      line: "from-transparent via-amber-400 to-transparent",
      glow: "shadow-[0_0_15px_rgba(251,191,36,0.8),0_0_30px_rgba(251,191,36,0.4)]",
      dot: "bg-amber-300",
    },
    purple: {
      line: "from-transparent via-purple-400 to-transparent",
      glow: "shadow-[0_0_15px_rgba(192,132,252,0.8),0_0_30px_rgba(192,132,252,0.4)]",
      dot: "bg-purple-300",
    },
  };

  const selectedColor = colorMap[laserColor] || colorMap.cyan;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}

      {/* Pulsing Traversing Laser Line */}
      {direction === "vertical" ? (
        <div className="absolute inset-x-0 h-[2px] pointer-events-none z-20 laser-scan-line-y">
          <div
            className={`w-full h-full bg-gradient-to-r ${selectedColor.line} ${
              showGlow ? selectedColor.glow : ""
            }`}
          />
        </div>
      ) : (
        <div className="absolute inset-y-0 w-[2px] pointer-events-none z-20 laser-scan-line-x">
          <div
            className={`w-full h-full bg-gradient-to-b ${selectedColor.line} ${
              showGlow ? selectedColor.glow : ""
            }`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * ── 2. RadarSweepSkeleton ───────────────────────────────────────────────────────
 * Sleek radar sweep UI element with rotating conical beam and tactical reticle
 * for high-tech eBay market clearance querying states.
 */
export function RadarSweepSkeleton({
  title = "Querying Live eBay Sold Comps...",
  subtitle = "Calibrating 7-Point Market Clearance Matrix",
  size = "md", // 'sm' | 'md' | 'lg'
  className = "",
}: {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
    >
      {/* Tactical Radar Display Reticle */}
      <div
        className={`relative ${sizeClasses[size]} rounded-full border border-cyan-500/30 bg-[#050811] flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.15)]`}
      >
        {/* Concentric Radar Rings */}
        <div className="absolute inset-2 rounded-full border border-cyan-500/20 pointer-events-none" />
        <div className="absolute inset-5 rounded-full border border-cyan-500/15 pointer-events-none" />
        <div className="absolute inset-8 rounded-full border border-dashed border-cyan-500/10 pointer-events-none" />

        {/* Crosshair Axes */}
        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-500/20 -translate-y-1/2 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-cyan-500/20 -translate-x-1/2 pointer-events-none" />

        {/* Subtle Expanding Ripple */}
        <div className="absolute inset-0 rounded-full border border-cyan-400/40 radar-ring-expand pointer-events-none" />

        {/* 360-degree Rotating Conical Radar Sweep Beam */}
        <div className="absolute inset-0 rounded-full radar-sweep-cone pointer-events-none" />

        {/* Center Target Acquisition Blip */}
        <div className="relative z-10 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping" />
        <div className="absolute z-10 h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
      </div>

      {/* Status Typography with Micro Telemetry */}
      <div className="mt-4 space-y-1">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-black text-cyan-300 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>LIVE RADAR COMP SCAN</span>
        </div>
        <h4 className="text-sm font-black text-white tracking-tight">{title}</h4>
        {subtitle && (
          <p className="text-xs font-mono text-zinc-400 max-w-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/**
 * ── 3. CompsLedgerSkeleton ───────────────────────────────────────────────────────
 * Audit-Grade 7-Row eBay Comps Skeleton Loader.
 * Replaces generic spinners with 7 realistic structured comp rows illuminated by
 * a vertical laser scanning line and telemetry header.
 */
export function CompsLedgerSkeleton({
  targetTitle = "Querying Live eBay Sold Comps...",
  rowsCount = 7,
  className = "",
}: {
  targetTitle?: string;
  rowsCount?: number;
  className?: string;
}) {
  return (
    <LaserLineSkeleton
      direction="vertical"
      laserColor="cyan"
      className={`w-full rounded-2xl bg-[#070A14] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.12)] p-4 sm:p-5 space-y-4 ${className}`}
    >
      {/* 1. Header Banner Skeleton */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 overflow-hidden shrink-0">
            <TrendingUp className="h-4 w-4" />
            <div className="absolute inset-0 radar-sweep-cone opacity-40" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                Audit Comps Ledger
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black">
                  7 Sales Evidence
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-3 w-40 rounded bg-white/[0.08] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Live Scan Pulse Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span>Scanning eBay AU...</span>
        </div>
      </div>

      {/* 2. Trust-The-Process Telemetry Strip Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-[#0A0F1E] border border-white/[0.06] text-center">
        <div className="p-2 space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
            Cleared Median
          </span>
          <div className="h-5 w-16 mx-auto rounded bg-cyan-500/20 animate-pulse" />
        </div>
        <div className="p-2 border-l border-white/[0.06] space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
            Cleared Range
          </span>
          <div className="h-4 w-24 mx-auto rounded bg-white/[0.08] animate-pulse" />
        </div>
        <div className="p-2 border-t sm:border-t-0 sm:border-l border-white/[0.06] space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
            Evidence Depth
          </span>
          <div className="h-4 w-20 mx-auto rounded bg-emerald-500/20 animate-pulse" />
        </div>
        <div className="p-2 border-t sm:border-t-0 border-l border-white/[0.06] space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
            Match Integrity
          </span>
          <div className="h-4 w-20 mx-auto rounded bg-emerald-500/20 animate-pulse" />
        </div>
      </div>

      {/* 3. 7 Structured Comp Row Bones with Laser Scanning Illumination */}
      <div className="space-y-2">
        {Array.from({ length: rowsCount }).map((_, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-[#090D18] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
          >
            {/* Left: Index # + Match Pill + Title Bone + Metadata Pills */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 h-5 w-5 rounded-md bg-zinc-900 border border-white/[0.08] text-[10px] font-mono font-black text-zinc-500 flex items-center justify-center">
                  #{idx + 1}
                </span>

                {/* Match percentage badge bone */}
                <div className="h-4 w-20 rounded-md bg-emerald-500/15 border border-emerald-500/30 animate-pulse" />

                {/* Title skeleton line */}
                <div
                  className="h-4 rounded bg-white/[0.07] animate-pulse flex-1 max-w-sm"
                  style={{ width: `${85 - (idx % 3) * 12}%` }}
                />
              </div>

              {/* Metadata row skeleton */}
              <div className="flex items-center gap-2 ml-7">
                <div className="h-3.5 w-20 rounded bg-white/[0.05]" />
                <div className="h-3.5 w-24 rounded bg-white/[0.05]" />
                <div className="h-3.5 w-16 rounded bg-white/[0.04]" />
              </div>
            </div>

            {/* Right: Realized Price + Action Bone */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05]">
              <div className="h-5 w-16 rounded bg-cyan-400/20 animate-pulse" />
              <div className="h-6 w-20 rounded-xl bg-cyan-500/10 border border-cyan-500/20" />
            </div>
          </div>
        ))}
      </div>
    </LaserLineSkeleton>
  );
}

/**
 * ── 4. CompsCardSkeleton ────────────────────────────────────────────────────────
 * Minimalist laser-scanned card skeleton for HUD / overlays / modal preloads.
 */
export function CompsCardSkeleton({
  className = "",
  showTitle = true,
}: {
  className?: string;
  showTitle?: boolean;
}) {
  return (
    <LaserLineSkeleton
      direction="vertical"
      laserColor="cyan"
      className={`w-full rounded-2xl bg-[#090D18] border border-cyan-500/30 p-4 space-y-3.5 shadow-xl ${className}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
              CALIBRATING MARKET COMPS
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">EBAY AU</span>
        </div>
      )}

      {/* Value & Profit Skeleton Blocks */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-16 rounded bg-zinc-800" />
          <div className="h-8 w-28 rounded-lg bg-emerald-500/20 animate-pulse" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-3.5 w-20 rounded bg-white/[0.08]" />
          <div className="h-3.5 w-16 rounded bg-white/[0.08]" />
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full animate-pulse w-3/4" />
      </div>
    </LaserLineSkeleton>
  );
}

/**
 * ── 5. CompsMiniLaserPill ───────────────────────────────────────────────────────
 * Sleek micro-indicator with pulsing laser line for compact rows & drawers.
 */
export function CompsMiniLaserPill({
  label = "Querying eBay Comps...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)] overflow-hidden select-none ${className}`}
    >
      {/* Subtle sweeping horizontal laser line */}
      <div className="absolute inset-y-0 w-8 pointer-events-none laser-scan-line-x">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
      </div>

      {/* Radar Dot Icon */}
      <div className="relative flex items-center justify-center shrink-0">
        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
      </div>

      <span className="truncate">{label}</span>
    </div>
  );
}
