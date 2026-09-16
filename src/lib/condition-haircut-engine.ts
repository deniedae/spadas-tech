/**
 * Spadas Condition Degradation & Restoration Arbitrage Engine
 * Mathematically stratifies comps by physical condition tier, applies flaw haircuts,
 * and calculates high-margin Restoration ROI (e.g. replacing a missing power brick or cable).
 */

export type PhysicalConditionTier =
  | "brand_new"
  | "like_new"
  | "used_excellent"
  | "used_good"
  | "heavily_worn"
  | "for_parts";

export interface ConditionMultiplier {
  tier: PhysicalConditionTier;
  label: string;
  factor: number; // relative to baseline median (1.0 = used_excellent / good)
  description: string;
}

export const CONDITION_MULTIPLIERS: Record<PhysicalConditionTier, ConditionMultiplier> = {
  brand_new: {
    tier: "brand_new",
    label: "Brand New / Sealed",
    factor: 1.55,
    description: "Factory sealed or new in box. Commands collector / retail replacement premium.",
  },
  like_new: {
    tier: "like_new",
    label: "Like New / Mint",
    factor: 1.22,
    description: "Flawless cosmetics with complete original accessories, unblemished surfaces.",
  },
  used_excellent: {
    tier: "used_excellent",
    label: "Used - Excellent",
    factor: 1.0,
    description: "Standard clean benchmark. Minimal wear, fully functional with accessories.",
  },
  used_good: {
    tier: "used_good",
    label: "Used - Good",
    factor: 0.82,
    description: "Minor cosmetic scratches, scuffs or light wear. 100% operational.",
  },
  heavily_worn: {
    tier: "heavily_worn",
    label: "Heavily Worn / Flawed",
    factor: 0.52,
    description: "Significant scratches, heel drag, faded prints, or minor cosmetic cracks.",
  },
  for_parts: {
    tier: "for_parts",
    label: "For Parts / Untested",
    factor: 0.25,
    description: "Untested, missing essential power/display components, or mechanical failure.",
  },
};

export interface RestorationArbitrageOpportunity {
  hasOpportunity: boolean;
  accessoryName?: string;
  estReplacementCostAud?: number;
  untreatedValueAud?: number;
  restoredValueAud?: number;
  netValueAddAud?: number;
  restorationRoiPercent?: number;
  actionableStep?: string;
}

export interface ConditionEvaluationResult {
  activeTier: PhysicalConditionTier;
  tierLabel: string;
  tierFactor: number;
  stratifiedPrice: number;
  flawDeductions: {
    flawName: string;
    deductionPercent: number;
    dollarDeductionAud: number;
  }[];
  totalDeductionAud: number;
  adjustedResalePrice: number;
  restorationOpportunity?: RestorationArbitrageOpportunity;
}

/**
 * Detects missing accessories or common fixable flaws in product titles / notes
 * and computes high-margin refurbishment arbitrage.
 */
export function evaluateRestorationArbitrage(
  productName: string,
  category: string,
  baselineValue: number,
  flawNotes?: string
): RestorationArbitrageOpportunity {
  const text = `${productName} ${category} ${flawNotes || ""}`.toLowerCase();

  // 1. Missing AC Power Adapter / Power Brick (Consoles, Keyboards, Audio Gear)
  if (
    text.includes("no power") ||
    text.includes("missing adapter") ||
    text.includes("no cord") ||
    text.includes("untested") ||
    text.includes("no cable")
  ) {
    const untreated = Math.round(baselineValue * 0.35 * 100) / 100;
    const restored = Math.round(baselineValue * 0.95 * 100) / 100;
    const partCost = 8.50; // Generic 12V / 5V replacement power supply
    const netGain = Math.round((restored - untreated - partCost) * 100) / 100;
    const roi = Math.round((netGain / partCost) * 100);

    if (netGain > 15) {
      return {
        hasOpportunity: true,
        accessoryName: "Generic DC Power Supply / Cable",
        estReplacementCostAud: partCost,
        untreatedValueAud: untreated,
        restoredValueAud: restored,
        netValueAddAud: netGain,
        restorationRoiPercent: roi,
        actionableStep: `Purchase $8.50 replacement power adapter: elevates listing from $${untreated} (untested) to $${restored} (tested working). Net value add: +$${netGain} AUD.`,
      };
    }
  }

  // 2. Missing Remote Control (AV Receivers, Blu-ray Players, Soundbars)
  if (
    (text.includes("receiver") || text.includes("soundbar") || text.includes("blu-ray") || text.includes("dvd")) &&
    (text.includes("no remote") || text.includes("remote missing"))
  ) {
    const untreated = Math.round(baselineValue * 0.55 * 100) / 100;
    const restored = Math.round(baselineValue * 0.92 * 100) / 100;
    const partCost = 9.0;
    const netGain = Math.round((restored - untreated - partCost) * 100) / 100;
    const roi = Math.round((netGain / partCost) * 100);

    if (netGain > 12) {
      return {
        hasOpportunity: true,
        accessoryName: "Replacement Remote Control",
        estReplacementCostAud: partCost,
        untreatedValueAud: untreated,
        restoredValueAud: restored,
        netValueAddAud: netGain,
        restorationRoiPercent: roi,
        actionableStep: `Order $9 universal / OEM replacement remote: increases resale price from $${untreated} to $${restored}. Net value add: +$${netGain} AUD.`,
      };
    }
  }

  // 3. Vintage Camera Missing Battery / Charger (Digicams)
  if (
    (text.includes("camera") || text.includes("digicam") || text.includes("powershot") || text.includes("cyber-shot")) &&
    (text.includes("untested") || text.includes("no battery") || text.includes("no charger"))
  ) {
    const untreated = Math.round(baselineValue * 0.38 * 100) / 100;
    const restored = Math.round(baselineValue * 1.0 * 100) / 100;
    const partCost = 11.50; // USB digicam battery & charger bundle
    const netGain = Math.round((restored - untreated - partCost) * 100) / 100;
    const roi = Math.round((netGain / partCost) * 100);

    if (netGain > 20) {
      return {
        hasOpportunity: true,
        accessoryName: "USB Battery & Charger Kit",
        estReplacementCostAud: partCost,
        untreatedValueAud: untreated,
        restoredValueAud: restored,
        netValueAddAud: netGain,
        restorationRoiPercent: roi,
        actionableStep: `Add $11.50 USB battery kit: unlocks verified working status, raising value from $${untreated} to $${restored}. Net value add: +$${netGain} AUD.`,
      };
    }
  }

  return { hasOpportunity: false };
}

/**
 * Calculates condition-stratified pricing and applies flaw haircuts.
 */
export function calculateConditionValuation(options: {
  baselineMedianPrice: number;
  conditionTier?: PhysicalConditionTier;
  conditionText?: string;
  flawNotes?: string;
  productName?: string;
  category?: string;
}): ConditionEvaluationResult {
  const {
    baselineMedianPrice,
    conditionTier,
    conditionText = "",
    flawNotes = "",
    productName = "",
    category = "",
  } = options;

  // 1. Resolve active condition tier
  let resolvedTier: PhysicalConditionTier = conditionTier || "used_excellent";
  if (!conditionTier && conditionText) {
    const c = conditionText.toLowerCase();
    if (c.includes("new") || c.includes("sealed") || c.includes("nwt")) resolvedTier = "brand_new";
    else if (c.includes("mint") || c.includes("like new")) resolvedTier = "like_new";
    else if (c.includes("parts") || c.includes("broken") || c.includes("repair") || c.includes("untested")) resolvedTier = "for_parts";
    else if (c.includes("fair") || c.includes("heavy") || c.includes("flaw")) resolvedTier = "heavily_worn";
    else if (c.includes("good")) resolvedTier = "used_good";
    else resolvedTier = "used_excellent";
  }

  const multiplierConfig = CONDITION_MULTIPLIERS[resolvedTier] || CONDITION_MULTIPLIERS.used_excellent;
  const stratifiedPrice = Math.round(baselineMedianPrice * multiplierConfig.factor * 100) / 100;

  // 2. Compute specific flaw haircuts
  const combinedText = `${flawNotes} ${conditionText}`.toLowerCase();
  const flawDeductions: ConditionEvaluationResult["flawDeductions"] = [];

  if (combinedText.includes("scratch") || combinedText.includes("scuff")) {
    const pct = 0.08;
    flawDeductions.push({
      flawName: "Surface Scratches / Scuffs",
      deductionPercent: pct * 100,
      dollarDeductionAud: Math.round(stratifiedPrice * pct * 100) / 100,
    });
  }

  if (combinedText.includes("heel drag") || combinedText.includes("sole wear")) {
    const pct = 0.14;
    flawDeductions.push({
      flawName: "Sole Heel Drag Wear",
      deductionPercent: pct * 100,
      dollarDeductionAud: Math.round(stratifiedPrice * pct * 100) / 100,
    });
  }

  if (combinedText.includes("stain") || combinedText.includes("discoloration") || combinedText.includes("yellowing")) {
    const pct = 0.12;
    flawDeductions.push({
      flawName: "Fabric Discoloration / Light Stain",
      deductionPercent: pct * 100,
      dollarDeductionAud: Math.round(stratifiedPrice * pct * 100) / 100,
    });
  }

  const totalDeductionAud = flawDeductions.reduce((sum, d) => sum + d.dollarDeductionAud, 0);
  const adjustedResalePrice = Math.max(1, Math.round((stratifiedPrice - totalDeductionAud) * 100) / 100);

  // 3. Evaluate restoration arbitrage
  const restorationOpportunity = evaluateRestorationArbitrage(productName, category, baselineMedianPrice, flawNotes);

  return {
    activeTier: resolvedTier,
    tierLabel: multiplierConfig.label,
    tierFactor: multiplierConfig.factor,
    stratifiedPrice,
    flawDeductions,
    totalDeductionAud,
    adjustedResalePrice,
    restorationOpportunity: restorationOpportunity.hasOpportunity ? restorationOpportunity : undefined,
  };
}
