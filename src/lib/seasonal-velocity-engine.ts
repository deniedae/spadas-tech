/**
 * Spadas Seasonal Velocity & Capital Holding Cost Engine
 * Analyzes calendar wave cycles, seasonal premiums, and computes
 * the Capital Velocity IRR formula (Quick-Flip vs Patient Hold).
 */

export type SeasonalityTier = "PEAK_WAVE" | "RISING_DEMAND" | "OFF_SEASON_VALLEY" | "EVERGREEN";

export interface SeasonalityProfile {
  tier: SeasonalityTier;
  label: string;
  seasonName: string;
  demandIndexMultiplier: number; // e.g. 1.35x during peak wave
  holdingRecommendation: "FAST_FLIP_NOW" | "HOLD_FOR_SEASON_PEAK" | "EVERGREEN_STANDARD";
  recommendationReason: string;
  annualizedIrrQuickFlip: number; // e.g. 1450 (%)
  annualizedIrrHolding: number; // e.g. 320 (%)
  holdingCostAud: number; // storage & capital drag
  optimalListingHorizonDays: number;
}

/**
 * Evaluates seasonal demand wave based on current calendar month (0 = Jan, 11 = Dec).
 */
export function calculateSeasonalityProfile(options: {
  productName: string;
  category: string;
  estimatedResalePrice: number;
  thriftCost: number;
  currentDate?: Date;
}): SeasonalityProfile {
  const {
    productName = "",
    category = "",
    estimatedResalePrice,
    thriftCost,
    currentDate = new Date(),
  } = options;

  const text = `${productName} ${category}`.toLowerCase();
  const month = currentDate.getMonth(); // 0 = Jan, 8 = Sep, 11 = Dec

  let tier: SeasonalityTier = "EVERGREEN";
  let label = "🌲 Evergreen (Consistent Year-Round)";
  let seasonName = "Year-Round";
  let demandMultiplier = 1.0;
  let optimalHorizon = 14;

  // 1. Winter Outerwear, Heavy Puffer, Ski Gear, Snow Boots
  const isWinterWear =
    text.includes("puffer") ||
    text.includes("down jacket") ||
    text.includes("ski") ||
    text.includes("snowboard") ||
    text.includes("parka") ||
    text.includes("heavy coat") ||
    text.includes("fleece") ||
    text.includes("carhartt j97");

  // 2. Summer Swimwear, Sandals, Shorts, Camping, Coolers
  const isSummerWear =
    text.includes("swim") ||
    text.includes("bikini") ||
    text.includes("shorts") ||
    text.includes("sandals") ||
    text.includes("birkenstock") ||
    text.includes("cooler") ||
    text.includes("beach");

  // 3. Toys, Collectibles, Video Games, Gaming Consoles, Lego
  const isHolidayGiftable =
    text.includes("lego") ||
    text.includes("nintendo") ||
    text.includes("playstation") ||
    text.includes("toy") ||
    text.includes("pokemon") ||
    text.includes("collectible") ||
    text.includes("action figure");

  // 4. Back-to-School Calculators & Academic Tech
  const isAcademicTech =
    text.includes("ti-84") ||
    text.includes("calculator") ||
    text.includes("backpack") ||
    text.includes("textbook");

  // Wave Logic (Southern & Northern Hemisphere balanced, factoring global eBay reach)
  // September (Month 8):
  // - US/Europe entering Fall/Winter prep
  // - Global Q4 Holiday Stocking period starts
  // - Australia entering Spring
  if (isHolidayGiftable) {
    if (month >= 8 && month <= 11) {
      // Sep - Dec: Q4 Holiday surge
      tier = "PEAK_WAVE";
      label = "🎁 Q4 Holiday Liquidity Surge";
      seasonName = "Holiday Shopping Peak";
      demandMultiplier = 1.35;
      optimalHorizon = 7;
    } else {
      tier = "RISING_DEMAND";
      label = "📈 Building Toward Q4";
      seasonName = "Off-Peak Staging";
      demandMultiplier = 1.05;
      optimalHorizon = 21;
    }
  } else if (isWinterWear) {
    if (month >= 8 && month <= 11) {
      tier = "PEAK_WAVE";
      label = "❄️ Global Winter Demand Surge";
      seasonName = "Autumn / Winter Window";
      demandMultiplier = 1.30;
      optimalHorizon = 6;
    } else if (month >= 4 && month <= 7) {
      tier = "PEAK_WAVE";
      label = "❄️ Southern Hemisphere Winter";
      seasonName = "Winter Cold Front";
      demandMultiplier = 1.25;
      optimalHorizon = 8;
    } else {
      tier = "OFF_SEASON_VALLEY";
      label = "☀️ Off-Season Winter Hold";
      seasonName = "Summer Slump";
      demandMultiplier = 0.85;
      optimalHorizon = 45;
    }
  } else if (isSummerWear) {
    if (month >= 8 && month <= 11) {
      tier = "RISING_DEMAND";
      label = "🌊 Spring / Summer Warmup";
      seasonName = "Spring Rebound";
      demandMultiplier = 1.15;
      optimalHorizon = 10;
    } else if (month >= 0 && month <= 2) {
      tier = "PEAK_WAVE";
      label = "☀️ Peak Summer Liquidity";
      seasonName = "High Summer";
      demandMultiplier = 1.30;
      optimalHorizon = 5;
    } else {
      tier = "OFF_SEASON_VALLEY";
      label = "❄️ Off-Season Summer Hold";
      seasonName = "Winter Valley";
      demandMultiplier = 0.82;
      optimalHorizon = 60;
    }
  } else if (isAcademicTech) {
    if (month === 0 || month === 1 || month === 7 || month === 8) {
      tier = "PEAK_WAVE";
      label = "🎓 Back-to-School Prime Peak";
      seasonName = "Semester Intake Surge";
      demandMultiplier = 1.40;
      optimalHorizon = 4;
    }
  }

  // ── Capital Velocity & IRR Analysis ──
  const netProfit = Math.max(1, estimatedResalePrice - thriftCost - estimatedResalePrice * 0.134 - 7.5);
  const baseRoi = thriftCost > 0 ? (netProfit / thriftCost) * 100 : 100;

  // Annualized IRR if flipped in 3 days vs held 60 days
  const quickFlipDays = 3;
  const holdingDays = 60;

  const annualizedIrrQuickFlip = Math.min(
    9999,
    Math.round((baseRoi / quickFlipDays) * 365)
  );
  const holdingProfit = netProfit * demandMultiplier;
  const holdingRoi = thriftCost > 0 ? (holdingProfit / thriftCost) * 100 : 100;
  const annualizedIrrHolding = Math.round((holdingRoi / holdingDays) * 365);

  // Capital holding drag (10% cost of capital + $0.05/day shelf space)
  const holdingCostAud = Math.round((thriftCost * 0.10 * (holdingDays / 365) + 0.05 * holdingDays) * 100) / 100;

  let holdingRecommendation: SeasonalityProfile["holdingRecommendation"] = "FAST_FLIP_NOW";
  let recommendationReason = `Capital velocity favors instant liquidation. Turning capital every 3 days yields ~${annualizedIrrQuickFlip}% annualized velocity.`;

  if (tier === "OFF_SEASON_VALLEY" && demandMultiplier < 0.85 && holdingProfit - netProfit > 35) {
    holdingRecommendation = "HOLD_FOR_SEASON_PEAK";
    recommendationReason = `Massive off-season discount. Holding until seasonal peak unlocks +$${Math.round(holdingProfit - netProfit)} extra net profit.`;
  } else if (tier === "EVERGREEN") {
    holdingRecommendation = "EVERGREEN_STANDARD";
    recommendationReason = "Stable consistent demand year-round. Price at standard market median for immediate liquidity.";
  }

  return {
    tier,
    label,
    seasonName,
    demandIndexMultiplier: demandMultiplier,
    holdingRecommendation,
    recommendationReason,
    annualizedIrrQuickFlip,
    annualizedIrrHolding,
    holdingCostAud,
    optimalListingHorizonDays: optimalHorizon,
  };
}
