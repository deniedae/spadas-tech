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
    subcategories: ["Enamel Cast Iron Cookware", "Mid-Century Amber Glassware", "Retro Atomic Desk Lamp", "Ceramic Coffee Mug"],
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
  const estVal = matchedModel.medianPriceAUD;
  const tagCost = matchedModel.typicalTagCostAUD;
  const ebayFee = (estVal * 0.134) + 0.33; // Australian eBay 13.4% + $0.33
  const netProfit = Math.max(0, Math.round((estVal - tagCost - ebayFee) * 100) / 100);
  const roi = tagCost > 0 ? Math.round((netProfit / tagCost) * 100) : 0;

  const copVerdict = roi >= 300 && netProfit >= 30 ? "MUST_COP" : roi >= 100 ? "QUICK_FLIP" : "FAIR_MARGIN";

  return {
    productName: inputHint ? inputHint : sub,
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
