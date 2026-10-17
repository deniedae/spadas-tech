/**
 * Spadas Reseller Profit & Cop Verdict Engine
 * Provides instant thrift pricing benchmarks, category COGS estimation,
 * platform fee deductions, and algorithmic BUY / PASS / MUST COP recommendations.
 */

import { calculateSalesVelocity, type SalesVelocityProfile } from "./turnover-velocity-engine";
import {
  getAusPostShippingRate,
  getDomesticShippingRate,
  EBAY_AU_FEE_RATE,
  EBAY_AU_FIXED_FEE,
  EBAY_UK_FEE_RATE,
  EBAY_UK_FIXED_FEE,
  EBAY_US_FEE_RATE,
  EBAY_US_FIXED_FEE,
} from "./fee-engine";

export interface ThriftPricingEstimate {
  estimatedResalePrice: number;
  estimatedThriftCost: number;
  platformFees: number;
  estimatedShipping: number;
  netProfit: number;
  roiPercentage: number;
  marginPercentage: number;
  copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" | "VERIFY_FIRST";
  verdictLabel: string;
  verdictDescription: string;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
  };
  sourcingTip?: string;
  salesVelocity: SalesVelocityProfile;
  fallbackProtocol?: "SCAN_BARCODE" | "ZOOM_LABEL" | "SECOND_ANGLE" | "NONE";
  requiresSecondaryVerification?: boolean;
  verificationReason?: string;
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

export function estimateThriftCost(category?: string | null, currency: string = "AUD"): number {
  const isUS = currency.toUpperCase() === "USD";
  const isUK = currency.toUpperCase() === "GBP";
  if (!category) return isUK ? 2.75 : isUS ? 3.5 : 5.0;
  const c = category.toLowerCase().trim();
  let baseCost = 5.0;
  for (const [key, cost] of Object.entries(CATEGORY_THRIFT_COGS)) {
    if (c.includes(key)) {
      baseCost = cost;
      break;
    }
  }
  return isUK
    ? Math.max(1.0, Math.round(baseCost * 0.55 * 100) / 100)
    : isUS
      ? Math.max(1.5, Math.round(baseCost * 0.7 * 100) / 100)
      : baseCost;
}

/**
 * Domestic Parcel Shipping Rate Matrix:
 * - US (USD): USPS Ground Advantage ($4.80 - $15.50 USD)
 * - AU (AUD): AusPost Standard Parcel Post ($10.90 - $22.75 AUD)
 */
export function estimateCategoryShippingCost(
  category?: string | null,
  productName?: string | null,
  currency: string = "AUD"
): number {
  return getDomesticShippingRate(category, productName, undefined, currency).rate;
}

export interface ThriftTrapResult {
  isTrap: boolean;
  trapType?: "LOW_MARGIN_MEDIA" | "COMMODITY_ELECTRONICS" | "HIGH_SHIPPING_RISK" | "FAST_FASHION" | "LOW_MARGIN";
  reason?: string;
}

/**
 * Detects categories with typically low net margins due to high shipping relative to value:
 */
export function detectThriftTrap(
  productName?: string | null,
  resalePrice: number = 0,
  brand?: string | null
): ThriftTrapResult {
  const text = `${productName || ""} ${brand || ""}`.toLowerCase();

  // Media
  const isMedia = text.includes("dvd") || text.includes("cd") || text.includes("vhs") || text.includes("blu-ray") || text.includes("bluray");
  const isRareMedia = text.includes("criterion") || text.includes("sealed") || text.includes("box set") || text.includes("out of print") || text.includes("rare") || text.includes("anime") || text.includes("steelbook");
  if (isMedia && !isRareMedia && resalePrice <= 14) {
    return {
      isTrap: true,
      trapType: "LOW_MARGIN_MEDIA",
      reason: "Common media. Shipping and fees typically consume net margin.",
    };
  }

  // Budget Electronics
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
      trapType: "COMMODITY_ELECTRONICS",
      reason: "Commodity budget brand. Limited secondary market demand.",
    };
  }

  // Mugs
  const isMug = text.includes("mug") || text.includes("coffee cup") || text.includes("ceramic cup");
  const isCollectorMug = text.includes("starbucks been there") || text.includes("vintage 198") || text.includes("vintage 197") || text.includes("fire-king") || text.includes("pyrex") || text.includes("tiki");
  if (isMug && !isCollectorMug && resalePrice <= 25) {
    return {
      isTrap: true,
      trapType: "HIGH_SHIPPING_RISK",
      reason: "High shipping and packaging costs relative to item value.",
    };
  }

  // Fast Fashion
  const isFastFashion = text.includes("shein") || text.includes("temu") || text.includes("primark");
  if (isFastFashion) {
    return {
      isTrap: true,
      trapType: "FAST_FASHION",
      reason: "Fast fashion. Limited resale margin after shipping.",
    };
  }

  return { isTrap: false };
}

/**
 * Calculates complete net profit, ROI, and actionable Cop Verdict for any scanned item.
 * Automatically deducts realistic parcel shipping and applies ruthless thrift trap filters.
 */
export interface CalculateCopVerdictOptions {
  resalePrice: number;
  customCost?: number | null;
  category?: string | null;
  productName?: string | null;
  brand?: string | null;
  platformFeeRate?: number; // default EBAY_AU_FEE_RATE (13.4% eBay AU Pro Starter, incl. GST)
  fixedFee?: number; // default EBAY_AU_FIXED_FEE ($0.30 AUD, Pro Starter)
  shippingCost?: number;
  currency?: string | null;
  confidenceScore?: number; // 0.0 to 1.0 or 0 to 100
  variantAudit?: {
    variantName?: string | null;
    modelYearOrGen?: string | null;
    colorway?: string | null;
    isReprintRisk?: boolean;
    completeness?: "complete" | "incomplete_missing_parts" | "loose_only" | "bundle" | string;
    reprintWarning?: string | null;
  };
  needsVerification?: boolean;
  hasVerifiedBarcode?: boolean;
  hasMultiAngleConfirmation?: boolean;
}

/**
 * Calculates complete net profit, ROI, and actionable Cop Verdict for any scanned item.
 * Enforces ZERO BLIND VERDICTS: Withholds MUST_COP whenever visual confidence < 88%
 * or near-match/reprint risks are detected, triggering explicit secondary fallback actions.
 */
export function calculateThriftCopVerdict(options: CalculateCopVerdictOptions): ThriftPricingEstimate {
  const currency = (options.currency || "AUD").toUpperCase();
  const defaultFeeRate = currency === "GBP" ? EBAY_UK_FEE_RATE : currency === "USD" ? EBAY_US_FEE_RATE : EBAY_AU_FEE_RATE;
  const defaultFixedFee = currency === "GBP" ? EBAY_UK_FIXED_FEE : currency === "USD" ? EBAY_US_FIXED_FEE : EBAY_AU_FIXED_FEE;

  const {
    resalePrice = 0,
    customCost,
    category,
    productName,
    brand,
    platformFeeRate = defaultFeeRate,
    fixedFee = defaultFixedFee,
    shippingCost,
  } = options;

  const estimatedThriftCost =
    typeof customCost === "number" && customCost > 0
      ? customCost
      : estimateThriftCost(category, currency);

  // Automatically estimate category shipping if not explicitly passed
  const effectiveShipping =
    typeof shippingCost === "number" && shippingCost > 0
      ? shippingCost
      : estimateCategoryShippingCost(category, productName, currency);

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

  // Calculate Empirical Sell-Through Rate (STR) and Turnover Days
  const salesVelocity = calculateSalesVelocity({
    productName,
    category,
    brand,
  });

  let copVerdict: ThriftPricingEstimate["copVerdict"] = "FAIR_MARGIN";
  let verdictLabel = "Fair Margin";
  let verdictDescription = `Moderate margin. Turnover speed: ${salesVelocity.estDaysToSell} (${salesVelocity.sellThroughRate}% sold).`;
  let badgeStyle = {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  };
  let fallbackProtocol: ThriftPricingEstimate["fallbackProtocol"] = "NONE";
  let requiresSecondaryVerification = false;
  let verificationReason: string | undefined;

  // STRICT ZERO BLIND VERDICT GUARD
  // Normalize confidence score to 0.0 - 1.0
  const normConfidence =
    typeof options.confidenceScore === "number"
      ? options.confidenceScore > 1
        ? options.confidenceScore / 100
        : options.confidenceScore
      : 0.95;

  const isLowConfidence = normConfidence < 0.88;
  const isReprintRisk = Boolean(options.variantAudit?.isReprintRisk);
  const isIncompleteOrBundle =
    options.variantAudit?.completeness === "incomplete_missing_parts" ||
    options.variantAudit?.completeness === "bundle";
  const isNeedsVerification = Boolean(options.needsVerification);

  const shouldWithholdVerdict =
    !options.hasVerifiedBarcode &&
    !options.hasMultiAngleConfirmation &&
    (isLowConfidence || isReprintRisk || isIncompleteOrBundle || isNeedsVerification);

  // RUTHLESS RESELLER COP VERDICT
  if (trap.isTrap) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "Pass (Low Margin)";
    verdictDescription = trap.reason || "Postage & fees exceed market value.";
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/40",
    };
  } else if (salesVelocity.isHoarderRisk) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "Pass (Low Turnover)";
    verdictDescription =
      salesVelocity.warning ||
      `Sluggish turnover (${salesVelocity.sellThroughRate}% sold, ${salesVelocity.estDaysToSell}).`;
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/40",
    };
  } else if (netProfit <= 0 || (resalePrice < 14 && category?.toLowerCase().includes("media"))) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "Pass (Loss)";
    verdictDescription = `Net profit is negative ($${netProfit.toFixed(2)}) after $${effectiveShipping.toFixed(2)} shipping and platform fees.`;
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/40",
    };
  } else if (netProfit < 7 || roiPercentage < 40) {
    copVerdict = "PASS_RISKY";
    verdictLabel = "Pass (Low Profit)";
    verdictDescription = `Thin profit ($${netProfit.toFixed(2)}) after postage.`;
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/30",
    };
  } else if (netProfit >= 35 || (roiPercentage >= 250 && netProfit >= 25)) {
    if (shouldWithholdVerdict) {
      copVerdict = "VERIFY_FIRST";
      requiresSecondaryVerification = true;

      const catText = `${category || ""} ${productName || ""}`.toLowerCase();
      const isModernOrBoxed = catText.includes("electronic") || catText.includes("gaming") || catText.includes("tech") || catText.includes("toy") || catText.includes("media");
      const isApparelOrVintage = catText.includes("apparel") || catText.includes("vintage") || catText.includes("shirt") || catText.includes("jacket") || catText.includes("shoe") || catText.includes("sneaker");

      if (isReprintRisk) {
        fallbackProtocol = "ZOOM_LABEL";
        verdictLabel = "Verify First (Reprint Risk)";
        verificationReason = options.variantAudit?.reprintWarning || "Visual match resembles high-value item, but requires tag confirmation.";
        verdictDescription = verificationReason;
      } else if (isIncompleteOrBundle) {
        fallbackProtocol = "SECOND_ANGLE";
        verdictLabel = "Verify First (Check Parity)";
        verificationReason = `Unit detected as ${options.variantAudit?.completeness || "non-standard"}. Comps may reflect complete sets.`;
        verdictDescription = verificationReason;
      } else if (isModernOrBoxed) {
        fallbackProtocol = "SCAN_BARCODE";
        verdictLabel = "Verify First (Scan Barcode)";
        verificationReason = `Scan barcode to confirm exact model & SKU parity.`;
        verdictDescription = verificationReason;
      } else if (isApparelOrVintage) {
        fallbackProtocol = "ZOOM_LABEL";
        verdictLabel = "Verify First (Inspect Label)";
        verificationReason = `Visual match requires tag confirmation. Inspect collar tag or care label.`;
        verdictDescription = verificationReason;
      } else {
        fallbackProtocol = "SECOND_ANGLE";
        verdictLabel = "Verify First (Second Angle)";
        verificationReason = `Visual confidence (${Math.round(normConfidence * 100)}%) below threshold. Inspect secondary angle.`;
        verdictDescription = verificationReason;
      }

      badgeStyle = {
        bg: "bg-amber-500/20",
        text: "text-amber-300",
        border: "border-amber-500/50",
      };
    } else {
      copVerdict = "MUST_COP";
      verdictLabel = "High Profit";
      verdictDescription = `Projected +$${netProfit.toFixed(0)} profit (${roiPercentage}% ROI, ${salesVelocity.estDaysToSell} turnover).`;
      badgeStyle = {
        bg: "bg-emerald-500/20",
        text: "text-emerald-400",
        border: "border-emerald-500/40",
      };
    }
  } else if (netProfit >= 15 || roiPercentage >= 100) {
    if (shouldWithholdVerdict && isLowConfidence) {
      copVerdict = "VERIFY_FIRST";
      requiresSecondaryVerification = true;
      fallbackProtocol = "SECOND_ANGLE";
      verdictLabel = "Verify First (Low Confidence)";
      verificationReason = `Visual confidence (${Math.round(normConfidence * 100)}%) below threshold. Check item or snap secondary angle.`;
      verdictDescription = verificationReason;
      badgeStyle = {
        bg: "bg-amber-500/20",
        text: "text-amber-300",
        border: "border-amber-500/40",
      };
    } else {
      copVerdict = "QUICK_FLIP";
      verdictLabel = `Good Margin (~${salesVelocity.estDaysToSell})`;
      verdictDescription = `Net profit ($${netProfit.toFixed(0)}) with steady turnaround (${salesVelocity.sellThroughRate}% sold).`;
      badgeStyle = {
        bg: "bg-cyan-500/20",
        text: "text-cyan-300",
        border: "border-cyan-500/30",
      };
    }
  }

  // Sourcing tips based on category
  let sourcingTip: string | undefined;
  const catLower = (category || "").toLowerCase();
  if (catLower.includes("apparel") || catLower.includes("vintage") || catLower.includes("shirt")) {
    sourcingTip = "Tip: Check tag for single stitching or manufacturing origin.";
  } else if (catLower.includes("shoe") || catLower.includes("sneaker")) {
    sourcingTip = "Tip: Inspect sole wear and inside size tag SKU.";
  } else if (catLower.includes("gaming") || catLower.includes("electronic")) {
    sourcingTip = "Tip: Verify battery compartment cleanliness and test functionality.";
  } else if (catLower.includes("media") || catLower.includes("dvd")) {
    sourcingTip = "Tip: Inspect disc condition and completeness.";
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
    salesVelocity,
    fallbackProtocol,
    requiresSecondaryVerification,
    verificationReason,
  };
}
