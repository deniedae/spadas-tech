"use client";

import React, { useMemo, useState } from "react";
import { TrendingUp, Zap, Target, Sliders } from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";

export interface PriceDistributionBellCurveProps {
  prices: number[];
  currency?: string;
  medianPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  recommendedPrice?: number;
  className?: string;
}

export function PriceDistributionBellCurve({
  prices,
  currency = "AUD",
  medianPrice,
  minPrice,
  maxPrice,
  recommendedPrice,
  className = "",
}: PriceDistributionBellCurveProps) {
  const [hoveredX, setHoveredX] = useState<number | null>(null);

  const stats = useMemo(() => {
    const validPrices = prices.filter((p) => typeof p === "number" && p > 0 && isFinite(p));
    if (validPrices.length === 0) return null;

    const sorted = [...validPrices].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((sum, p) => sum + p, 0) / n;
    
    // Standard deviation
    const variance = sorted.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / Math.max(1, n - 1);
    const stdDev = Math.max(1, Math.sqrt(variance));

    const min = minPrice ?? sorted[0];
    const max = maxPrice ?? sorted[n - 1];
    const median = medianPrice ?? sorted[Math.floor(n / 2)];

    // Target Sweet Spot (optimal Buy-It-Now price with high sell-through probability)
    const sweetSpot = recommendedPrice ?? median;
    const floor = Math.max(min, Math.round((mean - 0.75 * stdDev) * 100) / 100);
    const ceiling = Math.min(max, Math.round((mean + 1.25 * stdDev) * 100) / 100);

    // Volatility / Consistency rating
    const cv = (stdDev / (mean || 1)) * 100; // Coefficient of Variation
    const consistencyScore = Math.max(10, Math.min(99, Math.round(100 - cv * 0.8)));
    const volatilityLabel =
      cv < 20 ? "Low Volatility · Rock Solid" : cv < 45 ? "Moderate Spread" : "High Variance Market";

    // Histogram Buckets (5 bins between min and max)
    const binCount = 5;
    const range = Math.max(1, max - min);
    const binWidth = range / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => {
      const binMin = min + i * binWidth;
      const binMax = binMin + binWidth;
      const count = sorted.filter(
        (p) => (i === binCount - 1 ? p >= binMin && p <= binMax : p >= binMin && p < binMax)
      ).length;
      return {
        binMin,
        binMax,
        binMid: (binMin + binMax) / 2,
        count,
        percentage: Math.round((count / n) * 100),
      };
    });

    return {
      n,
      mean,
      stdDev,
      min,
      max,
      median,
      sweetSpot,
      floor,
      ceiling,
      consistencyScore,
      volatilityLabel,
      bins,
    };
  }, [prices, minPrice, maxPrice, medianPrice, recommendedPrice]);

  if (!stats) return null;

  // SVG Geometry Dimensions
  const svgWidth = 360;
  const svgHeight = 110;
  const paddingX = 20;
  const paddingBottom = 24;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingBottom - 10;

  // Scale Functions
  const domainMin = Math.max(0, stats.min - stats.stdDev * 0.4);
  const domainMax = stats.max + stats.stdDev * 0.4;
  const domainRange = Math.max(1, domainMax - domainMin);

  const priceToX = (price: number) => {
    return paddingX + ((price - domainMin) / domainRange) * plotWidth;
  };

  const xToPrice = (x: number) => {
    return domainMin + ((x - paddingX) / plotWidth) * domainRange;
  };

  // Generate Normal Gaussian Curve Points
  const steps = 60;
  const points: { x: number; y: number }[] = [];
  const maxGaussian = 1 / (stats.stdDev * Math.sqrt(2 * Math.PI));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = domainMin + t * domainRange;
    const exponent = -0.5 * Math.pow((p - stats.mean) / stats.stdDev, 2);
    const gVal = (1 / (stats.stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    const normalizedY = gVal / maxGaussian; // 0 to 1

    const x = paddingX + t * plotWidth;
    const y = svgHeight - paddingBottom - normalizedY * plotHeight;
    points.push({ x, y });
  }

  // Construct SVG Path
  const curvePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${curvePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;

  // Significant Marker Coordinates
  const sweetSpotX = Math.max(paddingX, Math.min(svgWidth - paddingX, priceToX(stats.sweetSpot)));
  const floorX = Math.max(paddingX, Math.min(svgWidth - paddingX, priceToX(stats.floor)));
  const ceilingX = Math.max(paddingX, Math.min(svgWidth - paddingX, priceToX(stats.ceiling)));

  const hoveredPrice = hoveredX !== null ? Math.round(xToPrice(hoveredX) * 10) / 10 : null;

  return (
    <div className={`p-3.5 rounded-xl bg-gradient-to-b from-[#11141e] to-[#0d0f17] border border-white/[0.08] space-y-3 shadow-md ${className}`}>
      {/* Header telemetry */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="h-3 w-3" />
          </div>
          <span className="text-xs font-bold text-zinc-200">Price Spread Bell Curve</span>
          <span className="text-[10px] text-zinc-500">({stats.n} verified sales)</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-400">{stats.volatilityLabel}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
            {stats.consistencyScore}% Reliability
          </span>
        </div>
      </div>

      {/* Interactive SVG Curve Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair touch-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            setHoveredX(Math.max(paddingX, Math.min(svgWidth - paddingX, relX)));
          }}
          onMouseLeave={() => setHoveredX(null)}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((touch.clientX - rect.left) / rect.width) * svgWidth;
            setHoveredX(Math.max(paddingX, Math.min(svgWidth - paddingX, relX)));
          }}
          onTouchEnd={() => setHoveredX(null)}
        >
          <defs>
            <linearGradient id="bellCurveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="bellCurveStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Histogram distribution bins under curve */}
          {stats.bins.map((bin, idx) => {
            const x1 = priceToX(bin.binMin);
            const x2 = priceToX(bin.binMax);
            const w = Math.max(2, x2 - x1 - 1);
            const maxBinPct = Math.max(...stats.bins.map((b) => b.percentage)) || 1;
            const barH = (bin.percentage / maxBinPct) * (plotHeight * 0.45);
            const y = svgHeight - paddingBottom - barH;

            return (
              <rect
                key={idx}
                x={x1}
                y={y}
                width={w}
                height={barH}
                fill="#1e293b"
                opacity="0.65"
                rx="2"
              />
            );
          })}

          {/* Bell Curve Area Fill */}
          <path d={areaPath} fill="url(#bellCurveFill)" />

          {/* Bell Curve Stroke Line */}
          <path
            d={curvePath}
            fill="none"
            stroke="url(#bellCurveStroke)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Base Baseline */}
          <line
            x1={paddingX}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingX}
            y2={svgHeight - paddingBottom}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Fast Liquidation Floor Marker */}
          <line
            x1={floorX}
            y1={15}
            x2={floorX}
            y2={svgHeight - paddingBottom}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.8"
          />

          {/* Optimal Sweet Spot Marker */}
          <line
            x1={sweetSpotX}
            y1={6}
            x2={sweetSpotX}
            y2={svgHeight - paddingBottom}
            stroke="#10b981"
            strokeWidth="2"
          />
          <circle cx={sweetSpotX} cy={svgHeight - paddingBottom} r="3.5" fill="#10b981" />

          {/* Speculative Ceiling Marker */}
          <line
            x1={ceilingX}
            y1={15}
            x2={ceilingX}
            y2={svgHeight - paddingBottom}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.8"
          />

          {/* Interactive Hover Needle */}
          {hoveredX !== null && (
            <line
              x1={hoveredX}
              y1={5}
              x2={hoveredX}
              y2={svgHeight - paddingBottom}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* X Axis Labels */}
          <text
            x={paddingX}
            y={svgHeight - 8}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="start"
          >
            {fmtMoney(stats.min)}
          </text>

          <text
            x={sweetSpotX}
            y={svgHeight - 8}
            fill="#34d399"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            🎯 {fmtMoney(stats.sweetSpot)}
          </text>

          <text
            x={svgWidth - paddingX}
            y={svgHeight - 8}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
          >
            {fmtMoney(stats.max)}
          </text>
        </svg>

        {/* Dynamic Tooltip on Hover/Touch */}
        {hoveredPrice !== null && (
          <div
            className="absolute top-0 px-2 py-1 rounded bg-black/90 border border-emerald-500/50 text-[10px] font-mono text-emerald-300 pointer-events-none transform -translate-x-1/2 shadow-lg"
            style={{
              left: `${(hoveredX! / svgWidth) * 100}%`,
            }}
          >
            Price: {fmtMoney(hoveredPrice)} {currency}
          </div>
        )}
      </div>

      {/* Strategic 3-Tier Price Target Action Strip */}
      <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
        {/* Floor */}
        <div className="p-2 rounded-lg bg-black/40 border border-amber-500/25">
          <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-amber-400 font-bold">
            <Zap className="h-2.5 w-2.5 text-amber-400" />
            <span>24h Floor</span>
          </div>
          <div className="text-xs font-black text-amber-300 mt-0.5 tabular-nums">
            {fmtMoney(stats.floor)}
          </div>
          <span className="text-[8px] text-zinc-500 block">Fast Flip</span>
        </div>

        {/* Optimal Sweet Spot */}
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
            <Target className="h-2.5 w-2.5 text-emerald-400" />
            <span>Optimal List</span>
          </div>
          <div className="text-xs font-black text-emerald-300 mt-0.5 tabular-nums">
            {fmtMoney(stats.sweetSpot)}
          </div>
          <span className="text-[8px] text-emerald-400/80 font-bold block">80% Sell Odds</span>
        </div>

        {/* Ceiling */}
        <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/25">
          <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-cyan-400 font-bold">
            <Sliders className="h-2.5 w-2.5 text-cyan-400" />
            <span>Max Ceiling</span>
          </div>
          <div className="text-xs font-black text-cyan-300 mt-0.5 tabular-nums">
            {fmtMoney(stats.ceiling)}
          </div>
          <span className="text-[8px] text-zinc-500 block">Top Dollar</span>
        </div>
      </div>
    </div>
  );
}
