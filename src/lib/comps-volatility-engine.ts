/**
 * Spadas Spectral Comps & Volatility Analytics Engine
 * Calculates Exponential Recency-Decay Fair Market Value (EMA_FMV),
 * Auction Liquidation Floor vs Patient BIN Ceiling spreads,
 * and standard-deviation Volatility Risk Indexes.
 */

export interface RawCompDataPoint {
  title?: string;
  price: number;
  dateSold?: string; // ISO string or relative like "2d ago"
  format?: "auction" | "bin" | "best_offer" | string;
}

export interface SpectralCompsProfile {
  emaFairMarketValue: number; // Exponentially weighted by recency
  liquidationFloor: number; // 3-day auction exit price (20th percentile)
  balancedMedian: number; // 50th percentile
  patientBinCeiling: number; // 30-day patient Buy-It-Now ceiling (85th percentile)
  volatilityScore: number; // 0 - 100 (100 = rock solid stability, <40 = wild spread)
  volatilityTier: "ROCK_SOLID" | "BALANCED_SPREAD" | "HIGH_VOLATILITY";
  volatilityLabel: string;
  coefficientOfVariation: number; // Standard deviation / Mean
  sampleSize: number;
  recencyConfidence: "FRESH_SALES" | "MODERATE_HISTORY" | "STALE_DATA";
}

/**
 * Parses relative or ISO date string into approximate age in days.
 */
export function parseCompAgeDays(dateStr?: string): number {
  if (!dateStr) return 7; // Default 1 week assumption

  const lower = dateStr.toLowerCase().trim();
  if (lower.includes("today") || lower.includes("hour") || lower.includes("min")) return 0.2;
  if (lower.includes("yesterday") || lower.includes("1d")) return 1;

  const dayMatch = lower.match(/(\d+)\s*d/);
  if (dayMatch) return parseInt(dayMatch[1], 10);

  const monthMatch = lower.match(/(\d+)\s*m/);
  if (monthMatch && !lower.includes("min")) return parseInt(monthMatch[1], 10) * 30;

  // Try parsing ISO or Date.parse
  const parsedTime = Date.parse(dateStr);
  if (!isNaN(parsedTime)) {
    const diffMs = Date.now() - parsedTime;
    return Math.max(0.1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  return 7;
}

/**
 * Computes deep spectral statistical metrics over raw sold listings.
 */
export function calculateSpectralComps(
  comps: RawCompDataPoint[],
  fallbackMedian: number = 45
): SpectralCompsProfile {
  const validPrices = comps
    .map((c) => ({
      price: Number(c.price) || 0,
      ageDays: parseCompAgeDays(c.dateSold),
      format: c.format || "bin",
    }))
    .filter((c) => c.price > 0)
    .sort((a, b) => a.price - b.price);

  if (validPrices.length === 0) {
    return {
      emaFairMarketValue: fallbackMedian,
      liquidationFloor: Math.round(fallbackMedian * 0.72 * 100) / 100,
      balancedMedian: fallbackMedian,
      patientBinCeiling: Math.round(fallbackMedian * 1.28 * 100) / 100,
      volatilityScore: 75,
      volatilityTier: "BALANCED_SPREAD",
      volatilityLabel: "Balanced Market Spread",
      coefficientOfVariation: 0.22,
      sampleSize: 0,
      recencyConfidence: "MODERATE_HISTORY",
    };
  }

  const pricesOnly = validPrices.map((c) => c.price);
  const n = pricesOnly.length;

  // 1. Calculate Percentiles (Floor = 20th percentile, Median = 50th, Ceiling = 85th)
  const floorIdx = Math.max(0, Math.floor(n * 0.20));
  const medIdx = Math.floor(n * 0.50);
  const ceilIdx = Math.min(n - 1, Math.floor(n * 0.85));

  const liquidationFloor = pricesOnly[floorIdx];
  const balancedMedian = pricesOnly[medIdx];
  const patientBinCeiling = pricesOnly[ceilIdx];

  // 2. Exponential Moving Average with Recency Decay (λ = 0.035 / day)
  const lambda = 0.035;
  let weightedSum = 0;
  let totalWeight = 0;
  let avgAge = 0;

  for (const item of validPrices) {
    const weight = Math.exp(-lambda * item.ageDays);
    weightedSum += item.price * weight;
    totalWeight += weight;
    avgAge += item.ageDays;
  }

  avgAge = avgAge / n;
  const emaFairMarketValue = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : balancedMedian;

  // 3. Volatility & Standard Deviation
  const mean = pricesOnly.reduce((a, b) => a + b, 0) / n;
  const variance = pricesOnly.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? Math.round((stdDev / mean) * 100) / 100 : 0.2;

  // Volatility Score (0 - 100): High score = low risk / tight spread
  let volatilityScore = Math.max(10, Math.min(99, Math.round(100 - cv * 160)));
  let volatilityTier: SpectralCompsProfile["volatilityTier"] = "BALANCED_SPREAD";
  let volatilityLabel = "⚖️ Normal Market Spread";

  if (cv <= 0.16) {
    volatilityTier = "ROCK_SOLID";
    volatilityLabel = "🛡️ Rock Solid (High Stability)";
    volatilityScore = Math.max(88, volatilityScore);
  } else if (cv >= 0.38) {
    volatilityTier = "HIGH_VOLATILITY";
    volatilityLabel = "⚡ High Price Variance / Speculative";
    volatilityScore = Math.min(45, volatilityScore);
  }

  const recencyConfidence: SpectralCompsProfile["recencyConfidence"] =
    avgAge <= 5 ? "FRESH_SALES" : avgAge <= 20 ? "MODERATE_HISTORY" : "STALE_DATA";

  return {
    emaFairMarketValue,
    liquidationFloor,
    balancedMedian,
    patientBinCeiling,
    volatilityScore,
    volatilityTier,
    volatilityLabel,
    coefficientOfVariation: cv,
    sampleSize: n,
    recencyConfidence,
  };
}
