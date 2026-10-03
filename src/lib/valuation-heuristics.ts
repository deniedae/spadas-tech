/**
 * Australian Reseller Market Valuation Intelligence Engine
 * 
 * Accurately estimates secondary market value when direct eBay sold comps are sparse or absent,
 * calibrated specifically for Australian op shops, thrift stores, and online secondary channels.
 */

export interface CategoryValuationEstimate {
  estimatedMedian: number;
  minPrice: number;
  maxPrice: number;
  typicalOpShopCost: number;
  categoryTier: string;
  isHighValueBrand: boolean;
  resaleAdvice: string;
}

// Brand valuation tiers calibrated for the Australian secondary market
const HIGH_TIER_AU_BRANDS = [
  "r.m. williams", "rm williams", "zimmermann", "camilla", "oroton",
  "carla zampatti", "scanlan theodore", "dion lee", "aje", "gorman",
  "dyson", "bose", "le creuset", "arc'teryx", "arcteryx", "stone island",
  "supreme", "louis vuitton", "prada", "gucci", "chanel", "hermes",
  "saint laurent", "celine", "moncler", "blundstone"
];

const MID_TIER_RESALE_BRANDS = [
  "nike", "jordan", "adidas", "carhartt", "stussy", "stüssy", "the north face",
  "patagonia", "ralph lauren", "polo ralph lauren", "tommy hilfiger", "harley davidson",
  "levi's", "levis", "wrangler", "barbour", "sony", "canon", "nikon", "nintendo",
  "apple", "country road", "witchery", "saba", "trenery", "mimco", "coach",
  "michael kors", "kate spade", "diesel", "lululemon", "lorna jane", "lego"
];

const FAST_FASHION_LOW_MARGIN_BRANDS = [
  "anko", "target", "kmart", "shein", "temu", "cotton on", "factorie",
  "valleygirl", "dotti", "boohoo", "pretty little thing", "primark", "george"
];

export function estimateAustralianMarketValue(params: {
  title: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
}): CategoryValuationEstimate {
  const query = `${params.brand || ""} ${params.title || ""} ${params.category || ""}`.toLowerCase();

  // 1. Detect Fast Fashion / Kmart / Anko low margin trap
  const isFastFashion = FAST_FASHION_LOW_MARGIN_BRANDS.some((b) => query.includes(b));
  if (isFastFashion) {
    return {
      estimatedMedian: 14,
      minPrice: 8,
      maxPrice: 20,
      typicalOpShopCost: 4,
      categoryTier: "Fast Fashion / Budget Brand",
      isHighValueBrand: false,
      resaleAdvice: "Low margin after postage ($10.90) and selling fees. High return risk unless bundled in lots.",
    };
  }

  // 2. High-End AU Designer / Luxury / Heritage
  const isHighTier = HIGH_TIER_AU_BRANDS.some((b) => query.includes(b));
  if (isHighTier) {
    let est = 160;
    if (query.includes("boots") || query.includes("jacket") || query.includes("bag") || query.includes("dress")) {
      est = 220;
    }
    return {
      estimatedMedian: est,
      minPrice: Math.round(est * 0.7),
      maxPrice: Math.round(est * 1.4),
      typicalOpShopCost: 25,
      categoryTier: "Premium / Luxury Heritage",
      isHighValueBrand: true,
      resaleAdvice: "High-value asset. Sell on eBay AU or Depop AU with signature on delivery.",
    };
  }

  // 3. Vintage Streetwear & Outerwear
  if (
    query.includes("vintage") ||
    query.includes("carhartt") ||
    query.includes("fleece") ||
    query.includes("windbreaker") ||
    query.includes("band tee") ||
    query.includes("jacket") ||
    query.includes("hoodie") ||
    query.includes("sweatshirt")
  ) {
    const isMidBrand = MID_TIER_RESALE_BRANDS.some((b) => query.includes(b));
    const est = isMidBrand ? 75 : 50;
    return {
      estimatedMedian: est,
      minPrice: Math.round(est * 0.7),
      maxPrice: Math.round(est * 1.35),
      typicalOpShopCost: 10,
      categoryTier: "Vintage & Streetwear Outerwear",
      isHighValueBrand: isMidBrand,
      resaleAdvice: "Solid streetwear liquidity. Depop AU buyers pay a premium for 90s/Y2K aesthetics.",
    };
  }

  // 4. Retro Tech, Audio, Gaming & Cameras
  if (
    query.includes("camera") ||
    query.includes("camcorder") ||
    query.includes("lens") ||
    query.includes("walkman") ||
    query.includes("ipod") ||
    query.includes("game boy") ||
    query.includes("nintendo") ||
    query.includes("playstation") ||
    query.includes("xbox") ||
    query.includes("bose") ||
    query.includes("sony")
  ) {
    const est = query.includes("camera") || query.includes("lens") || query.includes("camcorder") ? 110 : 75;
    return {
      estimatedMedian: est,
      minPrice: Math.round(est * 0.65),
      maxPrice: Math.round(est * 1.45),
      typicalOpShopCost: 15,
      categoryTier: "Retro Tech & Electronics",
      isHighValueBrand: true,
      resaleAdvice: "Test functionality and battery. Working vintage tech commands rapid sales on eBay AU.",
    };
  }

  // 5. Retro Collectibles, LEGO & Trading Cards
  if (
    query.includes("lego") ||
    query.includes("pokemon") ||
    query.includes("tcg") ||
    query.includes("funko") ||
    query.includes("figurine") ||
    query.includes("hot wheels") ||
    query.includes("trading card")
  ) {
    const est = query.includes("lego") ? 65 : 45;
    return {
      estimatedMedian: est,
      minPrice: Math.round(est * 0.6),
      maxPrice: Math.round(est * 1.5),
      typicalOpShopCost: 8,
      categoryTier: "Collectibles & Memorabilia",
      isHighValueBrand: false,
      resaleAdvice: "Inspect for complete pieces and minifigures. Collector demand is strong across Australia.",
    };
  }

  // 6. Vintage Kitchenware / Pyrex / Mid-Century
  if (
    query.includes("pyrex") ||
    query.includes("corningware") ||
    query.includes("creuset") ||
    query.includes("bessemer") ||
    query.includes("cast iron") ||
    query.includes("ceramic") ||
    query.includes("pottery")
  ) {
    const est = 55;
    return {
      estimatedMedian: est,
      minPrice: 35,
      maxPrice: 85,
      typicalOpShopCost: 8,
      categoryTier: "Vintage Kitchen & Homewares",
      isHighValueBrand: false,
      resaleAdvice: "Heavy item. Recommend Facebook Marketplace or Gumtree for local cash pickup to avoid shipping fees.",
    };
  }

  // 7. Mid-Tier Fashion & Footwear
  const isMidBrand = MID_TIER_RESALE_BRANDS.some((b) => query.includes(b));
  if (isMidBrand || query.includes("shoes") || query.includes("boots") || query.includes("sneakers") || query.includes("dress")) {
    const est = isMidBrand ? 55 : 38;
    return {
      estimatedMedian: est,
      minPrice: Math.round(est * 0.7),
      maxPrice: Math.round(est * 1.3),
      typicalOpShopCost: 8,
      categoryTier: "Standard Fashion & Footwear",
      isHighValueBrand: isMidBrand,
      resaleAdvice: "Check sole wear and fabric integrity. Sell on eBay AU or Depop AU.",
    };
  }

  // 8. Media / Books / CDs / Records
  if (query.includes("book") || query.includes("vinyl") || query.includes("record") || query.includes("dvd") || query.includes("cd")) {
    const est = query.includes("vinyl") || query.includes("record") ? 32 : 18;
    return {
      estimatedMedian: est,
      minPrice: 12,
      maxPrice: Math.round(est * 1.4),
      typicalOpShopCost: 3,
      categoryTier: "Media & Literature",
      isHighValueBrand: false,
      resaleAdvice: "Check for first editions or rare pressings. Low postage footprint fits AusPost flat satchels.",
    };
  }

  // 9. Default General Resale Baseline (Realistic op shop item)
  return {
    estimatedMedian: 35,
    minPrice: 20,
    maxPrice: 50,
    typicalOpShopCost: 6,
    categoryTier: "General Secondary Asset",
    isHighValueBrand: false,
    resaleAdvice: "Benchmark based on Australian op shop historical categories. Confirm exact model on eBay AU if possible.",
  };
}
