/**
 * Spadas Fragrance & Liquid Fill-Level Engine
 * 
 * Provides automated detection and precision valuation adjustments for
 * open, partial, tester, or unboxed fragrances, perfumes, colognes, and cosmetic liquids.
 * 
 * Prevents used, half-empty, or capless bottles from pulling retail "Brand New / Sealed" comps.
 */

import type { RawSoldComp } from "@/types/lens";
import { cleanConditionText } from "@/lib/lens-utils";

export interface FragranceLiquidState {
  isFragrance: boolean;
  fillLevelPercent: number; // 10 to 100
  hasCap: boolean;
  isTester: boolean;
  hasBox: boolean;
  isPartial: boolean;
}

/**
 * Regex identifying fragrances, perfumes, colognes, and liquid cosmetics.
 */
const FRAGRANCE_KEYWORDS =
  /\b(perfume|fragrance|cologne|parfum|eau de toilette|eau de parfum|edt|edp|aftershave|after shave|body mist|body spray|cologne spray|scent|eau de cologne|edc|extrait|splash bottle|rollerball|perfume oil|attar|serum|toner|face lotion|eau fraiche|pour homme|pour femme)\b/i;

const FRAGRANCE_CATEGORIES =
  /\b(fragrance|fragrances|perfume|perfumes|cologne|colognes|beauty|cosmetics|health & beauty|skincare|bath & body)\b/i;

/**
 * Regex matching Brand New / Sealed / Retail comp listings that must not distort used/open bottles.
 */
export const SEALED_RETAIL_COMP_REGEX =
  /\b(brand new|sealed|factory sealed|shrink wrapped|bnib|nib|nwt|new in box|new in seal|brand new in box|unopened|never opened|never used|100% full|mint in box)\b/i;

/**
 * Returns true if the product name or category indicates a fragrance or liquid cosmetic.
 */
export function isFragranceOrLiquid(title: string = "", category: string = ""): boolean {
  if (!title && !category) return false;
  return FRAGRANCE_KEYWORDS.test(title) || FRAGRANCE_CATEGORIES.test(category) || FRAGRANCE_CATEGORIES.test(title);
}

/**
 * Auto-detects bottle condition attributes from title, condition text, or defect notes.
 */
export function detectFragranceAttributes(
  title: string = "",
  conditionText: string = "",
  defectNotes: string[] = []
): FragranceLiquidState {
  const isFrag = isFragranceOrLiquid(title, "");
  const combined = `${title} ${conditionText} ${defectNotes.join(" ")}`.toLowerCase();

  // Detect explicit fill level mentions (e.g. "50%", "half full", "approx 70ml of 100ml", "partial")
  let fill = 100;
  let isPartial = false;

  if (combined.includes("half") || combined.includes("50%")) {
    fill = 50;
    isPartial = true;
  } else if (combined.includes("75%") || combined.includes("approx 75")) {
    fill = 75;
    isPartial = true;
  } else if (combined.includes("30%") || combined.includes("low") || combined.includes("quarter")) {
    fill = 30;
    isPartial = true;
  } else if (combined.includes("80%")) {
    fill = 80;
    isPartial = true;
  } else if (combined.includes("90%")) {
    fill = 90;
  } else if (combined.includes("partial") || combined.includes("used") || combined.includes("open bottle")) {
    fill = 70;
    isPartial = true;
  }

  // Detect missing cap
  const hasCap = !/\b(no cap|missing cap|without cap|capless|uncapped)\b/i.test(combined);

  // Detect tester bottle
  const isTester = /\b(tester|demonstration|not for sale|tester unit|white box)\b/i.test(combined);

  // Detect missing box
  const isSealed = /\b(sealed|bnib|nib|in box|with box|boxed)\b/i.test(combined);
  const hasBox = isSealed && !/\b(no box|unboxed|without box|missing box|loose)\b/i.test(combined);

  return {
    isFragrance: isFrag,
    fillLevelPercent: fill,
    hasCap,
    isTester,
    hasBox,
    isPartial: isPartial || fill < 100,
  };
}

/**
 * Computes multiplier for resale price based on bottle fill-level, cap, tester status, and box.
 */
export function calculateFragranceLiquidMultiplier(state: {
  fillLevelPercent: number;
  hasCap: boolean;
  isTester: boolean;
  hasBox: boolean;
}): number {
  // Fill level is primary linear driver (e.g., 50% full = 0.50x baseline full bottle)
  const clampedFill = Math.max(10, Math.min(100, state.fillLevelPercent)) / 100;
  let multiplier = clampedFill;

  // Cap absence penalty: 15% discount (atomizer exposed, evaporation risk, aesthetic flaw)
  if (!state.hasCap) {
    multiplier *= 0.85;
  }

  // Tester bottle penalty: 20% discount on secondary market
  if (state.isTester) {
    multiplier *= 0.80;
  }

  // Missing box penalty: 10% discount compared to full complete presentation
  if (!state.hasBox) {
    multiplier *= 0.90;
  }

  return Math.max(0.05, Math.round(multiplier * 100) / 100);
}

/**
 * Strips or adjusts sealed retail comps for pre-owned / used / partial items.
 * If target item condition is Used / Pre-Owned:
 *  - Strips comps containing "Brand New", "Sealed", "BNIB", "NIB", "NWT".
 *  - If all comps are Brand New (no used comps exist on market), downscales comp prices
 *    to reflect realistic used/partial market value.
 */
export function sanitizeCompsForUsedCondition(
  rawComps: RawSoldComp[],
  itemCondition: string = "Used",
  fragranceMultiplier: number = 1.0
): RawSoldComp[] {
  if (!rawComps || rawComps.length === 0) return [];

  const safeCondition = cleanConditionText(itemCondition, "Used");
  const isTargetUsed = !/\b(brand new|new with tags|nwt|sealed|bnib|nib)\b/i.test(safeCondition);

  if (!isTargetUsed && fragranceMultiplier >= 0.98) {
    return rawComps;
  }

  // Split into pre-owned vs brand new / sealed comps
  const usedComps = rawComps.filter((c) => !SEALED_RETAIL_COMP_REGEX.test(c.title));
  const sealedComps = rawComps.filter((c) => SEALED_RETAIL_COMP_REGEX.test(c.title));

  // If we have at least 2 genuine used comps, completely strip the brand new sealed comps
  if (usedComps.length >= 2) {
    if (fragranceMultiplier < 0.98) {
      // If fragrance fill-level is partial (< 100%), scale used full-bottle comps to the fill level
      return usedComps.map((c) => ({
        ...c,
        price: Math.max(1, Math.round(c.price * fragranceMultiplier * 100) / 100),
      }));
    }
    return usedComps;
  }

  // If there are zero or only 1 used comp, we must normalize the sealed comps
  // Typical pre-owned unboxed perfume sells for ~55-65% of brand new sealed retail
  const baselineUsedHaircut = isTargetUsed ? 0.60 : 1.0;
  const effectiveMultiplier = baselineUsedHaircut * fragranceMultiplier;

  return rawComps.map((c) => {
    const isSealedComp = SEALED_RETAIL_COMP_REGEX.test(c.title);
    if (isSealedComp) {
      const normalizedPrice = Math.max(1, Math.round(c.price * effectiveMultiplier * 100) / 100);
      return {
        ...c,
        price: normalizedPrice,
        title: `${c.title.replace(SEALED_RETAIL_COMP_REGEX, "").trim()} [Normalized Pre-Owned/Partial]`,
        condition: "Pre-Owned",
      };
    }
    if (fragranceMultiplier < 0.98) {
      return {
        ...c,
        price: Math.max(1, Math.round(c.price * fragranceMultiplier * 100) / 100),
      };
    }
    return c;
  });
}
