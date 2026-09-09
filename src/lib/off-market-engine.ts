/**
 * Spadas Lens: Dedicated Off-Market Intelligence Engine
 * Evaluates non-public liquidation pathways: private collector networks,
 * dealer-to-dealer cash buyouts, estate/garage sale acquisition pricing,
 * and bundle/lot multipliers.
 */

export interface TacticalCashAdvisory {
  localizedMarketValue: {
    fairCashPrice: number;
    demandRating: "HOT_LOCAL" | "STEADY" | "NICHE";
    context: string;
  };
  platformStrategies: {
    facebookMarketplace: {
      askingPrice: number;
      targetCashPrice: number;
      tacticalTip: string;
    };
    gumtreeAu: {
      askingPrice: number;
      targetCashPrice: number;
      tacticalTip: string;
    };
    collectorCircles: {
      askingPrice: number;
      targetCashPrice: number;
      tacticalTip: string;
    };
    instantDealer: {
      cashOffer: number;
      turnaroundWindow: string;
      tacticalTip: string;
    };
  };
  fastestLogisticalCashout: {
    fastestRouteName: string;
    estimatedTurnaround: string;
    actionSteps: string[];
    safePaymentProtocol: string;
    stagingLocationTip: string;
  };
}

export interface OffMarketIntelligence {
  collectorDemandLevel: "HIGH_NICHE" | "STEADY" | "COLD";
  cashBuyoutPrice: number; // Rapid same-day cash liquidation to another reseller (~55-65% of retail)
  privateCollectorTargetPrice: number; // Direct-to-enthusiast price with zero platform tariffs
  acquisitionMaxOffer: number; // Maximum cash offer to make at estate sales/garage sales (~25-35% of retail)
  netCashAdvantage: number; // Cash profit difference compared to public eBay after fees & postage
  bundleViability: {
    isRecommended: boolean;
    bundleCategory: string;
    estimatedMultiplier: number;
    tacticalAdvice: string;
  };
  offMarketChannels: Array<{
    network: string;
    suitability: number;
    turnaroundTime: string;
    description: string;
  }>;
  dealerNegotiationScript: string;
  actionablePlaybook: TacticalCashAdvisory;
}

/**
 * Computes deterministic off-market intelligence heuristics with sub-millisecond execution.
 */
export function computeOffMarketIntelligence(
  productName: string,
  brand?: string | null,
  category?: string | null,
  estimatedValue = 40,
  currency = "AUD"
): OffMarketIntelligence {
  const pName = productName.toLowerCase();
  const cat = (category || "").toLowerCase();
  const val = Math.max(10, Math.round(estimatedValue));

  // 1. Dealer-to-Dealer Instant Cash Buyout (Liquidate in 1-2 hours to local specialist)
  // Dealer pays 55% for fast-moving items, 45% for slower items
  const isHighVelocity =
    pName.includes("nike") ||
    pName.includes("carhartt") ||
    pName.includes("pokemon") ||
    pName.includes("camera") ||
    pName.includes("sony") ||
    pName.includes("nintendo") ||
    pName.includes("apple");

  const buyoutRate = isHighVelocity ? 0.60 : 0.50;
  const cashBuyoutPrice = Math.max(5, Math.round(val * buyoutRate));

  // 2. Private Collector Target Price (Direct peer sale with 0% platform fee)
  // Enthusiasts pay 95% of eBay comps because they skip tax and shipping
  const privateCollectorTargetPrice = Math.round(val * 0.95);

  // 3. Sourcing Acquisition Max Offer (What to offer owner at garage/estate sale)
  // Target 3x ROI: Offer 25-30% of fair market value
  const acquisitionMaxOffer = Math.max(2, Math.round(val * 0.28));

  // 4. Net Cash Advantage (Compared to eBay 13.4% + $0.33 fee + $9.50 shipping)
  const estimatedPublicFeeAndShipping = val * 0.134 + 0.33 + 9.5;
  const publicNet = Math.max(0, val - estimatedPublicFeeAndShipping);
  const netCashAdvantage = Math.max(0, Math.round((privateCollectorTargetPrice - publicNet) * 100) / 100);

  // 5. Bundle / Thematic Lot Viability
  let isBundleRec = false;
  let bundleCat = "Single Item Liquidation";
  let bundleMult = 1.0;
  let bundleAdvice = "Best sold as a standalone item for highest single-unit realization.";

  if (pName.includes("camera") || pName.includes("lens") || cat.includes("photography")) {
    isBundleRec = true;
    bundleCat = "Camera & Lens Starter Kit";
    bundleMult = 1.25;
    bundleAdvice = "Pair with a basic strap, bag, or kit lens to market as a complete shooter rig for 25% premium.";
  } else if (pName.includes("pokemon") || pName.includes("card") || cat.includes("collectible")) {
    isBundleRec = true;
    bundleCat = "Collector Binder / Theme Lot";
    bundleMult = 1.20;
    bundleAdvice = "Lot with 3-5 similar era holos or cards to clear lower-tier singles in one cash transaction.";
  } else if (pName.includes("tee") || pName.includes("shirt") || cat.includes("streetwear")) {
    isBundleRec = true;
    bundleCat = "Wardrobe / Brand Bundle";
    bundleMult = 1.15;
    bundleAdvice = "Offer a 2-for-1 bundle deal to buyers looking for wardrobe staples on private forums.";
  } else if (pName.includes("speaker") || pName.includes("audio") || pName.includes("amp")) {
    isBundleRec = true;
    bundleCat = "Stereo Hi-Fi Stack";
    bundleMult = 1.30;
    bundleAdvice = "Bundle with speaker wire and receiver to sell as a plug-and-play audio system.";
  }

  // 6. Private Off-Market Channels
  const channels = [
    {
      network: "Collector Discords & Specialist Forums",
      suitability: isHighVelocity ? 95 : 75,
      turnaroundTime: "Same day - 48h",
      description: "Direct sales to passionate collectors with zero transaction fees and instant payment verification.",
    },
    {
      network: "Dealer-to-Dealer Wholesale Buyout",
      suitability: 85,
      turnaroundTime: "Instant (1-3 hours)",
      description: `Walk into a local specialist dealer and liquidate for $${cashBuyoutPrice} ${currency} immediate cash.`,
    },
    {
      network: "Garage & Swap Meet Cash Table",
      suitability: 80,
      turnaroundTime: "Weekend Morning",
      description: "Bundle with secondary haul inventory for cash-and-carry clearance without listings.",
    },
  ];

  // 7. Dealer Negotiation Script
  const dealerScript = brand
    ? `I've got an authentic ${brand} ${productName}. Market clears at $${val}, take it off my hands for $${cashBuyoutPrice} cash today.`
    : `Authentic ${productName} in tested condition. Comps are $${val}, take it now for $${cashBuyoutPrice} cash.`;

  // 8. Actionable Cash Advisory Playbook
  const targetCash = Math.round(val * 0.9);
  const fbAsking = Math.round(targetCash * 1.15);
  const gumtreeAsking = Math.round(targetCash * 1.10);

  const actionablePlaybook: TacticalCashAdvisory = {
    localizedMarketValue: {
      fairCashPrice: targetCash,
      demandRating: isHighVelocity ? "HOT_LOCAL" : val >= 50 ? "STEADY" : "NICHE",
      context: isHighVelocity
        ? "High localized velocity. Buyers frequently seek immediate cash-and-carry deals without waiting for postage."
        : "Steady secondary market turnover. Price competitively for rapid 24-48h cash liquidation.",
    },
    platformStrategies: {
      facebookMarketplace: {
        askingPrice: fbAsking,
        targetCashPrice: targetCash,
        tacticalTip: "Pad listing price by 15% to absorb lowballers. State 'Cash on pickup only in local suburb'.",
      },
      gumtreeAu: {
        askingPrice: gumtreeAsking,
        targetCashPrice: targetCash,
        tacticalTip: "Target DIYers, tradies and local collectors. Include phone number or quick SMS contact for faster settlement.",
      },
      collectorCircles: {
        askingPrice: privateCollectorTargetPrice,
        targetCashPrice: privateCollectorTargetPrice,
        tacticalTip: "Post high-resolution close-ups of hallmarks/tags to enthusiast groups with zero platform commissions.",
      },
      instantDealer: {
        cashOffer: cashBuyoutPrice,
        turnaroundWindow: "1 - 3 Hours",
        tacticalTip: "Walk directly into a local specialty or pawn dealer to instantly trade inventory for cash in hand.",
      },
    },
    fastestLogisticalCashout: {
      fastestRouteName: isHighVelocity ? "Same-Day Facebook Marketplace Meetup" : "Direct Specialist Dealer Buyout",
      estimatedTurnaround: isHighVelocity ? "Under 12 Hours" : "Instant (1 - 3 Hours)",
      actionSteps: [
        `Take 3 crisp daylight photos: full front view, serial/brand tag, and back condition.`,
        `Publish to ${isHighVelocity ? "Facebook Marketplace" : "Local Collector Circle"} with asking price $${fbAsking} ${currency}.`,
        `Confirm pickup with first serious buyer within 2 hours. Do not hold without confirmed ETA.`,
      ],
      safePaymentProtocol: "Strictly Cash in hand or instant PayID/Osko with confirmed received balance before handing over item.",
      stagingLocationTip: "Meet during daylight hours at a public spot (e.g. supermarket carpark or police station safe exchange zone).",
    },
  };

  return {
    collectorDemandLevel: isHighVelocity ? "HIGH_NICHE" : val >= 50 ? "STEADY" : "COLD",
    cashBuyoutPrice,
    privateCollectorTargetPrice,
    acquisitionMaxOffer,
    netCashAdvantage,
    bundleViability: {
      isRecommended: isBundleRec,
      bundleCategory: bundleCat,
      estimatedMultiplier: bundleMult,
      tacticalAdvice: bundleAdvice,
    },
    offMarketChannels: channels,
    dealerNegotiationScript: dealerScript,
    actionablePlaybook,
  };
}
