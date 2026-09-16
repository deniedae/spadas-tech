/**
 * Spadas Intrinsic Best-Selling-Price Engine
 *
 * Quantitatively calculates the optimal selling price, liquidation floor,
 * and speculative ceiling when ZERO historical sold comps exist on eBay.
 * Grounded in visual identification, brand equity, condition stratification,
 * and category market dynamics.
 */

import { CONDITION_MULTIPLIERS, type PhysicalConditionTier } from "./condition-haircut-engine";

export type ScarcityProfile =
  | "LUXURY_RARITY"
  | "VINTAGE_COLLECTIBLE"
  | "NICHE_MODEL"
  | "GENERAL_UNCOMPED";

export interface IntrinsicPriceAppraisal {
  /** Recommended anchor list price (Buy It Now with Best Offer) */
  optimalListPrice: number;
  /** Fast liquidation floor price (sell within 24-48h) */
  quickFlipFloor: number;
  /** Patient / speculative ceiling for rare items or collectors */
  speculativeCeiling: number;
  /** Best Offer minimum acceptable threshold */
  bestOfferAcceptFloor: number;
  /** Best Offer auto-decline threshold */
  bestOfferDeclineCeiling: number;
  /** Estimated net take-home profit at optimal list price after eBay fees (~13.4% + $0.33) and estimated postage (~$9.50) */
  estimatedNetAtOptimal: number;
  /** Estimated net take-home profit at quick flip floor */
  estimatedNetAtFloor: number;
  /** Scarcity and market categorization */
  scarcityProfile: ScarcityProfile;
  scarcityLabel: string;
  /** Grounded rationale explaining why this price was calculated */
  pricingRationale: string;
  /** Actionable strategy recommendations for the reseller */
  listingTactics: string[];
}

interface IntrinsicPricingParams {
  title?: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  baseEstimatedValue?: number;
  suggestedMin?: number;
  suggestedMax?: number;
  thriftCost?: number;
}

/**
 * Normalizes condition string to a physical condition tier.
 */
function normalizeConditionTier(condition?: string | null): PhysicalConditionTier {
  if (!condition) return "used_good";
  const lower = condition.toLowerCase();
  if (lower.includes("new") || lower.includes("sealed") || lower.includes("deadstock")) return "brand_new";
  if (lower.includes("mint") || lower.includes("like new")) return "like_new";
  if (lower.includes("excellent") || lower.includes("very good")) return "used_excellent";
  if (lower.includes("fair") || lower.includes("worn") || lower.includes("flawed")) return "heavily_worn";
  if (lower.includes("parts") || lower.includes("broken") || lower.includes("as-is") || lower.includes("untested")) return "for_parts";
  return "used_good";
}

/**
 * Evaluates scarcity profile based on title and brand keywords.
 */
function evaluateScarcityProfile(title: string, brand?: string | null): { profile: ScarcityProfile; label: string } {
  const combined = `${brand || ""} ${title}`.toLowerCase();

  const isLuxury = /\b(prada|gucci|louis vuitton|chanel|dior|bottega|saint laurent|ysl|hermes|celine|balenciaga|burberry|rolex|omega|cartier)\b/i.test(combined);
  if (isLuxury) {
    return {
      profile: "LUXURY_RARITY",
      label: "Designer / Luxury Rarity",
    };
  }

  const isVintage = /\b(vintage|retro|rare|antique|y2k|90s|80s|70s|collectible|limited edition|numbered|archive)\b/i.test(combined);
  if (isVintage) {
    return {
      profile: "VINTAGE_COLLECTIBLE",
      label: "Vintage / Collectible Scarcity",
    };
  }

  const isNiche = /\b(pro|edition|special|custom|oem|japan|audiophile|industrial|commercial|modular)\b/i.test(combined);
  if (isNiche) {
    return {
      profile: "NICHE_MODEL",
      label: "Niche / Specialist Model",
    };
  }

  return {
    profile: "GENERAL_UNCOMPED",
    label: "Uncomped Secondary Find",
  };
}

/**
 * Calculates the optimal selling appraisal when 0 eBay sold comps exist.
 */
export function calculateIntrinsicBestPrice(params: IntrinsicPricingParams): IntrinsicPriceAppraisal {
  const rawBase = Math.max(10, Number(params.baseEstimatedValue) || 35);
  const title = params.title || "Item";
  const brand = params.brand || null;
  const thriftCost = Math.max(0, Number(params.thriftCost) || 0);

  // 1. Condition Adjustment
  const conditionTier = normalizeConditionTier(params.condition);
  const conditionFactor = CONDITION_MULTIPLIERS[conditionTier]?.factor ?? 0.85;

  // 2. Scarcity & Category Factor
  const { profile: scarcityProfile, label: scarcityLabel } = evaluateScarcityProfile(title, brand);

  let scarcityMultiplier = 1.0;
  if (scarcityProfile === "LUXURY_RARITY") scarcityMultiplier = 1.15;
  else if (scarcityProfile === "VINTAGE_COLLECTIBLE") scarcityMultiplier = 1.10;
  else if (scarcityProfile === "NICHE_MODEL") scarcityMultiplier = 1.05;

  // 3. Calibrate Intrinsic Baseline Fair Market Value (FMV)
  const adjustedBase = Math.round(rawBase * conditionFactor * scarcityMultiplier * 100) / 100;

  // 4. Calculate Optimal List Price, Quick Flip Floor, and Speculative Ceiling
  // Optimal List Price: Anchor ~10-15% above fair market to leave room for Best Offer negotiation
  const optimalListPrice = Math.max(12, Math.round(adjustedBase * 1.12 * 100) / 100);

  // Quick Flip Floor: Liquidate within 24-48 hours (~75% of fair market)
  const quickFlipFloor = Math.max(8, Math.round(adjustedBase * 0.76 * 100) / 100);

  // Speculative Ceiling: Anchor high for patient sellers testing scarcity (~135% of fair market)
  const speculativeCeiling = Math.max(optimalListPrice + 5, Math.round(adjustedBase * 1.38 * 100) / 100);

  // Best Offer Thresholds
  const bestOfferAcceptFloor = Math.round(adjustedBase * 0.90 * 100) / 100;
  const bestOfferDeclineCeiling = Math.round(adjustedBase * 0.70 * 100) / 100;

  // Fees & Shipping Estimation (eBay Australia: 13.4% + $0.33, tracked shipping ~$9.50)
  const estShipping = 9.5;
  const calcNet = (gross: number) => {
    const fees = Math.round((gross * 0.134 + 0.33) * 100) / 100;
    return Math.max(0, Math.round((gross - thriftCost - fees - estShipping) * 100) / 100);
  };

  const estimatedNetAtOptimal = calcNet(optimalListPrice);
  const estimatedNetAtFloor = calcNet(quickFlipFloor);

  // 5. Generate Dynamic Grounded Rationale
  let pricingRationale = `Zero completed sales were found on eBay for this exact model in recent 30–90 day records. `;
  if (scarcityProfile === "LUXURY_RARITY" || scarcityProfile === "VINTAGE_COLLECTIBLE") {
    pricingRationale += `Because no competing sold listings exist, you hold scarcity pricing power. We recommend anchoring at $${optimalListPrice} AUD to test buyer demand without giving away collector margin.`;
  } else {
    pricingRationale += `Based on category visual recognition, condition (${params.condition || "Used"}), and standard replacement value, the optimal listing price is $${optimalListPrice} AUD with a fast-sale floor of $${quickFlipFloor} AUD.`;
  }

  // 6. Actionable Listing Tactics
  const listingTactics = [
    `Format: Buy It Now at $${optimalListPrice} AUD with "Best Offer" enabled.`,
    `Auto-Accept Offers: Set at $${bestOfferAcceptFloor} AUD or higher for instant sales.`,
    `Auto-Decline Offers: Filter out lowballs under $${bestOfferDeclineCeiling} AUD.`,
    `Fast Liquidation: If not sold in 14 days, reduce directly to the $${quickFlipFloor} AUD cash floor.`,
  ];

  return {
    optimalListPrice,
    quickFlipFloor,
    speculativeCeiling,
    bestOfferAcceptFloor,
    bestOfferDeclineCeiling,
    estimatedNetAtOptimal,
    estimatedNetAtFloor,
    scarcityProfile,
    scarcityLabel,
    pricingRationale,
    listingTactics,
  };
}
