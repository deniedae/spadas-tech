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
 * Realistic parcel & packaging shipping cost estimates by category.
 * Accounts for dimensional weight, boxed keyboards, heavy ceramic bubble-wrap, and tracked media.
 */
export function estimateCategoryShippingCost(category?: string | null, productName?: string | null): number {
  const text = `${category || ""} ${productName || ""}`.toLowerCase();

  // 1. Bulky Peripherals & Keyboards (require 18"+ box, 1.5 - 2.5 lbs)
  if (text.includes("keyboard") || text.includes("monitor") || text.includes("printer") || text.includes("stereo") || text.includes("receiver") || text.includes("blender")) {
    return 9.50;
  }

  // 2. Fragile Ceramic / Glassware / Mugs (heavy bubble-wrap + 6x6x6 box to prevent transit breakage)
  if (text.includes("mug") || text.includes("cup") || text.includes("glass") || text.includes("ceramic") || text.includes("porcelain") || text.includes("vase") || text.includes("plate") || text.includes("bowl")) {
    return 8.50;
  }

  // 3. Heavy Footwear & Boots (Shoebox dimensions, 2 - 3 lbs)
  if (text.includes("boot") || text.includes("sneaker") || text.includes("shoe") || text.includes("cleat")) {
    return 11.00;
  }

  // 4. Heavy Outerwear & Jackets (Over 500g satchel)
  if (text.includes("jacket") || text.includes("coat") || text.includes("parka") || text.includes("hoodie") || text.includes("sweatshirt") || text.includes("sweater")) {
    return 10.50;
  }

  // 5. Media & Literature (Tracked Media Mail / Rigid Padded Mailer)
  if (text.includes("dvd") || text.includes("cd") || text.includes("vhs") || text.includes("bluray") || text.includes("blu-ray") || text.includes("book") || text.includes("cassette") || text.includes("media")) {
    return 4.20;
  }

  // 6. Lightweight Apparel (T-shirts, shirts, shorts under 500g satchel)
  if (text.includes("t-shirt") || text.includes("tee") || text.includes("shirt") || text.includes("shorts") || text.includes("jersey") || text.includes("hat") || text.includes("cap")) {
    return 5.50;
  }

  // 7. Small Handheld Tech (Digicams, iPods, phones, small gadgets)
  if (text.includes("camera") || text.includes("digicam") || text.includes("ipod") || text.includes("phone") || text.includes("game boy") || text.includes("nintendo ds")) {
    return 6.00;
  }

  // Default standard tracked domestic parcel
  return 6.50;
}

export interface ThriftTrapResult {
  isTrap: boolean;
  trapType?: "PENNY_MEDIA" | "COMMODITY_TECH" | "FRAGILE_MUG" | "FAST_FASHION" | "LOW_MARGIN";
  reason?: string;
}

/**
 * Detects common thrift store traps that fool amateur resellers:
 * - $5 common DVDs / CDs where shipping costs eat 100% of profit
 * - Amazon Basics / Onn / Insignia budget commodity tech that sells cheaper new on Amazon Prime
 * - Mass-market ceramic novelty coffee mugs with high breakage and heavy postal weight
 */
export function detectThriftTrap(
  productName?: string | null,
  resalePrice: number = 0,
  brand?: string | null
): ThriftTrapResult {
  const text = `${productName || ""} ${brand || ""}`.toLowerCase();

  // Trap A: Common Mass-Market Media DVDs / CDs / VHS under $14
  const isMedia = text.includes("dvd") || text.includes("cd") || text.includes("vhs") || text.includes("blu-ray") || text.includes("bluray");
  const isRareMedia = text.includes("criterion") || text.includes("sealed") || text.includes("box set") || text.includes("out of print") || text.includes("rare") || text.includes("anime") || text.includes("steelbook");
  if (isMedia && !isRareMedia && resalePrice <= 14) {
    return {
      isTrap: true,
      trapType: "PENNY_MEDIA",
      reason: "Common mass-market media. Tracked postage ($4.20) + platform fees consume 100% of proceeds. Negative or zero net margin.",
    };
  }

  // Trap B: Budget Commodity Tech (Amazon Basics, Insignia, Onn, Mainstays, Blackweb, Anko)
  const isCommodityBrand =
    text.includes("amazon basics") ||
    text.includes("amazonbasics") ||
    text.includes("insignia") ||
    text.includes("onn.") ||
    text.includes("onn ") ||
    text.includes("blackweb") ||
    text.includes("mainstays") ||
    text.includes("anko");
  if (isCommodityBrand) {
    return {
      isTrap: true,
      trapType: "COMMODITY_TECH",
      reason: "Commodity budget brand. Sells cheaper brand-new on Amazon Prime; shipping cost ($9+) kills any margin. Zero secondary market demand.",
    };
  }

  // Trap C: Mass-Market Novelty Ceramic Mugs (unless rare vintage 80s/90s or Starbucks Been There)
  const isMug = text.includes("mug") || text.includes("coffee cup") || text.includes("ceramic cup");
  const isCollectorMug = text.includes("starbucks been there") || text.includes("vintage 198") || text.includes("vintage 197") || text.includes("fire-king") || text.includes("pyrex") || text.includes("tiki");
  if (isMug && !isCollectorMug && resalePrice <= 25) {
    return {
      isTrap: true,
      trapType: "FRAGILE_MUG",
      reason: "Mass-market novelty ceramic. Heavy fragile bubble packaging ($8.50+) and high breakage risk eliminate profit unless rare vintage.",
    };
  }

  // Trap D: Fast Fashion (Shein, Temu, Primark)
  const isFastFashion = text.includes("shein") || text.includes("temu") || text.includes("primark");
  if (isFastFashion) {
    return {
      isTrap: true,
      trapType: "FAST_FASHION",
      reason: "Disposable fast fashion. No secondary market resale demand and zero margin after shipping.",
    };
  }

  return { isTrap: false };
}

/**
 * Calculates complete net profit, ROI, and actionable Cop Verdict for any scanned item.
 * Automatically deducts realistic parcel shipping and applies ruthless thrift trap filters.
 */
export function calculateThriftCopVerdict(options: {
  resalePrice: number;
  customCost?: number | null;
  category?: string | null;
  productName?: string | null;
  brand?: string | null;
  platformFeeRate?: number; // default 0.134 (eBay standard)
  fixedFee?: number; // default 0.33
  shippingCost?: number;
}): ThriftPricingEstimate {
  const {
    resalePrice = 0,
    customCost,
    category,
    productName,
    brand,
    platformFeeRate = 0.134,
    fixedFee = 0.33,
    shippingCost,
  } = options;

  const estimatedThriftCost =
    typeof customCost === "number" && customCost > 0
      ? customCost
      : estimateThriftCost(category);

  // Automatically estimate category shipping if not explicitly passed
  const effectiveShipping =
    typeof shippingCost === "number" && shippingCost > 0
      ? shippingCost
      : estimateCategoryShippingCost(category, productName);

  const platformFees = Math.round((resalePrice * platformFeeRate + fixedFee) * 100) / 100;
  
  // Real Reseller Net Profit: Resale Price - Thrift Tag Cost - eBay Fees - Parcel Shipping
  const netProfit = Math.max(
    -estimatedThriftCost,
    Math.round((resalePrice - estimatedThriftCost - platformFees - effectiveShipping) * 100) / 100
  );

  const roiPercentage =
    estimatedThriftCost > 0
      ? Math.round((netProfit / estimatedThriftCost) * 100)
      : 0;

  const marginPercentage =
    resalePrice > 0 ? Math.round((netProfit / resalePrice) * 1000) / 10 : 0;

  // Check for Thrift Traps (Common DVDs, Amazon Basics, Novelty Mugs, Fast Fashion)
  const trap = detectThriftTrap(productName, resalePrice, brand);

  let copVerdict: ThriftPricingEstimate["copVerdict"] = "FAIR_MARGIN";
  let verdictLabel = "⚖️ Fair Margin";
  let verdictDescription = "Moderate margin. Good if you need inventory volume.";
  let badgeStyle = {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  };

  // RUTHLESS RESELLER COP VERDICT
  if (trap.isTrap) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "🛑 HARD PASS (Thrift Trap)";
    verdictDescription = trap.reason || "Postage & fees exceed market value. Leave on shelf.";
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/40",
    };
  } else if (netProfit <= 0 || (resalePrice < 14 && category?.toLowerCase().includes("media"))) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "🛑 HARD PASS (Negative Margin)";
    verdictDescription = `Net profit is negative (-$${Math.abs(netProfit).toFixed(2)}) after $${effectiveShipping.toFixed(2)} shipping and platform fees. Leave on shelf.`;
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/40",
    };
  } else if (netProfit < 7 || roiPercentage < 40) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "🛑 Risky / Low Profit";
    verdictDescription = `Thin profit ($${netProfit.toFixed(2)}) after postage. High effort for low reward.`;
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/30",
    };
  } else if (netProfit >= 35 || (roiPercentage >= 250 && netProfit >= 25)) {
    copVerdict = "MUST_COP";
    verdictLabel = "🔥 MUST COP (High Profit)";
    verdictDescription = `Outstanding return! Projected +$${netProfit.toFixed(0)} profit (${roiPercentage}% ROI) after shipping.`;
    badgeStyle = {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/40",
    };
  } else if (netProfit >= 15 || roiPercentage >= 100) {
    copVerdict = "QUICK_FLIP";
    verdictLabel = "⚡ Quick Flip";
    verdictDescription = `Solid net profit ($${netProfit.toFixed(0)}) with fast sell-through turnaround.`;
    badgeStyle = {
      bg: "bg-cyan-500/20",
      text: "text-cyan-300",
      border: "border-cyan-500/30",
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
    sourcingTip = "💡 Tip: Verify battery compartment cleanliness and test switches.";
  } else if (catLower.includes("media") || catLower.includes("dvd")) {
    sourcingTip = "💡 Tip: Only buy DVDs if sealed, Criterion Collection, steelbooks, or rare anime.";
  }

  return {
    estimatedResalePrice: resalePrice,
    estimatedThriftCost,
    platformFees,
    estimatedShipping: effectiveShipping,
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
