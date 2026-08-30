/**
 * Spadas Reseller Profit & Cop Verdict Engine
 * Provides instant thrift pricing benchmarks, category COGS estimation,
 * platform fee deductions, and algorithmic BUY / PASS / MUST COP recommendations.
 */

export interface ThriftPricingEstimate {
  estimatedResalePrice: number;
  estimatedThriftCost: number;
  platformFees: number;
  estimatedShipping: number;
  netProfit: number;
  roiPercentage: number;
  marginPercentage: number;
  copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY";
  verdictLabel: string;
  verdictDescription: string;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
  };
  sourcingTip?: string;
}

// Typical benchmark thrift / garage sale purchase prices by category
export const CATEGORY_THRIFT_COGS: Record<string, number> = {
  apparel: 5.0,
  jackets: 14.0,
  shoes: 15.0,
  sneakers: 18.0,
  electronics: 10.0,
  gaming: 4.0,
  collectibles: 6.0,
  trading_cards: 2.5,
  handbags: 12.0,
  media: 2.0,
  vintage: 8.0,
  general: 5.0,
};

export function estimateThriftCost(category?: string | null): number {
  if (!category) return 5.0;
  const c = category.toLowerCase().trim();
  for (const [key, cost] of Object.entries(CATEGORY_THRIFT_COGS)) {
    if (c.includes(key)) return cost;
  }
  return 5.0;
}

/**
 * Calculates complete net profit, ROI, and actionable Cop Verdict for any scanned item.
 */
export function calculateThriftCopVerdict(options: {
  resalePrice: number;
  customCost?: number | null;
  category?: string | null;
  platformFeeRate?: number; // default 0.134 (eBay standard)
  fixedFee?: number; // default 0.33
  shippingCost?: number; // default 0
}): ThriftPricingEstimate {
  const {
    resalePrice = 0,
    customCost,
    category,
    platformFeeRate = 0.134,
    fixedFee = 0.33,
    shippingCost = 0,
  } = options;

  const estimatedThriftCost =
    typeof customCost === "number" && customCost > 0
      ? customCost
      : estimateThriftCost(category);

  const platformFees = Math.round((resalePrice * platformFeeRate + fixedFee) * 100) / 100;
  const netProfit = Math.max(
    -estimatedThriftCost,
    Math.round((resalePrice - estimatedThriftCost - platformFees - shippingCost) * 100) / 100
  );

  const roiPercentage =
    estimatedThriftCost > 0
      ? Math.round((netProfit / estimatedThriftCost) * 100)
      : 0;

  const marginPercentage =
    resalePrice > 0 ? Math.round((netProfit / resalePrice) * 1000) / 10 : 0;

  let copVerdict: ThriftPricingEstimate["copVerdict"] = "FAIR_MARGIN";
  let verdictLabel = "⚖️ Fair Margin";
  let verdictDescription = "Moderate margin. Good if you need inventory volume.";
  let badgeStyle = {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  };

  if (netProfit >= 35 || roiPercentage >= 300) {
    copVerdict = "MUST_COP";
    verdictLabel = "🔥 MUST COP (High Profit)";
    verdictDescription = `Outstanding return! Projected +$${netProfit.toFixed(0)} profit (${roiPercentage}% ROI).`;
    badgeStyle = {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/40",
    };
  } else if (netProfit >= 18 || roiPercentage >= 120) {
    copVerdict = "QUICK_FLIP";
    verdictLabel = "⚡ Quick Flip";
    verdictDescription = `Solid profit ($${netProfit.toFixed(0)}) with fast sell-through turnaround.`;
    badgeStyle = {
      bg: "bg-cyan-500/20",
      text: "text-cyan-300",
      border: "border-cyan-500/30",
    };
  } else if (netProfit < 5 || roiPercentage < 30) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "🛑 Risky / Pass";
    verdictDescription = "Low profit margin after fees & shipping. Better to leave on shelf.";
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/30",
    };
  }

  // Sourcing tips based on category
  let sourcingTip: string | undefined;
  const catLower = (category || "").toLowerCase();
  if (catLower.includes("apparel") || catLower.includes("vintage") || catLower.includes("shirt")) {
    sourcingTip = "💡 Tip: Check tag for single stitching & Made in USA for vintage multiplier.";
  } else if (catLower.includes("shoe") || catLower.includes("sneaker")) {
    sourcingTip = "💡 Tip: Inspect sole heel drag & inside size tag SKU for exact comps match.";
  } else if (catLower.includes("gaming") || catLower.includes("electronic")) {
    sourcingTip = "💡 Tip: Verify battery compartment cleanliness and serial number.";
  }

  return {
    estimatedResalePrice: resalePrice,
    estimatedThriftCost,
    platformFees,
    estimatedShipping: shippingCost,
    netProfit,
    roiPercentage,
    marginPercentage,
    copVerdict,
    verdictLabel,
    verdictDescription,
    badgeStyle,
    sourcingTip,
  };
}
