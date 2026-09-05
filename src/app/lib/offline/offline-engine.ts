/**
 * Autonomous On-Device Offline & Zero-Credit Resale Heuristic Engine
 * Enables 100% functional thrift sourcing without cloud AI credits or cellular internet.
 */

import type { DetectedHit, ActiveScanItem } from "@/types/lens";

export interface OfflineCategoryModel {
  category: string;
  subcategories: string[];
  medianPriceAUD: number;
  minPriceAUD: number;
  maxPriceAUD: number;
  typicalTagCostAUD: number;
  demandRating: "FAST_FLIP" | "MODERATE" | "SLOW_BURNER";
  highValueKeywords: string[];
}

export const OFFLINE_RESALE_KNOWLEDGE_BASE: Record<string, OfflineCategoryModel> = {
  vintage_streetwear: {
    category: "Vintage Streetwear & Apparel",
    subcategories: ["Vintage 90s Graphic T-Shirt", "Heavyweight Boxy Hoodie", "Nylon Colorblock Windbreaker", "Denim Jacket", "Workwear Duck Canvas Jacket"],
    medianPriceAUD: 55,
    minPriceAUD: 30,
    maxPriceAUD: 120,
    typicalTagCostAUD: 6,
    demandRating: "FAST_FLIP",
    highValueKeywords: ["single stitch", "faded", "spellout", "made in usa", "carhartt", "nike", "stussy", "harley", "champion reverse weave", "boxy fit"],
  },
  sneakers_footwear: {
    category: "Sneakers & Footwear",
    subcategories: ["Retro Basketball Sneakers", "Y2K Chunky Running Shoes", "Vintage Suede Skate Shoes", "Leather Heritage Boots"],
    medianPriceAUD: 95,
    minPriceAUD: 45,
    maxPriceAUD: 220,
    typicalTagCostAUD: 15,
    demandRating: "FAST_FLIP",
    highValueKeywords: ["nike tn", "air max", "jordan", "dunk", "asics gel", "new balance 990", "salomon", "dr martens", "birkenstock"],
  },
  retro_tech_cameras: {
    category: "Retro Tech & Vintage Digicams",
    subcategories: ["Y2K CCD Digital Camera (Digicam)", "Retro Handheld Gaming Console", "Vintage Hi-Fi Walkman / Discman", "Retro Mechanical Keyboard"],
    medianPriceAUD: 85,
    minPriceAUD: 35,
    maxPriceAUD: 180,
    typicalTagCostAUD: 8,
    demandRating: "FAST_FLIP",
    highValueKeywords: ["sony cyber-shot", "canon powershot", "olympus camedia", "nintendo game boy", "nintendo ds", "ipod classic", "casio exilim"],
  },
  luxury_designer_leather: {
    category: "Designer Luxury & Leather Goods",
    subcategories: [
      "Prada Saffiano Leather Triangle Logo Bifold Wallet",
      "Prada Tessuto Nylon Zip Around Continental Wallet",
      "Louis Vuitton Monogram Sarah Long Wallet",
      "Gucci GG Supreme Continental Wallet",
      "Bottega Veneta Intrecciato Leather Card Case",
      "Saint Laurent Monogram Leather Flap Wallet",
      "Chanel Caviar Quilted Classic Flap Wallet"
    ],
    medianPriceAUD: 260,
    minPriceAUD: 160,
    maxPriceAUD: 480,
    typicalTagCostAUD: 25,
    demandRating: "FAST_FLIP",
    highValueKeywords: ["prada", "saffiano", "tessuto", "louis vuitton", "gucci", "chanel", "saint laurent", "ysl", "bottega", "dior", "fendi", "goyard", "hermes", "celine", "balenciaga", "loewe", "burberry"],
  },
  designer_luxury: {
    category: "Designer & Gorpcore Outerwear",
    subcategories: ["Technical GORE-TEX Jacket", "Embroidered Polo Shirt", "Heritage Wool Knit Jumper", "Monogram Canvas Bag"],
    medianPriceAUD: 110,
    minPriceAUD: 50,
    maxPriceAUD: 290,
    typicalTagCostAUD: 12,
    demandRating: "FAST_FLIP",
    highValueKeywords: ["arc'teryx", "patagonia", "ralph lauren", "burberry", "stone island", "diesel", "barbour"],
  },
  collectibles_media: {
    category: "Collectibles, Vinyl & Media",
    subcategories: ["Vintage 70s/80s Vinyl Record", "Pokemon / TCG Booster Card", "Rare Manga / Graphic Novel", "Retro Big Box PC Game"],
    medianPriceAUD: 45,
    minPriceAUD: 18,
    maxPriceAUD: 140,
    typicalTagCostAUD: 4,
    demandRating: "MODERATE",
    highValueKeywords: ["first edition", "pink floyd", "led zeppelin", "pokemon", "sealed", "holographic", "promo"],
  },
  general_homewares: {
    category: "Mid-Century & Vintage Homewares",
    subcategories: ["Enamel Cast Iron Cookware Dutch Oven", "Mid-Century Amber Glassware Set", "Retro Atomic Desk Lamp", "Vintage Fire-King Jadeite Dish"],
    medianPriceAUD: 38,
    minPriceAUD: 15,
    maxPriceAUD: 85,
    typicalTagCostAUD: 5,
    demandRating: "MODERATE",
    highValueKeywords: ["le creuset", "pyrex", "fire-king", "dansk", "iittala", "marimekko"],
  },
};

/**
 * Fast on-device heuristic appraiser when offline or out of AI credits.
 */
export function appraiseItemLocally(inputHint?: string): {
  productName: string;
  brand: string;
  category: string;
  condition: string;
  estimatedValue: number;
  tagPrice: number;
  trueNetProfit: number;
  roiPercentage: number;
  copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY";
} {
  const query = (inputHint || "").toLowerCase();
  
  let matchedModel = OFFLINE_RESALE_KNOWLEDGE_BASE.vintage_streetwear;

  for (const [_, model] of Object.entries(OFFLINE_RESALE_KNOWLEDGE_BASE)) {
    if (model.highValueKeywords.some((kw) => query.includes(kw))) {
      matchedModel = model;
      break;
    }
  }

  const sub = matchedModel.subcategories[Math.floor(Math.random() * matchedModel.subcategories.length)];
  const pName = inputHint ? inputHint : sub;
  let estVal = matchedModel.medianPriceAUD;
  let tagCost = matchedModel.typicalTagCostAUD;

  // Ruthless trap check on offline hints
  if (query.includes("dvd") || query.includes("cd") || query.includes("vhs")) {
    estVal = 5;
    tagCost = 1.5;
  } else if (query.includes("amazon basics") || query.includes("onn") || query.includes("insignia")) {
    estVal = 6;
    tagCost = 2.0;
  } else if (query.includes("mug") && !query.includes("fire-king") && !query.includes("starbucks")) {
    estVal = 8;
    tagCost = 2.5;
  }

  // Realistic category parcel shipping estimate
  const text = `${matchedModel.category} ${pName}`.toLowerCase();
  let shipping = 6.50;
  if (text.includes("dvd") || text.includes("cd") || text.includes("book")) shipping = 4.20;
  else if (text.includes("keyboard") || text.includes("hardware") || text.includes("peripherals")) shipping = 9.50;
  else if (text.includes("mug") || text.includes("cup") || text.includes("glass")) shipping = 8.50;
  else if (text.includes("jacket") || text.includes("coat")) shipping = 10.50;
  else if (text.includes("shoe") || text.includes("sneaker")) shipping = 11.00;
  else if (text.includes("t-shirt") || text.includes("tee")) shipping = 5.50;

  const ebayFee = (estVal * 0.134) + 0.33; // Australian eBay 13.4% + $0.33
  const netProfit = Math.max(0, Math.round((estVal - tagCost - ebayFee - shipping) * 100) / 100);
  const roi = tagCost > 0 ? Math.round((netProfit / tagCost) * 100) : 0;

  // Reseller Cop Verdict
  const isTrap = (estVal <= 14 && (text.includes("dvd") || text.includes("cd"))) ||
    text.includes("amazon basics") ||
    (text.includes("mug") && estVal <= 15);

  let copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" = "FAIR_MARGIN";
  if (isTrap || netProfit <= 0) {
    copVerdict = "PASS_RISKY";
  } else if (netProfit < 8 || roi < 40) {
    copVerdict = "PASS_RISKY";
  } else if (roi >= 250 && netProfit >= 25) {
    copVerdict = "MUST_COP";
  } else if (roi >= 100 && netProfit >= 15) {
    copVerdict = "QUICK_FLIP";
  }

  return {
    productName: pName,
    brand: "Authentic Thrift Find",
    category: matchedModel.category,
    condition: "Used - Good",
    estimatedValue: estVal,
    tagPrice: tagCost,
    trueNetProfit: netProfit,
    roiPercentage: roi,
    copVerdict,
  };
}

const OFFLINE_STASH_KEY = "spadas_offline_sourcing_queue";

export function saveOfflineHitLocally(hit: DetectedHit): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getOfflineHitsLocally();
    const updated = [hit, ...existing.filter((h) => h.name !== hit.name)].slice(0, 100);
    localStorage.setItem(OFFLINE_STASH_KEY, JSON.stringify(updated));
  } catch {}
}

export function getOfflineHitsLocally(): DetectedHit[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(OFFLINE_STASH_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearOfflineHitsLocally(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_STASH_KEY);
  } catch {}
}
