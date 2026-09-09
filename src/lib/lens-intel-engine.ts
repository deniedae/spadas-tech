/**
 * Spadas Lens Tactical Intel Engine
 * Computes deep reseller intelligence: market worth distribution, target sell prices,
 * optimal sales channel routing, empirical turnaround velocity, and localized P2P
 * Marketplace Intelligence (Facebook Marketplace, Gumtree AU, local collector groups).
 */

import { calculateSalesVelocity, SalesVelocityProfile } from "./turnover-velocity-engine";
import { DetectedHit } from "@/types/lens";

export type ArbitrageVerdict = "INSTANT_COP" | "FAST_FLIP" | "CAUTION_SPECULATIVE" | "PASS_TRAP";

export interface MarketplaceChannelIntel {
  channel: string;
  suitabilityScore: number;
  estimatedDaysToCash: string;
  strategy: string;
}

export interface MarketplaceIntelligence {
  p2pDemandLevel: "HIGH" | "MODERATE" | "NICHE_SLOW";
  p2pEstimatedCashPrice: number;
  cashNegotiationBuffer: {
    listPrice: number;
    targetCashPrice: number;
    floorPrice: number;
  };
  physicalPickupScore: number; // 0 - 100
  pickupViabilityReason: string;
  primaryLocalChannel: "Facebook Marketplace" | "Gumtree AU" | "Local Collector Meet" | "Specialist Group";
  channels: MarketplaceChannelIntel[];
  buyerDemographic: string;
  tacticalListingHook: string;
  safetyTip: string;
  arbitrageNotes: string[];
}

export interface LensIntelData {
  productName: string;
  brand?: string | null;
  category?: string | null;
  estimatedValue: number;
  estCost: number;
  trueNetProfit: number;
  currency: string;
  recommendedSellPrice: {
    fastFlip: number;
    balanced: number;
    maxProfit: number;
  };
  netProfitMatrix: {
    fastFlip: number;
    balanced: number;
    maxProfit: number;
  };
  fastestChannel: {
    name: "eBay" | "Depop" | "Poshmark" | "Mercari" | "Facebook Marketplace";
    reason: string;
    commissionRate: string;
    targetAudience: string;
  };
  turnaroundVelocity: SalesVelocityProfile;
  tacticalNotes: string[];
  arbitrageVerdict: ArbitrageVerdict;
  marketplaceIntelligence: MarketplaceIntelligence;
  timestamp: number;
}

/**
 * Categorize and route to the highest-velocity sales channel.
 */
export function determineFastestChannel(
  category = "",
  productName = "",
  estimatedValue = 0
): LensIntelData["fastestChannel"] {
  const text = `${category} ${productName}`.toLowerCase();

  // 1. Streetwear / Vintage / Y2K Apparel -> Depop
  if (
    text.includes("vintage") ||
    text.includes("single stitch") ||
    text.includes("y2k") ||
    text.includes("streetwear") ||
    text.includes("hoodie") ||
    text.includes("graphic tee") ||
    text.includes("band tee") ||
    text.includes("carhartt") ||
    text.includes("nike tn")
  ) {
    return {
      name: "Depop",
      reason: "High Gen-Z buyer liquidity and search traffic for vintage streetwear and Y2K silhouettes.",
      commissionRate: "10% Platform Fee",
      targetAudience: "Gen-Z & Vintage Fashion Collectors",
    };
  }

  // 2. Women's Designer / Contemporary Fashion / Luxury Handbags -> Poshmark
  if (
    text.includes("handbag") ||
    text.includes("tote") ||
    text.includes("dress") ||
    text.includes("purse") ||
    text.includes("leather bag") ||
    text.includes("heels") ||
    text.includes("coach") ||
    text.includes("michael kors") ||
    text.includes("lululemon") ||
    text.includes("zimmermann")
  ) {
    return {
      name: "Poshmark",
      reason: "Pre-paid bundled shipping and massive buyer active engagement for women's fashion and leather goods.",
      commissionRate: "20% (Includes Shipping Subsidy)",
      targetAudience: "Fashion Arbitrage & Capsule Wardrobes",
    };
  }

  // 3. Bulky, Heavy, or Fragile Items -> Facebook Marketplace
  if (
    text.includes("speaker") ||
    text.includes("furniture") ||
    text.includes("amplifier") ||
    text.includes("subwoofer") ||
    text.includes("heavy") ||
    text.includes("wheel") ||
    text.includes("bumper") ||
    text.includes("engine") ||
    text.includes("television") ||
    text.includes("monitor")
  ) {
    return {
      name: "Facebook Marketplace",
      reason: "Zero shipping overhead, local cash pickup, and eliminate postal return/damage liabilities on bulky goods.",
      commissionRate: "0% (Local Cash on Pickup)",
      targetAudience: "Local Pickers & DIY Enthusiasts",
    };
  }

  // 4. Collectibles & Trading Cards under $100 -> Mercari / eBay
  if (
    text.includes("pokemon") ||
    text.includes("trading card") ||
    text.includes("tcg") ||
    text.includes("action figure") ||
    text.includes("plush") ||
    text.includes("funko")
  ) {
    return {
      name: "Mercari",
      reason: "Zero-fee seller structure with brisk turnover on compact collectibles and anime/gaming merch.",
      commissionRate: "0% Seller Fee (Buyer pays fees)",
      targetAudience: "Passionate Pop Culture Collectors",
    };
  }

  // 5. Default Universal Secondary Clearinghouse -> eBay
  return {
    name: "eBay",
    reason: "Deepest global buyer reach, automated International Shipping, and definitive comps clearinghouse.",
    commissionRate: "13.25% + $0.30 Final Value Fee",
    targetAudience: "Global Intent-Driven Buyers",
  };
}

/**
 * Compute local heuristic baseline for Marketplace Intelligence with 0ms latency.
 */
export function computeLocalMarketplaceIntelligence(
  productName: string,
  brand?: string | null,
  category?: string | null,
  estimatedValue = 30,
  currency = "AUD"
): MarketplaceIntelligence {
  const pName = productName.toLowerCase();
  const cat = (category || "").toLowerCase();
  const val = Math.max(10, Math.round(estimatedValue));

  let pickupScore = 55;
  let pickupReason = "Standard parcelable dimensions; suitable for both courier shipping and local cash pickup.";
  let primaryLocalChannel: MarketplaceIntelligence["primaryLocalChannel"] = "Facebook Marketplace";

  if (
    pName.includes("speaker") ||
    pName.includes("subwoofer") ||
    pName.includes("amplifier") ||
    pName.includes("furniture") ||
    pName.includes("chair") ||
    pName.includes("table") ||
    pName.includes("mirror") ||
    pName.includes("lamp") ||
    pName.includes("monitor") ||
    pName.includes("tv") ||
    pName.includes("bike") ||
    cat.includes("furniture") ||
    cat.includes("heavy")
  ) {
    pickupScore = 95;
    pickupReason = "Bulky / heavy profile. Local pickup eliminates $25+ parcel postage and glass/driver carrier damage risk.";
    primaryLocalChannel = "Facebook Marketplace";
  } else if (
    pName.includes("tool") ||
    pName.includes("drill") ||
    pName.includes("saw") ||
    pName.includes("mower") ||
    cat.includes("hardware")
  ) {
    pickupScore = 90;
    pickupReason = "High contractor and tradesperson demand. Fast cash turnaround on Gumtree AU and Facebook Marketplace.";
    primaryLocalChannel = "Gumtree AU";
  } else if (
    pName.includes("vintage") ||
    pName.includes("carhartt") ||
    pName.includes("nike") ||
    pName.includes("jacket") ||
    pName.includes("hoodie") ||
    cat.includes("apparel") ||
    cat.includes("streetwear")
  ) {
    pickupScore = 75;
    pickupReason = "High local streetwear collector demand. Instant cash in hand without postal return exposure.";
    primaryLocalChannel = "Facebook Marketplace";
  } else if (
    pName.includes("pokemon") ||
    pName.includes("tcg") ||
    pName.includes("lego") ||
    pName.includes("retro") ||
    pName.includes("nintendo") ||
    cat.includes("toy") ||
    cat.includes("collectible")
  ) {
    pickupScore = 82;
    pickupReason = "Active local hobbyist market. High conversion in suburb collector swaps and enthusiast groups.";
    primaryLocalChannel = "Specialist Group";
  }

  const targetCash = Math.round(val * 0.9);
  const listPrice = Math.round(targetCash * 1.18);
  const floorPrice = Math.round(targetCash * 0.85);

  return {
    p2pDemandLevel: val >= 50 ? "HIGH" : "MODERATE",
    p2pEstimatedCashPrice: targetCash,
    cashNegotiationBuffer: {
      listPrice,
      targetCashPrice: targetCash,
      floorPrice,
    },
    physicalPickupScore: pickupScore,
    pickupViabilityReason: pickupReason,
    primaryLocalChannel,
    channels: [
      {
        channel: "Facebook Marketplace",
        suitabilityScore: primaryLocalChannel === "Facebook Marketplace" ? 96 : 85,
        estimatedDaysToCash: "1 - 3 days",
        strategy: "Post with natural daylight photos and note 'Cash on pickup, pickup in [Local Suburb]'.",
      },
      {
        channel: "Gumtree AU",
        suitabilityScore: primaryLocalChannel === "Gumtree AU" ? 92 : 72,
        estimatedDaysToCash: "2 - 5 days",
        strategy: "Ideal for tools, hardware, and furniture with older suburban buyers.",
      },
      {
        channel: "Local Specialist & Collector Circles",
        suitabilityScore: primaryLocalChannel === "Specialist Group" ? 95 : 68,
        estimatedDaysToCash: "1 - 4 days",
        strategy: "Share to targeted enthusiast buy/swap/sell groups for zero fees and rapid settlement.",
      },
    ],
    buyerDemographic: "Local bargain hunters, DIYers & collectors seeking same-day pickup without shipping delay.",
    tacticalListingHook: `Clean ${brand ? brand + " " : ""}${productName}. Tested & working. Cash on pickup preferred.`,
    safetyTip: "Meet in daytime at a public spot or front porch. Verify cash notes or wait for confirmed instant Osko/PayID balance.",
    arbitrageNotes: [
      `Local P2P nets 100% cash with 0% platform tariffs or payment processing hold times.`,
      `List at $${listPrice} ${currency} to allow standard $${listPrice - targetCash} negotiation room.`,
      `Hold firm: Do not accept below $${floorPrice} ${currency} cash floor.`,
    ],
  };
}

/**
 * In-memory LRU cache to prevent redundant network fetches.
 */
const marketplaceIntelCache = new Map<string, MarketplaceIntelligence>();

/**
 * Decoupled Asynchronous Fetcher for Deep Marketplace Intelligence.
 * Executes in the background without blocking the camera frame loop or primary valuation pipeline.
 */
export async function fetchMarketplaceIntelligenceAsync(params: {
  image?: string;
  productName: string;
  brand?: string | null;
  category?: string | null;
  estimatedValue?: number;
  currency?: string;
}): Promise<MarketplaceIntelligence | null> {
  const cacheKey = `${params.productName}_${params.brand || ""}_${params.currency || "AUD"}`.toLowerCase();
  const cached = marketplaceIntelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const res = await fetch("/api/marketplace-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: params.image,
        productName: params.productName,
        brand: params.brand,
        category: params.category,
        estimatedValue: params.estimatedValue,
        currency: params.currency || "AUD",
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    const result: MarketplaceIntelligence = {
      p2pDemandLevel: data.p2p_demand_level || "MODERATE",
      p2pEstimatedCashPrice: Number(data.p2p_estimated_cash_price) || Math.round((params.estimatedValue || 30) * 0.9),
      cashNegotiationBuffer: {
        listPrice: Number(data.cash_negotiation_buffer?.list_price) || Math.round((params.estimatedValue || 30) * 1.1),
        targetCashPrice: Number(data.cash_negotiation_buffer?.target_cash_price) || Math.round((params.estimatedValue || 30) * 0.9),
        floorPrice: Number(data.cash_negotiation_buffer?.floor_price) || Math.round((params.estimatedValue || 30) * 0.75),
      },
      physicalPickupScore: Number(data.physical_pickup_score) || 60,
      pickupViabilityReason: data.pickup_viability_reason || "Suitable for local liquidation.",
      primaryLocalChannel: data.primary_local_channel || "Facebook Marketplace",
      channels: (data.channels || []).map((ch: any) => ({
        channel: ch.channel || "Local Channel",
        suitabilityScore: Number(ch.suitability_score) || 80,
        estimatedDaysToCash: ch.estimated_days_to_cash || "2-4 days",
        strategy: ch.strategy || "List locally with clear photos.",
      })),
      buyerDemographic: data.buyer_demographic || "Local peer-to-peer buyers.",
      tacticalListingHook: data.tactical_listing_hook || `Clean ${params.productName}. Local pickup.`,
      safetyTip: data.safety_tip || "Exchange in a safe, visible public location.",
      arbitrageNotes: data.arbitrage_notes || [],
    };

    marketplaceIntelCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[Marketplace Intel Engine] Network fetch fallback applied:", error);
    const fallback = computeLocalMarketplaceIntelligence(
      params.productName,
      params.brand,
      params.category,
      params.estimatedValue,
      params.currency
    );
    marketplaceIntelCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Generate comprehensive tactical intelligence from a scanned hit.
 */
export function generateTacticalIntel(
  hit: Partial<DetectedHit>,
  currency = "AUD"
): LensIntelData {
  const pName = (hit.name || "Identified Item").trim();
  const brand = hit.brand || null;
  const category = hit.category || "General Resale";
  const estVal = Number(hit.estimatedValue) || 30;
  const estCost = Number(hit.tagPrice || hit.estCost) || 5;

  // 1. Calculate Multi-Tier Sell Price Strategy
  // Fast Flip: 85% of market value (rapid liquidity in 2-5 days)
  const fastFlipPrice = Math.max(estCost + 2, Math.round(estVal * 0.85 * 100) / 100);
  // Balanced: 100% median sold comps
  const balancedPrice = Math.round(estVal * 100) / 100;
  // Max Profit: 115% for patient sellers
  const maxProfitPrice = Math.round(estVal * 1.15 * 100) / 100;

  // Approximate net margins after ~13.5% fees + standard overhead
  const calcNet = (price: number) => Math.max(0, Math.round((price - estCost - (price * 0.134 + 0.33)) * 100) / 100);

  const netMatrix = {
    fastFlip: calcNet(fastFlipPrice),
    balanced: calcNet(balancedPrice),
    maxProfit: calcNet(maxProfitPrice),
  };

  // 2. Turnover Velocity Analysis
  const velocity = calculateSalesVelocity({
    productName: pName,
    category,
    brand,
    activeCount: hit.ebayCompsCount ? Math.round(hit.ebayCompsCount * 1.2) : undefined,
    soldsCount: hit.ebayCompsCount,
  });

  // 3. Channel Routing
  const fastestChannel = determineFastestChannel(category, pName, estVal);

  // 4. Tactical Arbitrage Verdict
  let verdict: ArbitrageVerdict = "FAST_FLIP";
  if (velocity.isHoarderRisk || netMatrix.balanced < 5) {
    verdict = "PASS_TRAP";
  } else if (netMatrix.balanced >= 40 && velocity.sellThroughRate >= 80) {
    verdict = "INSTANT_COP";
  } else if (velocity.sellThroughRate >= 80 || netMatrix.balanced >= 15) {
    verdict = "FAST_FLIP";
  } else {
    verdict = "CAUTION_SPECULATIVE";
  }

  // 5. Tactical Action Notes
  const notes: string[] = [];
  if (velocity.warning) {
    notes.push(velocity.warning);
  }
  if (verdict === "INSTANT_COP") {
    notes.push(`👑 Top-Tier Flip: Secure this item immediately at tag price $${estCost.toFixed(2)}.`);
  } else if (verdict === "PASS_TRAP") {
    notes.push("🛑 Low Capital Efficiency: Margins or turnover velocity do not justify capital tie-up.");
  }
  notes.push(`Recommended Channel: List on ${fastestChannel.name} for peak liquidity.`);
  if (fastFlipPrice < balancedPrice) {
    notes.push(`Quick Turnaround: Price at $${fastFlipPrice.toFixed(0)} to liquidate within ${velocity.estDaysToSell}.`);
  }

  // 6. Synchronous Local Baseline for Marketplace Intelligence (0ms UI latency)
  const marketplaceIntelligence = computeLocalMarketplaceIntelligence(
    pName,
    brand,
    category,
    estVal,
    currency
  );

  return {
    productName: pName,
    brand,
    category,
    estimatedValue: estVal,
    estCost,
    trueNetProfit: netMatrix.balanced,
    currency,
    recommendedSellPrice: {
      fastFlip: fastFlipPrice,
      balanced: balancedPrice,
      maxProfit: maxProfitPrice,
    },
    netProfitMatrix: netMatrix,
    fastestChannel,
    turnaroundVelocity: velocity,
    tacticalNotes: notes,
    arbitrageVerdict: verdict,
    marketplaceIntelligence,
    timestamp: Date.now(),
  };
}
