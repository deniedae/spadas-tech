/**
 * Spadas Marketplace Arbitrage Engine
 *
 * Computes exact net take-home profit, platform commission deductions,
 * and return-on-investment (ROI) across eBay, Grailed, Depop, and Poshmark.
 * Features an automatic Counterfeit Clamp that drives profit to -100% capital loss
 * when fatal structural manufacturing hallmarks fail.
 */

export interface ArbitrageInputs {
  thriftCostAud: number;
  fairResaleAud: number;
  excellentResaleAud?: number;
  shippingEstAud?: number;
  isCounterfeit?: boolean;
}

export interface PlatformArbitrage {
  platformId: "ebay" | "poshmark" | "grailed" | "depop";
  platformName: string;
  grossSaleAud: number;
  platformFeesAud: number;
  shippingAud: number;
  netProfitAud: number;
  roiPercentage: number;
  feeBreakdown: string;
}

export interface ArbitrageCalculationResult {
  thriftCostAud: number;
  fairResaleAud: number;
  isCounterfeit: boolean;
  platforms: Record<string, PlatformArbitrage>;
  bestPlatform: PlatformArbitrage;
  warning?: string;
}

/**
 * Calculates net arbitrage returns across all major secondhand marketplaces
 */
export function calculateMarketplaceArbitrage(inputs: ArbitrageInputs): ArbitrageCalculationResult {
  const thriftCost = Math.max(0, Number(inputs.thriftCostAud) || 0);
  const rawFairResale = Math.max(0, Number(inputs.fairResaleAud) || 0);
  const shippingEst = typeof inputs.shippingEstAud === "number" ? Math.max(0, inputs.shippingEstAud) : 12; // Standard Australia Post tracked satchel
  const isCounterfeit = Boolean(inputs.isCounterfeit);

  // Counterfeit Clamp: Replicas carry 0 fair market resale value
  const effectiveResale = isCounterfeit ? 0 : rawFairResale;

  // 1. eBay AU (13.25% commission + $0.40 AUD fixed order fee)
  const calculateEbay = (): PlatformArbitrage => {
    if (isCounterfeit || effectiveResale === 0) {
      return {
        platformId: "ebay",
        platformName: "eBay AU",
        grossSaleAud: 0,
        platformFeesAud: 0,
        shippingAud: 0,
        netProfitAud: -thriftCost,
        roiPercentage: thriftCost > 0 ? -100 : 0,
        feeBreakdown: "13.25% + $0.40 AUD",
      };
    }
    const fees = effectiveResale * 0.1325 + 0.40;
    const netProfit = Math.round((effectiveResale - thriftCost - fees - shippingEst) * 100) / 100;
    const roi = thriftCost > 0 ? Math.round((netProfit / thriftCost) * 100) : 0;
    return {
      platformId: "ebay",
      platformName: "eBay AU",
      grossSaleAud: effectiveResale,
      platformFeesAud: Math.round(fees * 100) / 100,
      shippingAud: shippingEst,
      netProfitAud: netProfit,
      roiPercentage: roi,
      feeBreakdown: "13.25% + $0.40 AUD",
    };
  };

  // 2. Poshmark AU (20% flat commission for sales >= $20; $3.95 flat for sales < $20)
  const calculatePoshmark = (): PlatformArbitrage => {
    if (isCounterfeit || effectiveResale === 0) {
      return {
        platformId: "poshmark",
        platformName: "Poshmark AU",
        grossSaleAud: 0,
        platformFeesAud: 0,
        shippingAud: 0,
        netProfitAud: -thriftCost,
        roiPercentage: thriftCost > 0 ? -100 : 0,
        feeBreakdown: "20% flat commission",
      };
    }
    const fees = effectiveResale >= 20 ? effectiveResale * 0.20 : 3.95;
    // On Poshmark, buyers typically cover flat prepaid shipping label, but we account for $0 seller postage
    const netProfit = Math.round((effectiveResale - thriftCost - fees) * 100) / 100;
    const roi = thriftCost > 0 ? Math.round((netProfit / thriftCost) * 100) : 0;
    return {
      platformId: "poshmark",
      platformName: "Poshmark AU",
      grossSaleAud: effectiveResale,
      platformFeesAud: Math.round(fees * 100) / 100,
      shippingAud: 0,
      netProfitAud: netProfit,
      roiPercentage: roi,
      feeBreakdown: "20% flat commission (buyer pays shipping)",
    };
  };

  // 3. Grailed (9.0% marketplace commission + 3.49% payment processing + $0.49 fixed)
  const calculateGrailed = (): PlatformArbitrage => {
    if (isCounterfeit || effectiveResale === 0) {
      return {
        platformId: "grailed",
        platformName: "Grailed",
        grossSaleAud: 0,
        platformFeesAud: 0,
        shippingAud: 0,
        netProfitAud: -thriftCost,
        roiPercentage: thriftCost > 0 ? -100 : 0,
        feeBreakdown: "9% + 3.49% + $0.49 AUD",
      };
    }
    const fees = effectiveResale * (0.09 + 0.0349) + 0.49;
    const netProfit = Math.round((effectiveResale - thriftCost - fees - shippingEst) * 100) / 100;
    const roi = thriftCost > 0 ? Math.round((netProfit / thriftCost) * 100) : 0;
    return {
      platformId: "grailed",
      platformName: "Grailed",
      grossSaleAud: effectiveResale,
      platformFeesAud: Math.round(fees * 100) / 100,
      shippingAud: shippingEst,
      netProfitAud: netProfit,
      roiPercentage: roi,
      feeBreakdown: "9% + 3.49% payment processing + $0.49 AUD",
    };
  };

  // 4. Depop (10% marketplace fee + 3.3% transaction fee + $0.30 fixed)
  const calculateDepop = (): PlatformArbitrage => {
    if (isCounterfeit || effectiveResale === 0) {
      return {
        platformId: "depop",
        platformName: "Depop",
        grossSaleAud: 0,
        platformFeesAud: 0,
        shippingAud: 0,
        netProfitAud: -thriftCost,
        roiPercentage: thriftCost > 0 ? -100 : 0,
        feeBreakdown: "10% fee + 3.3% + $0.30 AUD",
      };
    }
    const fees = effectiveResale * 0.10 + (effectiveResale * 0.033 + 0.30);
    const netProfit = Math.round((effectiveResale - thriftCost - fees - shippingEst) * 100) / 100;
    const roi = thriftCost > 0 ? Math.round((netProfit / thriftCost) * 100) : 0;
    return {
      platformId: "depop",
      platformName: "Depop",
      grossSaleAud: effectiveResale,
      platformFeesAud: Math.round(fees * 100) / 100,
      shippingAud: shippingEst,
      netProfitAud: netProfit,
      roiPercentage: roi,
      feeBreakdown: "10% + 3.3% transaction fee + $0.30 AUD",
    };
  };

  const platforms: Record<string, PlatformArbitrage> = {
    ebay: calculateEbay(),
    poshmark: calculatePoshmark(),
    grailed: calculateGrailed(),
    depop: calculateDepop(),
  };

  // Determine highest-profit platform
  const sorted = Object.values(platforms).sort((a, b) => b.netProfitAud - a.netProfitAud);
  const bestPlatform = sorted[0];

  const warning = isCounterfeit
    ? "Counterfeit Zero-Value Clamp Active: Critical factory hallmarks failed authentic specifications. Purchasing this item results in -100% capital loss."
    : undefined;

  return {
    thriftCostAud: thriftCost,
    fairResaleAud: effectiveResale,
    isCounterfeit,
    platforms,
    bestPlatform,
    warning,
  };
}
