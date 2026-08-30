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
  const searchQuery = brand && !cleanName.toLowerCase().includes(brand.toLowerCase())
    ? `${brand} ${cleanName}`
    : cleanName;

  // 1. Query real live eBay sold comps
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

  // 2. Dynamic Category baseline if live API has 0 results
  const lower = cleanName.toLowerCase();
  const isPremiumBrand = brand && [
    "Nike", "Jordan", "Supreme", "Gucci", "Sony", "Apple", "Nintendo", "Lego",
    "Bose", "Patagonia", "Arc'teryx", "Balenciaga", "Prada", "Louis Vuitton"
  ].some((b) => brand.toLowerCase().includes(b.toLowerCase()));

  if (product.category === "Video Games & Consoles" || lower.includes("pokemon")) {
    return {
      suggestedPrice: isPremiumBrand ? 65 : 45,
      confidence: "Medium",
      source: "Gaming Market Baseline",
    };
  }

  if (product.category === "Footwear & Sneakers" || product.category === "Clothing & Streetwear") {
    return {
      suggestedPrice: isPremiumBrand ? 95 : 40,
      confidence: "Medium",
      source: "Apparel Market Baseline",
    };
  }

  if (product.category === "Consumer Electronics") {
    return {
      suggestedPrice: isPremiumBrand ? 120 : 55,
      confidence: "Medium",
      source: "Electronics Market Baseline",
    };
  }

  if (product.category === "Toys & Collectibles") {
    return {
      suggestedPrice: isPremiumBrand ? 50 : 28,
      confidence: "Medium",
      source: "Collectibles Market Baseline",
    };
  }

  if (product.category === "Books") {
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