/**
 * eBay Pre-Fill & SEO Title Optimizer
 *
 * Generates search-optimized, high-converting 80-character eBay listing titles
 * incorporating verified forensic hallmarks, and builds zero-setup direct pre-fill URLs.
 */

export interface TitleOptimizationParams {
  brand: string;
  productName: string;
  category?: string;
  verifiedHallmarks?: string[];
  isAuthentic?: boolean;
}

/**
 * Builds an 80-character eBay listing title with max search visibility
 */
export function generateOptimizedEbayTitle(params: TitleOptimizationParams): string {
  const brand = (params.brand || "").trim();
  const rawProduct = (params.productName || "Item").trim();
  const hallmarks = params.verifiedHallmarks || [];
  const isAuthentic = params.isAuthentic !== false;

  // Clean raw product name if it already starts with the brand
  let cleanProduct = rawProduct;
  if (brand && cleanProduct.toLowerCase().startsWith(brand.toLowerCase())) {
    cleanProduct = cleanProduct.slice(brand.length).trim();
  }

  // Extract key hallmark keywords to boost searchability (e.g. Lampo, Notched R, Cannage, 24K)
  const hallmarkKeywords: string[] = [];
  for (const h of hallmarks) {
    const lower = h.toLowerCase();
    if (lower.includes("notched 'r'")) hallmarkKeywords.push("Notched-R");
    else if (lower.includes("lampo") || lower.includes("riri") || lower.includes("zipper")) hallmarkKeywords.push("Lampo Zip");
    else if (lower.includes("saffiano")) hallmarkKeywords.push("Saffiano");
    else if (lower.includes("cannage")) hallmarkKeywords.push("Cannage");
    else if (lower.includes("oblique")) hallmarkKeywords.push("Oblique");
    else if (lower.includes("turnlock")) hallmarkKeywords.push("Turnlock");
    else if (lower.includes("750") || lower.includes("18k")) hallmarkKeywords.push("18K 750");
    else if (lower.includes("925")) hallmarkKeywords.push("925 Silver");
  }

  const tag = isAuthentic ? "Authentic" : "";
  const hallmarkStr = hallmarkKeywords.slice(0, 2).join(" ");
  const certBadge = "[COA]";

  // Try full title with badges
  const parts = [tag, brand, cleanProduct, hallmarkStr, certBadge].filter(Boolean);
  let title = parts.join(" ");

  // If title exceeds eBay's strict 80-character ceiling, iteratively trim
  if (title.length > 80) {
    // Drop hallmarkStr first
    title = [tag, brand, cleanProduct, certBadge].filter(Boolean).join(" ");
  }

  if (title.length > 80) {
    // Drop certBadge
    title = [tag, brand, cleanProduct].filter(Boolean).join(" ");
  }

  if (title.length > 80) {
    // Hard slice to 80 chars
    title = title.slice(0, 80).trim();
  }

  return title;
}

/**
 * Builds eBay AU Direct Pre-Fill Listing URL (Opens listing wizard pre-populated)
 */
export function generateEbayPrefillUrl(params: {
  title: string;
  priceAud?: number;
  brand?: string;
  category?: string;
}): string {
  const queryParams = new URLSearchParams({
    keyword: params.title.trim(),
  });

  return `https://www.ebay.com.au/sl/prelist/suggest?${queryParams.toString()}`;
}

/**
 * Pre-populates key eBay Item Specifics (Aspects)
 */
export function generateEbayItemSpecifics(params: {
  brand: string;
  productName: string;
  category?: string;
  condition?: string;
  era?: string;
  certId?: string;
}): Record<string, string[]> {
  const aspects: Record<string, string[]> = {
    Brand: [params.brand || "Unbranded"],
    Condition: [params.condition || "Pre-owned"],
  };

  const lowerProd = params.productName.toLowerCase();
  const lowerCat = (params.category || "").toLowerCase();

  // Department
  if (lowerProd.includes("women") || lowerCat.includes("women") || lowerProd.includes("lady")) {
    aspects["Department"] = ["Women"];
  } else if (lowerProd.includes("men") || lowerCat.includes("men")) {
    aspects["Department"] = ["Men"];
  } else {
    aspects["Department"] = ["Unisex Adults"];
  }

  // Material detection
  if (lowerProd.includes("leather") || lowerProd.includes("saffiano")) {
    aspects["Material"] = ["Leather"];
  } else if (lowerProd.includes("nylon") || lowerProd.includes("tessuto")) {
    aspects["Material"] = ["Nylon"];
  } else if (lowerProd.includes("canvas") || lowerProd.includes("oblique") || lowerProd.includes("monogram")) {
    aspects["Material"] = ["Canvas"];
  } else if (lowerProd.includes("gold") || lowerProd.includes("750")) {
    aspects["Material"] = ["Yellow Gold"];
  } else if (lowerProd.includes("silver") || lowerProd.includes("925")) {
    aspects["Material"] = ["Sterling Silver"];
  }

  // Country of origin
  if (params.brand.toLowerCase().includes("prada") || params.brand.toLowerCase().includes("gucci")) {
    aspects["Country/Region of Manufacture"] = ["Italy"];
  } else if (params.brand.toLowerCase().includes("louis vuitton") || params.brand.toLowerCase().includes("chanel") || params.brand.toLowerCase().includes("dior")) {
    aspects["Country/Region of Manufacture"] = ["France"];
  }

  // Provenance & Authenticity
  if (params.certId) {
    aspects["Certificate of Authenticity (COA)"] = ["Included"];
    aspects["Certification Number"] = [params.certId];
  }

  return aspects;
}

/**
 * Maps item category and title to eBay AU leaf category IDs
 */
export function resolveEbayCategoryId(category?: string, title?: string): string {
  const text = `${category || ""} ${title || ""}`.toLowerCase();
  if (text.includes("watch") || text.includes("timepiece") || text.includes("rolex") || text.includes("omega")) return "31387";
  if (text.includes("wallet") || text.includes("cardholder") || text.includes("purse")) return "45258";
  if (text.includes("sneaker") || text.includes("shoe") || text.includes("athletic") || text.includes("jordan") || text.includes("nike") || text.includes("dunk")) return "15709";
  if (text.includes("ring") || text.includes("necklace") || text.includes("pendant") || text.includes("jewelry") || text.includes("jewellery") || text.includes("bracelet") || text.includes("earring") || text.includes("chain") || text.includes("precious_metals") || text.includes("gold") || text.includes("silver") || text.includes("brooch")) return "164344";
  if (text.includes("crystal") || text.includes("mineral") || text.includes("gemstone") || text.includes("quartz") || text.includes("geode") || text.includes("crystals_gems")) return "3225";
  if (text.includes("card") || text.includes("pokemon") || text.includes("tcg") || text.includes("magic") || text.includes("yugioh") || text.includes("charizard") || text.includes("trading_cards")) return "183454";
  if (text.includes("men") && (text.includes("bag") || text.includes("briefcase") || text.includes("backpack"))) return "52357";
  return "169291"; // Default to Women's Bags & Handbags
}

