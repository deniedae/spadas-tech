"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);

  const PULL_THRESHOLD = 75;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;

    if (diff > 0 && window.scrollY === 0) {
      // Apply spring friction coefficient
      const distance = Math.min(diff * 0.45, 110);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(60);

      // Trigger 10ms haptic feedback
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(15); } catch {}
      }

      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full w-full"
    >
      {/* Pull To Refresh Indicator Bar */}
      <div
        style={{ transform: `translateY(${pullDistance}px)` }}
        className="transition-transform duration-200 ease-out"
      >
        {(pullDistance > 0 || refreshing) && (
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center py-2 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-800 px-4 py-1.5 shadow-2xl backdrop-blur-md">
              <RefreshCw
                className={`h-4 w-4 text-cyan-400 ${
                  refreshing ? "animate-spin" : ""
                }`}
                style={{
                  transform: `rotate(${Math.min(pullDistance * 3.5, 360)}deg)`,
                }}
              />
              <span className="text-xs font-extrabold text-slate-200">
                {refreshing
                  ? "Refreshing..."
                  : pullDistance >= PULL_THRESHOLD
                  ? "Release to Refresh"
                  : "Pull down to refresh"}
              </span>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
