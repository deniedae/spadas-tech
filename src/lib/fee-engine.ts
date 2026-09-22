/**
 * Strict Australian Marketplace Fee & AusPost Domestic Shipping Rate Matrix
 *
 * Provides deterministic mathematical calculations for eBay Australia:
 * 1. eBay AU Final Value Fee (Pro Starter / >$25K annual sellers, incl. GST):
 *    - 13.4% of total sale amount (all standard categories) + $0.30 fixed order fee.
 *    - High-value threshold: 2.5% on the portion of any sale exceeding $4,000.
 *    - NOTE: The 8% footwear reduced rate exists on eBay US but does NOT apply to eBay.com.au.
 *    - Source: ebay.com.au/help/selling/fees-credits-invoices/pro-selling-fees (verified June 2026)
 * 2. AusPost Domestic Parcel Rates:
 *    - Small  (<500g, media/games/jewelry): $10.90 AUD
 *    - Medium (500g–1kg, lightweight apparel): $14.80 AUD
 *    - Large  (1kg–3kg, shoes/hoodies/jackets): $18.65 AUD
 *    - Extra Large (>3kg / bulky goods): $22.75 AUD
 * 3. Deterministic net profit, ROI%, and COGS calculations without LLM estimation.
 * 4. Bulletproof single-$ currency formatting and price sanitization.
 */

/**
 * Official eBay Australia Pro Starter / >$25K seller transaction fee rates (incl. GST).
 * Pro Basic/Featured/Anchor use a $0.33 fixed fee but lower percentage — Pro Starter is
 * the conservative default for thrift resellers auto-upgraded past the $25K annual threshold.
 */
export const EBAY_AU_FEE_RATE = 0.134;   // 13.4% FVF (Pro Starter, incl. GST)
export const EBAY_AU_FIXED_FEE = 0.30;   // $0.30 AUD fixed order fee (Pro Starter)
export const EBAY_AU_HIGH_VALUE_THRESHOLD = 4000;  // Portion above $4,000 charged at reduced rate
export const EBAY_AU_HIGH_VALUE_RATE = 0.025;       // 2.5% on sale amount exceeding $4,000

/** AusPost Standard Parcel Post national delivery matrix */
export const AUSPOST_PARCEL_RATES = {
  small: 10.90,       // Small satchel/box: <500g (media, video games, books, small tech)
  medium: 14.80,      // Medium satchel/box: 500g–1kg (t-shirts, shirts, shorts, hats)
  large: 18.65,       // Large satchel/box: 1kg–3kg (shoes, sneakers, hoodies, outerwear)
  extraLarge: 22.75,  // Extra Large satchel/box: >3kg (heavy electronics, bulky items)
} as const;

export type AusPostParcelTier = keyof typeof AUSPOST_PARCEL_RATES;

export interface AusPostRateResult {
  tier: AusPostParcelTier;
  rate: number;
  weightBracket: string;
  description: string;
}

/**
 * Resolves the deterministic AusPost domestic shipping tier and postage rate
 * using physical category heuristics and optional weight specification.
 */
export function getAusPostShippingRate(
  category?: string | null,
  productName?: string | null,
  weightGrams?: number
): AusPostRateResult {
  // If exact weight is provided, use strict weight brackets
  if (typeof weightGrams === "number" && weightGrams > 0) {
    if (weightGrams <= 500) {
      return {
        tier: "small",
        rate: AUSPOST_PARCEL_RATES.small,
        weightBracket: "< 500g",
        description: "AusPost Small Satchel (<500g)",
      };
    }
    if (weightGrams <= 1000) {
      return {
        tier: "medium",
        rate: AUSPOST_PARCEL_RATES.medium,
        weightBracket: "500g–1kg",
        description: "AusPost Medium Satchel (500g–1kg)",
      };
    }
    if (weightGrams <= 3000) {
      return {
        tier: "large",
        rate: AUSPOST_PARCEL_RATES.large,
        weightBracket: "1kg–3kg",
        description: "AusPost Large Satchel/Box (1kg–3kg)",
      };
    }
    return {
      tier: "extraLarge",
      rate: AUSPOST_PARCEL_RATES.extraLarge,
      weightBracket: "> 3kg",
      description: "AusPost Extra Large Box (>3kg)",
    };
  }

  const text = `${category || ""} ${productName || ""}`.toLowerCase();

  // Tier 4: Extra Large (>3kg, bulky goods)
  if (
    text.includes("stereo") ||
    text.includes("receiver") ||
    text.includes("amplifier") ||
    text.includes("monitor") ||
    text.includes("printer") ||
    text.includes("desktop") ||
    text.includes("microwave") ||
    text.includes("vacuum") ||
    text.includes("heavy duty")
  ) {
    return {
      tier: "extraLarge",
      rate: AUSPOST_PARCEL_RATES.extraLarge,
      weightBracket: "> 3kg",
      description: "AusPost Extra Large Box (>3kg, Bulky)",
    };
  }

  // Tier 3: Large (1kg–3kg: footwear, sneakers, boots, heavy jackets, hoodies)
  if (
    text.includes("shoe") ||
    text.includes("sneaker") ||
    text.includes("boot") ||
    text.includes("cleat") ||
    text.includes("hoodie") ||
    text.includes("jacket") ||
    text.includes("coat") ||
    text.includes("parka") ||
    text.includes("sweater") ||
    text.includes("fleece") ||
    text.includes("handbag") ||
    text.includes("backpack") ||
    text.includes("keyboard")
  ) {
    return {
      tier: "large",
      rate: AUSPOST_PARCEL_RATES.large,
      weightBracket: "1kg–3kg",
      description: "AusPost Large Satchel (1kg–3kg, Shoes/Outerwear)",
    };
  }

  // Tier 1: Small (<500g: video games, DVDs, CDs, books, trading cards, jewelry, digicams, phones)
  if (
    text.includes("dvd") ||
    text.includes("cd") ||
    text.includes("bluray") ||
    text.includes("blu-ray") ||
    text.includes("vhs") ||
    text.includes("cassette") ||
    text.includes("game") ||
    text.includes("nintendo") ||
    text.includes("playstation") ||
    text.includes("xbox") ||
    text.includes("cartridge") ||
    text.includes("book") ||
    text.includes("novel") ||
    text.includes("comic") ||
    text.includes("card") ||
    text.includes("pokemon") ||
    text.includes("phone") ||
    text.includes("digicam") ||
    text.includes("ipod") ||
    text.includes("watch") ||
    text.includes("jewelry") ||
    text.includes("sunglasses")
  ) {
    return {
      tier: "small",
      rate: AUSPOST_PARCEL_RATES.small,
      weightBracket: "< 500g",
      description: "AusPost Small Satchel (<500g, Media/Games)",
    };
  }

  // Tier 2: Medium (500g–1kg: standard apparel, tees, polos, shorts, mugs, small collectibles)
  return {
    tier: "medium",
    rate: AUSPOST_PARCEL_RATES.medium,
    weightBracket: "500g–1kg",
    description: "AusPost Medium Satchel (500g–1kg, Apparel/Goods)",
  };
}

/**
 * Calculates exact eBay AU final value fees.
 * Pro Starter rate: 13.4% + $0.30 fixed fee.
 * High-value threshold: 2.5% on the portion of any sale exceeding $4,000.
 * Source: ebay.com.au Pro Selling Fees (verified June 2026).
 */
export function calculateEbayAuFees(salePrice: number): number {
  if (salePrice <= 0) return 0;
  if (salePrice <= EBAY_AU_HIGH_VALUE_THRESHOLD) {
    return Math.round((salePrice * EBAY_AU_FEE_RATE + EBAY_AU_FIXED_FEE) * 100) / 100;
  }
  // Split: standard rate on first $4,000, reduced rate on the excess
  const standardPortion = Math.round(EBAY_AU_HIGH_VALUE_THRESHOLD * EBAY_AU_FEE_RATE * 100) / 100;
  const excessPortion = Math.round((salePrice - EBAY_AU_HIGH_VALUE_THRESHOLD) * EBAY_AU_HIGH_VALUE_RATE * 100) / 100;
  return Math.round((standardPortion + excessPortion + EBAY_AU_FIXED_FEE) * 100) / 100;
}

export interface AuFinancialBreakdown {
  salePrice: number;
  thriftCost: number;
  ebayFee: number;
  /** Effective percentage rate applied (e.g. 0.134 for 13.4%) */
  feeRateApplied: number;
  ebayFeeRate: number;
  fixedFee: number;
  postage: number;
  postageTier: AusPostParcelTier;
  postageDescription: string;
  netProfit: number;
  roiPercentage: number;
  profitMarginPercentage: number;
  isLoss: boolean;
  copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY";
}

/**
 * Computes deterministic Australian reseller financial metrics.
 * Eliminates all LLM hallucinations by calculating in strict floating-point math.
 */
export function calculateAuResellerFinancials(params: {
  salePrice: number;
  customCost?: number | null;
  category?: string | null;
  productName?: string | null;
  weightGrams?: number;
  customPostage?: number | null;
}): AuFinancialBreakdown {
  const salePrice = Math.max(0, Math.round((params.salePrice || 0) * 100) / 100);

  // COGS: If custom tag cost specified, use it; otherwise benchmark at 15% of sale price (min $2, max $20)
  let thriftCost = 2;
  if (typeof params.customCost === "number" && params.customCost > 0) {
    thriftCost = Math.round(params.customCost * 100) / 100;
  } else if (salePrice > 0) {
    if (salePrice <= 5) {
      thriftCost = Math.max(1, Math.round(salePrice * 0.65 * 100) / 100);
    } else {
      thriftCost = Math.min(20, Math.max(2, Math.round(salePrice * 0.15 * 100) / 100));
    }
  }

  // eBay AU Fees: 13.4% + $0.30 (Pro Starter, incl. GST) with >$4K high-value tier
  const ebayFee = calculateEbayAuFees(salePrice);

  // AusPost Postage
  const postageResult = getAusPostShippingRate(params.category, params.productName, params.weightGrams);
  const postage =
    typeof params.customPostage === "number" && params.customPostage >= 0
      ? Math.round(params.customPostage * 100) / 100
      : postageResult.rate;

  // True Reseller Net Profit: Sale Price − Thrift Cost − eBay AU Fees
  // (In eBay AU, postage is typically paid by the buyer or accounted for in all-in comp prices)
  const rawNetProfit = Math.round((salePrice - thriftCost - ebayFee) * 100) / 100;
  const netProfit = Math.round(Math.max(-thriftCost, rawNetProfit) * 100) / 100;
  const isLoss = netProfit < 0;

  const roiPercentage =
    thriftCost > 0 ? Math.round((netProfit / thriftCost) * 100) : 0;

  const profitMarginPercentage =
    salePrice > 0 ? Math.round((netProfit / salePrice) * 100) : 0;

  // Algorithmic Cop Verdict — GUARD: never emit BUY signal on a loss
  let copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" = "FAIR_MARGIN";
  if (netProfit < 3 || isLoss) {
    copVerdict = "PASS_RISKY";
  } else if (roiPercentage >= 250 && netProfit >= 25) {
    copVerdict = "MUST_COP";
  } else if (roiPercentage >= 80 && netProfit >= 12) {
    copVerdict = "QUICK_FLIP";
  } else {
    copVerdict = "FAIR_MARGIN";
  }

  return {
    salePrice,
    thriftCost,
    ebayFee,
    feeRateApplied: EBAY_AU_FEE_RATE,
    ebayFeeRate: EBAY_AU_FEE_RATE,
    fixedFee: EBAY_AU_FIXED_FEE,
    postage,
    postageTier: postageResult.tier,
    postageDescription: postageResult.description,
    netProfit,
    roiPercentage,
    profitMarginPercentage,
    isLoss,
    copVerdict,
  };
}

/**
 * Sanitizes incoming price strings from scrapers, OCR, or APIs.
 * Strips leading multiple '$', whitespace, and non-numeric characters.
 * Ensures clean numeric output with exactly one '$' prefix on render.
 */
export function sanitizeCompPrice(raw: string | number | null | undefined): {
  numericPrice: number;
  formattedPrice: string;
} {
  if (raw === null || raw === undefined) {
    return { numericPrice: 0, formattedPrice: "$0.00" };
  }

  if (typeof raw === "number") {
    const val = isNaN(raw) ? 0 : Math.round(raw * 100) / 100;
    return {
      numericPrice: val,
      formattedPrice: val < 0 ? `-$${Math.abs(val).toFixed(2)}` : `$${val.toFixed(2)}`,
    };
  }

  const str = String(raw).trim();
  // Strip all leading '$', 'AUD', 'AU $', whitespace
  const cleaned = str
    .replace(/^(aud|au)?\s*\$+/i, "")
    .trim()
    .replace(/[^0-9.-]+/g, "");

  const num = parseFloat(cleaned);
  const validNum = isNaN(num) ? 0 : Math.round(num * 100) / 100;

  return {
    numericPrice: validNum,
    formattedPrice: validNum < 0 ? `-$${Math.abs(validNum).toFixed(2)}` : `$${validNum.toFixed(2)}`,
  };
}
