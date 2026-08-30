import { fetchEbayAustraliaSoldComps } from "@/app/lib/ebay-australia-comps";

export interface EstimatedPriceResult {
  suggestedPrice: number;
  confidence: "High" | "Medium" | "Low";
  minPrice?: number;
  maxPrice?: number;
  compsCount?: number;
  source?: string;
}

export async function estimatePrice(product: {
  name: string;
  category: string;
  brand?: string;
}): Promise<EstimatedPriceResult> {
  const cleanName = (product.name || "").trim();
  const brand = (product.brand || "").trim();
  const lower = cleanName.toLowerCase();
  const category = product.category || "General";

  // 1. Supermarket / Grocery & Beverage Calibration (Realistic retail supermarket pricing)
  if (category === "Groceries & Beverages" || /\b(milk|drink|juice|soda|choc|chocolate|snack|chips|biscuit|cereal|dairy)\b/i.test(lower)) {
    // Single-serving drink (e.g. 200ml, 250ml, 300ml, 375ml, 500ml, 600ml)
    if (/\b(200\s*ml|250\s*ml|300\s*ml|350\s*ml|375\s*ml|tetra|poppet|small)\b/i.test(lower)) {
      return {
        suggestedPrice: 2.20,
        confidence: "High",
        source: "Supermarket Retail (Single 200-375ml)",
      };
    }

    if (/\b(500\s*ml|600\s*ml|750\s*ml|bottle|can)\b/i.test(lower)) {
      return {
        suggestedPrice: 3.80,
        confidence: "High",
        source: "Supermarket Retail (500-600ml)",
      };
    }

    if (/\b(1\s*l|1\s*litre|2\s*l|2\s*litre)\b/i.test(lower)) {
      return {
        suggestedPrice: 4.50,
        confidence: "High",
        source: "Supermarket Retail (1L-2L Bottle)",
      };
    }

    if (/\b(bar|block|packet|bag|snack|chips)\b/i.test(lower)) {
      return {
        suggestedPrice: 3.00,
        confidence: "High",
        source: "Supermarket Retail (Snack / Confectionery)",
      };
    }

    // Default grocery single unit baseline
    return {
      suggestedPrice: 3.50,
      confidence: "Medium",
      source: "Supermarket Grocery Baseline",
    };
  }

  // 2. Query real live eBay sold comps for Non-Grocery Reseller Categories
  const searchQuery = brand && !cleanName.toLowerCase().includes(brand.toLowerCase())
    ? `${brand} ${cleanName}`
    : cleanName;

  try {
    const comps = await fetchEbayAustraliaSoldComps(searchQuery, "AUD");
    if (comps && comps.median > 0) {
      return {
        suggestedPrice: comps.median,
        confidence: comps.count >= 5 ? "High" : "Medium",
        minPrice: comps.min,
        maxPrice: comps.max,
        compsCount: comps.count,
        source: comps.source === "sold_comps_api" ? "eBay Sold Comps" : "eBay Market Comps",
      };
    }
  } catch (err) {
    console.warn("[Barcode Pricing] Live comps lookup failed, using category baseline:", err);
  }

  // 3. Category Baselines for Luxury, Collectibles, Media, Fashion & Electronics
  const isLuxuryBrand = [
    "Prada", "Gucci", "Louis Vuitton", "Chanel", "Dior", "Hermes", "Bottega Veneta",
    "Saint Laurent", "YSL", "Fendi", "Goyard", "Celine", "Balenciaga", "Burberry", "Loewe"
  ].some((b) => (brand && brand.toLowerCase().includes(b.toLowerCase())) || lower.includes(b.toLowerCase()));

  if (isLuxuryBrand) {
    const isBag = /\b(bag|handbag|tote|backpack|crossbody)\b/i.test(lower);
    return {
      suggestedPrice: isBag ? 550 : 260,
      confidence: "High",
      source: "Designer Secondary Market Baseline",
    };
  }

  const isPremiumBrand = brand && [
    "Nike", "Jordan", "Supreme", "Sony", "Apple", "Nintendo", "Lego",
    "Bose", "Patagonia", "Arc'teryx"
  ].some((b) => brand.toLowerCase().includes(b.toLowerCase()));

  if (category === "Video Games & Consoles" || lower.includes("pokemon")) {
    return {
      suggestedPrice: isPremiumBrand ? 65 : 45,
      confidence: "Medium",
      source: "Gaming Market Baseline",
    };
  }

  if (category === "Footwear & Sneakers" || category === "Clothing & Streetwear") {
    return {
      suggestedPrice: isPremiumBrand ? 95 : 40,
      confidence: "Medium",
      source: "Apparel Market Baseline",
    };
  }

  if (category === "Consumer Electronics") {
    return {
      suggestedPrice: isPremiumBrand ? 120 : 55,
      confidence: "Medium",
      source: "Electronics Market Baseline",
    };
  }

  if (category === "Toys & Collectibles") {
    return {
      suggestedPrice: isPremiumBrand ? 50 : 28,
      confidence: "Medium",
      source: "Collectibles Market Baseline",
    };
  }

  if (category === "Books") {
    const isSpecialBook = lower.includes("harry potter") || lower.includes("hardcover") || lower.includes("first edition");
    return {
      suggestedPrice: isSpecialBook ? 32 : 16,
      confidence: "Medium",
      source: "Books Market Baseline",
    };
  }

  return {
    suggestedPrice: isPremiumBrand ? 45 : 25,
    confidence: "Low",
    source: "Estimated Market Baseline",
  };
}