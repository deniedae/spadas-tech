"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ── 1. ShimmerLineSkeleton ────────────────────────────────────────────────────────
 * Wraps any component or skeleton container with a subtle shimmer effect.
 */
export function LaserLineSkeleton({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
  direction?: "vertical" | "horizontal";
  laserColor?: "cyan" | "emerald" | "amber" | "purple";
  showGlow?: boolean;
}) {
  // Retaining the component name for backward compatibility but changing its behavior
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
    </div>
  );
}

/**
 * ── 2. RadarSweepSkeleton -> SpinnerLoader ──────────────────────────────────────
 * Clean spinner UI element for querying states.
 */
export function RadarSweepSkeleton({
  title = "Querying Live eBay Sold Comps...",
  subtitle = "Fetching market data",
  size = "md", // 'sm' | 'md' | 'lg'
  className = "",
}: {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className={`${sizeClasses[size]} border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin`} />
      </div>

      {/* Status Typography */}
      <div className="mt-4 space-y-1">
        <h4 className="text-sm font-semibold text-white tracking-tight">{title}</h4>
        {subtitle && (
          <p className="text-xs text-zinc-500 max-w-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/**
 * ── 3. CompsLedgerSkeleton ───────────────────────────────────────────────────────
 * Clean 7-Row eBay Comps Skeleton Loader.
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
    <div
      className={`w-full rounded-2xl bg-zinc-950/50 border border-white/[0.08] p-4 sm:p-5 space-y-4 ${className}`}
    >
      {/* 1. Header Banner Skeleton */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-white">
                Ledger Data
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Telemetry Strip Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
        <div className="p-2 space-y-1.5 flex flex-col items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="p-2 border-l border-white/[0.06] space-y-1.5 flex flex-col items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="p-2 border-t sm:border-t-0 sm:border-l border-white/[0.06] space-y-1.5 flex flex-col items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="p-2 border-t sm:border-t-0 border-l border-white/[0.06] space-y-1.5 flex flex-col items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      {/* 3. Structured Comp Row Bones */}
      <div className="space-y-2">
        {Array.from({ length: rowsCount }).map((_, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
          >
            {/* Left */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton
                  className="h-4 rounded flex-1 max-w-sm"
                  style={{ width: `${85 - (idx % 3) * 12}%` }}
                />
              </div>

              {/* Metadata row skeleton */}
              <div className="flex items-center gap-2 ml-7">
                <Skeleton className="h-3.5 w-16 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-3.5 w-12 rounded" />
              </div>
            </div>

            {/* Right */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05]">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── 4. CompsCardSkeleton ────────────────────────────────────────────────────────
 * Minimalist card skeleton.
 */
export function CompsCardSkeleton({
  className = "",
  showTitle = true,
}: {
  className?: string;
  showTitle?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-2xl bg-zinc-950 border border-white/[0.08] p-4 space-y-3.5 shadow-sm overflow-hidden relative ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
      
      {showTitle && (
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
      )}

      {/* Value & Profit Skeleton Blocks */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * ── 5. CompsMiniLaserPill ───────────────────────────────────────────────────────
 * Sleek micro-indicator for compact rows & drawers.
 */
export function CompsMiniLaserPill({
  label = "Querying...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-zinc-400 select-none ${className}`}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <span className="h-2 w-2 rounded-full border-2 border-zinc-500 border-t-zinc-300 animate-spin" />
      </div>
      <span className="truncate">{label}</span>
    </div>
  );
}
