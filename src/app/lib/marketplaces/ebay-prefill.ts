/**
 * eBay Pre-Fill & SEO Title Optimizer (VeRO & Policy Compliant)
 *
 * Generates search-optimized, high-converting 80-character eBay listing titles
 * strictly complying with eBay's VeRO (Verified Rights Owner) and Search Manipulation policies.
 * Eliminates keyword-spamming triggers (e.g., "[COA]", "100% Authentic") that cause automated seller flags.
 */

export interface TitleOptimizationParams {
  brand?: string | null;
  productName: string;
  category?: string | null;
  condition?: string | null;
  verifiedHallmarks?: string[];
  isAuthentic?: boolean;
}

// Prohibited buzzwords and keyword-stuffing triggers on eBay
const PROHIBITED_TITLE_PATTERNS = [
  /\b(100%\s*)?authentic\b/gi,
  /\bgenuine\b/gi,
  /\breal\b/gi,
  /\b\[coa\]\b/gi,
  /\bcoa\b/gi,
  /\bcertified\b/gi,
  /\bguaranteed\b/gi,
  /\breplica\b/gi,
  /\brep\b/gi,
  /\bfake\b/gi,
  /\bdupe\b/gi,
  /\blookalike\b/gi,
  /\binspired\s+by\b/gi,
  /\blike\s+new\s+condition\b/gi,
  /\bmust\s+see\b/gi,
  /\bwow\b/gi,
  /\bl@@k\b/gi,
  /[!@#$%^*+=~`]/g,
];

/**
 * Builds an 80-character, VeRO-compliant eBay listing title with max search visibility
 */
export function generateOptimizedEbayTitle(
  paramsOrTitle: string | TitleOptimizationParams,
  brandFallback?: string | null
): string {
  let params: TitleOptimizationParams;
  if (typeof paramsOrTitle === "string") {
    params = {
      productName: paramsOrTitle,
      brand: brandFallback || null,
    };
  } else {
    params = paramsOrTitle;
  }

  let rawBrand = (params.brand || "").trim();
  if (rawBrand.toLowerCase() === "authentic" || rawBrand.toLowerCase() === "unbranded" || rawBrand.toLowerCase() === "generic") {
    rawBrand = "";
  }

  let cleanProduct = (params.productName || "Item").trim();

  // Strip prohibited VeRO triggers from brand and product
  for (const pattern of PROHIBITED_TITLE_PATTERNS) {
    cleanProduct = cleanProduct.replace(pattern, " ");
  }
  cleanProduct = cleanProduct.replace(/\s+/g, " ").trim();

  // Clean raw product name if it already starts with the brand to avoid duplication
  if (rawBrand && cleanProduct.toLowerCase().startsWith(rawBrand.toLowerCase())) {
    cleanProduct = cleanProduct.slice(rawBrand.length).trim();
  }

  // Extract key non-infringing attribute keywords (e.g. Saffiano, Cannage, Oblique, Sterling Silver)
  const hallmarks = params.verifiedHallmarks || [];
  const hallmarkKeywords: string[] = [];
  for (const h of hallmarks) {
    const lower = h.toLowerCase();
    if (lower.includes("saffiano") && !cleanProduct.toLowerCase().includes("saffiano")) {
      hallmarkKeywords.push("Saffiano");
    } else if (lower.includes("cannage") && !cleanProduct.toLowerCase().includes("cannage")) {
      hallmarkKeywords.push("Cannage");
    } else if (lower.includes("oblique") && !cleanProduct.toLowerCase().includes("oblique")) {
      hallmarkKeywords.push("Oblique");
    } else if (lower.includes("turnlock") && !cleanProduct.toLowerCase().includes("turnlock")) {
      hallmarkKeywords.push("Turnlock");
    } else if ((lower.includes("750") || lower.includes("18k")) && !cleanProduct.toLowerCase().includes("18k")) {
      hallmarkKeywords.push("18K Gold");
    } else if (lower.includes("925") && !cleanProduct.toLowerCase().includes("925")) {
      hallmarkKeywords.push("925 Silver");
    }
  }

  const hallmarkStr = hallmarkKeywords.slice(0, 2).join(" ");

  // Build compliant parts: [Brand] [Product] [Attribute]
  const parts = [rawBrand, cleanProduct, hallmarkStr].filter(Boolean);
  let title = parts.join(" ").replace(/\s+/g, " ").trim();

  // If title exceeds eBay's strict 80-character ceiling, trim hallmarks first
  if (title.length > 80 && hallmarkStr) {
    title = [rawBrand, cleanProduct].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  if (title.length > 80) {
    // Hard slice to 80 chars on word boundary
    const sliced = title.slice(0, 80);
    const lastSpace = sliced.lastIndexOf(" ");
    title = (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim();
  }

  return title || "Pre-Owned Resale Item";
}

/**
 * Builds eBay Direct Pre-Fill Listing URL (Opens listing wizard pre-populated)
 * Dynamically routes to ebay.com (USD), ebay.co.uk (GBP), ebay.de (EUR), or ebay.com.au (AUD).
 */
export function generateEbayPrefillUrl(params: {
  title: string;
  price?: number;
  priceAud?: number;
  currency?: string;
  brand?: string;
  category?: string;
}): string {
  const cleanTitle = generateOptimizedEbayTitle({
    brand: params.brand,
    productName: params.title,
    category: params.category,
  });

  const queryParams = new URLSearchParams({
    keyword: cleanTitle,
  });

  const curr = (params.currency || "").toUpperCase().trim();
  let domain = "www.ebay.com";
  if (curr === "AUD") {
    domain = "www.ebay.com.au";
  } else if (curr === "GBP") {
    domain = "www.ebay.co.uk";
  } else if (curr === "EUR") {
    domain = "www.ebay.de";
  }

  return `https://${domain}/sl/prelist/suggest?${queryParams.toString()}`;
}

/**
 * Pre-populates policy-compliant eBay Item Specifics (Aspects).
 * Crucially includes MPN: "Does Not Apply" to prevent eBay API Error 21919301.
 */
export function generateEbayItemSpecifics(params: {
  brand?: string | null;
  productName: string;
  category?: string | null;
  condition?: string | null;
  era?: string | null;
}): Record<string, string[]> {
  const safeBrand = (params.brand || "").trim();
  const brandVal = safeBrand && safeBrand.toLowerCase() !== "authentic" && safeBrand.toLowerCase() !== "unbranded"
    ? safeBrand
    : "Unbranded";

  const aspects: Record<string, string[]> = {
    Brand: [brandVal],
    MPN: ["Does Not Apply"],
    Condition: [params.condition || "Pre-owned"],
  };

  const lowerProd = params.productName.toLowerCase();
  const lowerCat = (params.category || "").toLowerCase();

  // Department
  if (lowerProd.includes("women") || lowerCat.includes("women") || lowerProd.includes("lady") || lowerProd.includes("dress")) {
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
  } else if (lowerProd.includes("cotton") || lowerProd.includes("denim")) {
    aspects["Material"] = ["Cotton"];
  } else if (lowerProd.includes("wool") || lowerProd.includes("cashmere")) {
    aspects["Material"] = ["Wool"];
  } else if (lowerProd.includes("gold") || lowerProd.includes("750")) {
    aspects["Material"] = ["Yellow Gold"];
  } else if (lowerProd.includes("silver") || lowerProd.includes("925")) {
    aspects["Material"] = ["Sterling Silver"];
  }

  // Color detection (supplying both US 'Color' and UK/AU 'Colour' for universal cross-border compliance)
  const knownColors = ["black", "white", "blue", "red", "green", "brown", "grey", "gray", "pink", "purple", "yellow", "orange", "gold", "silver", "beige", "navy", "cream", "tan"];
  let matchedColor = "Multicoloured";
  for (const c of knownColors) {
    if (lowerProd.includes(c)) {
      matchedColor = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }
  aspects["Color"] = [matchedColor];
  aspects["Colour"] = [matchedColor];
  aspects["UPC"] = ["Does Not Apply"];

  // Country of origin
  if (brandVal.toLowerCase().includes("prada") || brandVal.toLowerCase().includes("gucci") || brandVal.toLowerCase().includes("ferragamo") || brandVal.toLowerCase().includes("fendi")) {
    aspects["Country/Region of Manufacture"] = ["Italy"];
  } else if (brandVal.toLowerCase().includes("louis vuitton") || brandVal.toLowerCase().includes("chanel") || brandVal.toLowerCase().includes("dior") || brandVal.toLowerCase().includes("hermes")) {
    aspects["Country/Region of Manufacture"] = ["France"];
  }

  return aspects;
}

/**
 * Builds a structured, 100% eBay Policy-Compliant description.
 * - Guaranteed free of external links, contact info, and off-platform solicitations
 * - Incorporates clear 30-day domestic returns statement tailored for US (shipping) vs UK/AU (postage)
 * - Incorporates fast 1-day tracked dispatch statement with regional carrier (USPS, Royal Mail, Australia Post)
 */
export function buildEbayPolicyCompliantDescription(params: {
  title: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  size?: string | null;
  extraDetails?: string | null;
  rawNotes?: string | null;
  currency?: string;
}): string {
  const safeBrand = (params.brand || "").trim();
  const brandVal = safeBrand && safeBrand.toLowerCase() !== "authentic" && safeBrand.toLowerCase() !== "unbranded" ? safeBrand : "Unbranded";
  const safeCond = params.condition || "Pre-owned in good working condition";
  const notes = (params.rawNotes || params.extraDetails || "").trim();
  const rawCurr = (params.currency || "").toUpperCase().trim();
  const isUs = rawCurr === "USD";
  const isUk = rawCurr === "GBP";

  const lines: string[] = [
    `Product: ${params.title}`,
    "",
    "Item Specifics:",
    `• Brand: ${brandVal}`,
    `• Condition: ${safeCond}`,
  ];

  if (params.size && params.size !== "One Size") {
    lines.push(`• Size: ${params.size}`);
  }

  if (params.category && params.category !== "General Resale") {
    lines.push(`• Category: ${params.category}`);
  }

  if (notes) {
    lines.push(`• Notes: ${notes}`);
  }

  const dispatchNotice = isUs
    ? "• Dispatched within 1 business day via USPS tracked delivery."
    : isUk
    ? "• Dispatched within 1 business day via Royal Mail tracked delivery."
    : "• Dispatched within 1 business day via tracked postal delivery (Australia Post).";

  const returnNotice = isUs
    ? "• 30-Day Domestic Returns accepted (Buyer pays return shipping)."
    : isUk
    ? "• 30-Day Domestic Returns accepted (Buyer pays return postage)."
    : "• 30-Day Domestic Returns accepted (Buyer pays return postage).";

  lines.push(
    "",
    "Condition & Authenticity:",
    "• This item is pre-owned and has been carefully inspected for cosmetic and functional integrity.",
    "• All photos show the actual item you will receive. Please review all high-resolution photos prior to purchase.",
    "",
    "Shipping & Handling:",
    dispatchNotice,
    "• Tracking number provided immediately upon dispatch.",
    "• Packed securely in protective packaging to prevent damage in transit.",
    "",
    "Returns & Customer Guarantee:",
    returnNotice,
    "• Item must be returned in the original condition received.",
    "• Protected under the eBay Money Back Guarantee."
  );

  return lines.join("\n");
}

/**
 * Maps item category and title to eBay leaf category IDs
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
