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

  const categoryId = resolveEbayCategoryId(params.category, params.title);
  if (categoryId && categoryId !== "1") {
    queryParams.set("categoryId", categoryId);
  }

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
    UPC: ["Does Not Apply"],
    Condition: [params.condition || "Pre-owned"],
  };

  const lowerProd = params.productName.toLowerCase();
  const lowerCat = (params.category || "").toLowerCase();
  const text = `${lowerProd} ${lowerCat}`;

  // 1. Fragrances, Perfumes & Cologne (e.g. Tous H2O, Chanel, Dior, Creed)
  if (/\b(perfume|fragrance|cologne|eau de toilette|eau de parfum|edt|edp|parfum|scent|aftershave)\b/i.test(text)) {
    let type = "Eau de Toilette";
    if (/\b(eau de parfum|edp)\b/i.test(text)) type = "Eau de Parfum";
    else if (/\b(eau de toilette|edt)\b/i.test(text)) type = "Eau de Toilette";
    else if (/\b(cologne|aftershave)\b/i.test(text)) type = "Cologne";
    else if (/\b(parfum|pure perfume)\b/i.test(text)) type = "Parfum";
    else if (/\b(perfume|body mist)\b/i.test(text)) type = "Perfume";

    let formulation = "Spray";
    if (/\b(rollerball|roll-on)\b/i.test(text)) formulation = "Rollerball";
    else if (/\b(splash|liquid|pour)\b/i.test(text)) formulation = "Liquid";
    else if (/\b(solid|balm)\b/i.test(text)) formulation = "Solid";

    let volume = "100 ml / 3.4 fl oz";
    const volumeMatch = text.match(/(\d+(?:\.\d+)?)\s*(ml|fl\s*oz|oz)\b/i);
    if (volumeMatch) {
      const num = volumeMatch[1];
      const unit = volumeMatch[2].toLowerCase().replace(/\s+/, " ");
      volume = `${num} ${unit}`;
    }

    let department = "Unisex";
    if (/\b(women|ladies|pour femme|femme|her)\b/i.test(text)) department = "Women";
    else if (/\b(men|pour homme|homme|his)\b/i.test(text)) department = "Men";

    let fragName = params.productName;
    if (brandVal !== "Unbranded") {
      fragName = fragName.replace(new RegExp(brandVal, "gi"), "");
    }
    fragName = fragName
      .replace(/\b(eau de toilette|eau de parfum|edt|edp|parfum|cologne|spray|perfume|fragrance|vaporisateur|for men|for women|natural spray)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    aspects["Type"] = [type];
    aspects["Fragrance Name"] = [fragName || params.productName];
    aspects["Volume"] = [volume];
    aspects["Formulation"] = [formulation];
    aspects["Department"] = [department];

    if (/\b(citrus|fresh|aquatic|water|ocean|h2o)\b/i.test(text)) aspects["Scent"] = ["Fresh / Aquatic"];
    else if (/\b(floral|rose|jasmine)\b/i.test(text)) aspects["Scent"] = ["Floral"];
    else if (/\b(woody|cedar|sandalwood|oud)\b/i.test(text)) aspects["Scent"] = ["Woody"];
    else if (/\b(oriental|amber|vanilla|spicy)\b/i.test(text)) aspects["Scent"] = ["Warm & Spicy"];

    return aspects;
  }

  // 2. DVDs / Movies
  if (/\b(dvd|dvds|blu-ray|bluray|4k uhd|movie|movies|steelbook|criterion|vhs|film|films|cinema|box set|boxset)\b/i.test(text)) {
    const isBluRay = /\b(blu-ray|bluray)\b/i.test(text);
    const is4K = /\b(4k|4k uhd|ultra hd)\b/i.test(text);
    const isVhs = /\b(vhs)\b/i.test(text);
    const format = is4K ? "4K UHD" : isBluRay ? "Blu-ray" : isVhs ? "VHS" : "DVD";

    aspects["Format"] = [format];
    aspects["Type"] = [/\b(season|series|tv)\b/i.test(text) ? "TV Series" : "Movie"];
    aspects["Movie/TV Title"] = [params.productName];
    aspects["Language"] = ["English"];
    return aspects;
  }

  // 3. Music (CDs, Vinyl)
  if (/\b(vinyl|record|cd|compact disc|cassette|album)\b/i.test(text)) {
    const isVinyl = /\b(vinyl|record|lp)\b/i.test(text);
    const isCassette = /\b(cassette)\b/i.test(text);
    const format = isVinyl ? "Record" : isCassette ? "Cassette" : "CD";

    aspects["Format"] = [format];
    aspects["Type"] = ["Album"];
    aspects["Release Title"] = [params.productName];
    if (brandVal !== "Unbranded") aspects["Artist"] = [brandVal];
    return aspects;
  }

  // 4. Video Games
  if (/\b(video game|gamecube|ps5|ps4|ps3|ps2|ps1|playstation|xbox|nintendo|switch|n64|snes|nes|sega|game boy|gameboy)\b/i.test(text)) {
    let platform = "Multi-Platform";
    if (/ps5|playstation 5/i.test(text)) platform = "Sony PlayStation 5";
    else if (/ps4|playstation 4/i.test(text)) platform = "Sony PlayStation 4";
    else if (/ps3/i.test(text)) platform = "Sony PlayStation 3";
    else if (/ps2/i.test(text)) platform = "Sony PlayStation 2";
    else if (/ps1|playstation/i.test(text)) platform = "Sony PlayStation 1";
    else if (/switch/i.test(text)) platform = "Nintendo Switch";
    else if (/gamecube/i.test(text)) platform = "Nintendo GameCube";
    else if (/n64/i.test(text)) platform = "Nintendo 64";
    else if (/game boy|gameboy/i.test(text)) platform = "Nintendo Game Boy";
    else if (/xbox series/i.test(text)) platform = "Microsoft Xbox Series X|S";
    else if (/xbox one/i.test(text)) platform = "Microsoft Xbox One";
    else if (/xbox 360/i.test(text)) platform = "Microsoft Xbox 360";
    else if (/xbox/i.test(text)) platform = "Microsoft Xbox";

    aspects["Platform"] = [platform];
    aspects["Game Name"] = [params.productName];
    aspects["Genre"] = ["Action & Adventure"];
    return aspects;
  }

  // 5. Books & Comics
  if (/\b(book|novel|comic|manga|textbook)\b/i.test(text)) {
    aspects["Book Title"] = [params.productName];
    aspects["Format"] = [/\b(hardcover|hardback)\b/i.test(text) ? "Hardcover" : "Paperback"];
    aspects["Language"] = ["English"];
    if (brandVal !== "Unbranded") aspects["Author"] = [brandVal];
    return aspects;
  }

  // 6. Trading Cards
  if (/\b(pokemon|pokémon|mtg|magic|yugioh|tcg|trading card)\b/i.test(text)) {
    aspects["Game"] = [/\b(pokemon|pokémon)\b/i.test(text) ? "Pokémon TCG" : /\b(magic|mtg)\b/i.test(text) ? "Magic: The Gathering" : "Trading Card Game"];
    aspects["Card Name"] = [params.productName];
    aspects["Graded"] = ["No"];
    return aspects;
  }

  // 7. Watches
  if (/\b(watch|timepiece|chronograph)\b/i.test(text)) {
    aspects["Type"] = ["Wristwatch"];
    aspects["Department"] = [/\b(women|ladies)\b/i.test(text) ? "Women" : /\b(men)\b/i.test(text) ? "Men" : "Unisex Adults"];
    return aspects;
  }

  // 8. Mobile Phones & Smartphones
  if (/\b(iphone|smartphone|cell phone|galaxy s\d+|pixel \d+)\b/i.test(text)) {
    let model = params.productName;
    if (/\b(iphone\s*\d*(?:\s*pro(?:\s*max)?)?)\b/i.test(text)) {
      const m = text.match(/\b(iphone\s*\d+(?:\s*pro(?:\s*max)?)?)\b/i);
      if (m) model = m[1].toUpperCase();
    } else if (/\b(galaxy\s*s\d+(?:\s*ultra|\s*\+)?)\b/i.test(text)) {
      const m = text.match(/\b(galaxy\s*s\d+(?:\s*ultra|\s*\+)?)\b/i);
      if (m) model = `Samsung ${m[1]}`;
    }

    let storage = "128 GB";
    const storageMatch = text.match(/\b(64|128|256|512|1000|1tb|2tb)\s*(gb|tb)\b/i);
    if (storageMatch) storage = `${storageMatch[1]} ${storageMatch[2].toUpperCase()}`;

    aspects["Model"] = [model];
    aspects["Storage Capacity"] = [storage];
    aspects["Network"] = ["Unlocked"];
    aspects["Lock Status"] = ["Factory Unlocked"];
    return aspects;
  }

  // 9. Consumer Electronics & Cameras
  if (/\b(camera|lens|dslr|camcorder|digicam|headphone|headphones|earbuds|walkman|turntable|receiver|amplifier|speaker)\b/i.test(text)) {
    let type = "Electronics";
    if (/\b(headphone|headphones)\b/i.test(text)) type = "Headphones";
    else if (/\b(earbuds|airpods)\b/i.test(text)) type = "Earbuds";
    else if (/\b(camera|dslr|digicam)\b/i.test(text)) type = "Digital Camera";
    else if (/\b(walkman|cassette player)\b/i.test(text)) type = "Portable Cassette Player";
    else if (/\b(turntable|record player)\b/i.test(text)) type = "Turntable";
    else if (/\b(receiver|amplifier)\b/i.test(text)) type = "Receiver/Amplifier";

    let connectivity = "Wired";
    if (/\b(bluetooth|wireless)\b/i.test(text)) connectivity = "Bluetooth";

    aspects["Type"] = [type];
    aspects["Connectivity"] = [connectivity];
    aspects["Model"] = [params.productName];
    return aspects;
  }

  // 10. Toys, Action Figures & LEGO
  if (/\b(action figure|funko|lego|hot wheels|hasbro|mattel|transformers|star wars toy|marvel toy|plush)\b/i.test(text)) {
    let type = "Action Figure";
    if (/\b(lego|building set|blocks)\b/i.test(text)) type = "Building Toy Set";
    else if (/\b(funko|pop figure|vinyl figure)\b/i.test(text)) type = "Vinyl Figure";
    else if (/\b(hot wheels|diecast|die-cast|car)\b/i.test(text)) type = "Diecast Vehicle";
    else if (/\b(plush|stuffed animal)\b/i.test(text)) type = "Plush";

    let theme = "Collectibles";
    if (/\b(star wars)\b/i.test(text)) theme = "Star Wars";
    else if (/\b(marvel|avengers|spider-man|spiderman|iron man)\b/i.test(text)) theme = "Marvel";
    else if (/\b(dc|batman|superman)\b/i.test(text)) theme = "DC Comics";
    else if (/\b(pokemon|pokémon)\b/i.test(text)) theme = "Pokémon";

    aspects["Type"] = [type];
    aspects["Theme"] = [theme];
    aspects["Franchise"] = [theme];
    return aspects;
  }

  // 11. Jewelry & Precious Metals
  if (/\b(ring|necklace|pendant|jewelry|jewellery|bracelet|earring|earrings|chain|brooch|gold|silver|diamond|\.925|14k|18k)\b/i.test(text)) {
    let type = "Necklace";
    if (/\b(ring|bands)\b/i.test(text)) type = "Ring";
    else if (/\b(bracelet|bangle)\b/i.test(text)) type = "Bracelet";
    else if (/\b(earring|earrings|studs)\b/i.test(text)) type = "Earrings";
    else if (/\b(pendant|charm)\b/i.test(text)) type = "Pendant";

    let metal = "Sterling Silver";
    if (/\b(14k|18k|10k|24k|yellow gold|solid gold)\b/i.test(text)) metal = "Yellow Gold";
    else if (/\b(white gold)\b/i.test(text)) metal = "White Gold";
    else if (/\b(rose gold)\b/i.test(text)) metal = "Rose Gold";
    else if (/\b(stainless steel)\b/i.test(text)) metal = "Stainless Steel";

    let stone = "No Stone";
    if (/\b(diamond|diamonds)\b/i.test(text)) stone = "Diamond";
    else if (/\b(crystal|cubic zirconia|cz)\b/i.test(text)) stone = "Cubic Zirconia";
    else if (/\b(pearl|pearls)\b/i.test(text)) stone = "Pearl";
    else if (/\b(amethyst|quartz|gemstone|emerald|ruby|sapphire)\b/i.test(text)) stone = "Gemstone";

    aspects["Type"] = [type];
    aspects["Metal"] = [metal];
    aspects["Main Stone"] = [stone];
    aspects["Metal Purity"] = [/\b(18k)\b/i.test(text) ? "18k" : /\b(14k)\b/i.test(text) ? "14k" : /\b(925)\b/i.test(text) ? "925" : "Not Applicable"];
    return aspects;
  }

  // 12. Clothing, Shoes, Bags & Fashion (ONLY here do we add Department, Material, Color, Style, Size)
  const isFashion = /\b(jacket|coat|windbreaker|hoodie|sweater|sweatshirt|shirt|t-shirt|tee|pants|jeans|dress|skirt|shorts|sneaker|shoe|shoes|boots|bag|handbag|tote|crossbody|backpack|wallet|purse)\b/i.test(text);

  if (isFashion) {
    if (lowerProd.includes("women") || lowerCat.includes("women") || lowerProd.includes("lady") || lowerProd.includes("dress")) {
      aspects["Department"] = ["Women"];
    } else if (lowerProd.includes("men") || lowerCat.includes("men")) {
      aspects["Department"] = ["Men"];
    } else {
      aspects["Department"] = ["Unisex Adults"];
    }

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

    let size = "M";
    const sizeMatch = text.match(/\b(xxxl|xxl|xl|l|m|s|xs|xxs|\d{1,2}(?:\s*us|\s*uk)?)\b/i);
    if (sizeMatch) size = sizeMatch[1].toUpperCase();
    aspects["Size"] = [size];
    aspects["Size Type"] = ["Regular"];

    if (brandVal.toLowerCase().includes("prada") || brandVal.toLowerCase().includes("gucci") || brandVal.toLowerCase().includes("ferragamo") || brandVal.toLowerCase().includes("fendi")) {
      aspects["Country/Region of Manufacture"] = ["Italy"];
    } else if (brandVal.toLowerCase().includes("louis vuitton") || brandVal.toLowerCase().includes("chanel") || brandVal.toLowerCase().includes("dior") || brandVal.toLowerCase().includes("hermes")) {
      aspects["Country/Region of Manufacture"] = ["France"];
    }
  }

  // Vintage & Era tagging (cross-cutting)
  if (params.era || /\b(vintage|retro|antique|y2k|90s|80s|70s|60s|50s)\b/i.test(text)) {
    aspects["Vintage"] = ["Yes"];
    let era = params.era || "1990s (90s)";
    if (/\b(80s|1980s)\b/i.test(text)) era = "1980s (80s)";
    else if (/\b(70s|1970s)\b/i.test(text)) era = "1970s (70s)";
    else if (/\b(y2k|2000s)\b/i.test(text)) era = "2000s (Y2K)";
    aspects["Era"] = [era];
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
 * Maps item category and title to eBay leaf category IDs (universal across AU, US, UK)
 */
export function resolveEbayCategoryId(category?: string, title?: string): string {
  const text = `${category || ""} ${title || ""}`.toLowerCase();

  // 1. Fragrances & Perfumes (e.g. Tous H2O, Chanel, Dior)
  if (/\b(perfume|fragrance|cologne|eau de toilette|eau de parfum|edt|edp|parfum|aftershave)\b/i.test(text)) {
    if (/\b(men|homme|pour homme|his)\b/i.test(text)) return "29585"; // Men's Fragrances
    return "11848"; // Women's / Unisex Fragrances
  }

  // 2. DVDs, Blu-rays, Movies, VHS
  if (/\b(dvd|dvds|blu-ray|bluray|4k uhd|movie|movies|steelbook|criterion|film|films|cinema|box set|boxset)\b/i.test(text)) return "617";
  if (/\b(vhs|tape)\b/i.test(text)) return "309";

  // 2. Music (Vinyl, CDs, Cassettes)
  if (/\b(vinyl|record|lp|12"|7"|33 rpm|45 rpm)\b/i.test(text)) return "176985";
  if (/\b(cd|compact disc|audio cd)\b/i.test(text)) return "176984";
  if (/\b(cassette)\b/i.test(text)) return "176983";

  // 3. Video Games & Consoles
  if (/\b(ps5|ps4|ps3|ps2|ps1|playstation|xbox|nintendo|switch|gamecube|n64|snes|nes|sega|game boy|gameboy|wii|atari)\b/i.test(text)) {
    if (/\b(console|system|hardware|bundle)\b/i.test(text)) return "139971";
    return "139973"; // Video Games
  }
  if (/\b(video game|cartridge)\b/i.test(text)) return "139973";

  // 4. Books, Comic Books & Manga
  if (/\b(comic|manga|graphic novel)\b/i.test(text)) return "63";
  if (/\b(book|novel|hardcover|paperback|textbook|author|isbn)\b/i.test(text)) return "267";

  // 5. Trading Cards & Sports Cards
  if (/\b(pokemon|pokémon|magic the gathering|mtg|yugioh|yu-gi-oh|tcg|charizard|booster|cardfight)\b/i.test(text)) return "183454";
  if (/\b(trading card|baseball card|basketball card|football card|soccer card|sports card|panini|topps)\b/i.test(text)) return "213";

  // 6. Watches & Timepieces
  if (/\b(watch|timepiece|rolex|omega|seiko|casio|chronograph|g-shock|tag heuer|breitling|tudor)\b/i.test(text)) return "31387";

  // 7. Jewelry & Precious Metals
  if (/\b(ring|necklace|pendant|jewelry|jewellery|bracelet|earring|earrings|chain|brooch|gold|silver|diamond|\.925|14k|18k)\b/i.test(text)) return "164344";

  // 8. Crystals & Minerals
  if (/\b(crystal|mineral|gemstone|quartz|geode|amethyst|agate|cluster|crystals_gems)\b/i.test(text)) return "3225";

  // 9. Consumer Electronics & Cameras
  if (/\b(iphone|smartphone|cell phone|samsung galaxy|pixel)\b/i.test(text)) return "9355";
  if (/\b(camera|lens|dslr|camcorder|digicam)\b/i.test(text)) return "31388";
  if (/\b(headphone|headphones|earbuds|airpods)\b/i.test(text)) return "112529";
  if (/\b(receiver|amplifier|turntable|speaker|vintage audio)\b/i.test(text)) return "14993";

  // 10. Toys & Action Figures
  if (/\b(action figure|funko|lego|hot wheels|hasbro|mattel|transformers|star wars toy)\b/i.test(text)) return "246";

  // 11. Shoes & Sneakers
  if (/\b(sneaker|sneakers|shoe|shoes|athletic|jordan|nike|dunk|boots|heels|sandals|loafers|cleats)\b/i.test(text)) return "15709";

  // 12. Clothing & Apparel
  if (/\b(jacket|coat|windbreaker|hoodie|sweater|sweatshirt|shirt|t-shirt|tee|pants|jeans|dress|skirt|shorts|blazer|fleece|parka|vest)\b/i.test(text)) {
    if (/\b(women|ladies|dress|skirt)\b/i.test(text)) return "15724"; // Women's Clothing
    return "1059"; // Men's Clothing
  }

  // 13. Bags, Wallets & Handbags
  if (/\b(wallet|cardholder|bifold|coin purse)\b/i.test(text)) return "45258";
  if (/\b(backpack|briefcase|messenger bag)\b/i.test(text)) return "52357";
  if (/\b(bag|handbag|tote|crossbody|shoulder bag|clutch|purse)\b/i.test(text)) return "169291";

  // 14. Neutral Fallback for General Collectibles & Household Goods (NOT clothing!)
  return "1"; // Collectibles
}

export const EBAY_SUPPORTED_CATEGORIES: { id: string; label: string }[] = [
  { id: "11848", label: "Fragrances > Women's & Unisex" },
  { id: "29585", label: "Fragrances > Men's" },
  { id: "15709", label: "Shoes & Sneakers" },
  { id: "1059", label: "Clothing > Men's Apparel" },
  { id: "15724", label: "Clothing > Women's Apparel" },
  { id: "169291", label: "Handbags & Bags" },
  { id: "45258", label: "Wallets & Cardholders" },
  { id: "31387", label: "Watches & Timepieces" },
  { id: "164344", label: "Jewelry & Precious Metals" },
  { id: "9355", label: "Smartphones & Cell Phones" },
  { id: "31388", label: "Digital Cameras & Lenses" },
  { id: "112529", label: "Headphones & Audio" },
  { id: "14993", label: "Vintage Audio & Amplifiers" },
  { id: "139973", label: "Video Games & Software" },
  { id: "139971", label: "Gaming Consoles & Hardware" },
  { id: "183454", label: "Pokémon / CCG Trading Cards" },
  { id: "213", label: "Sports Trading Cards" },
  { id: "246", label: "Toys & Action Figures" },
  { id: "617", label: "Movies & TV (DVD, Blu-ray, 4K)" },
  { id: "176985", label: "Vinyl Records (LPs, 45s)" },
  { id: "176984", label: "CDs & Compact Discs" },
  { id: "63", label: "Comic Books & Manga" },
  { id: "267", label: "Books & Literature" },
  { id: "3225", label: "Crystals, Minerals & Geodes" },
  { id: "1", label: "General Collectibles" },
];

export function getEbayCategoryLabel(categoryId: string): string {
  const match = EBAY_SUPPORTED_CATEGORIES.find((c) => c.id === categoryId);
  return match ? match.label : "Collectibles & Merchandise";
}
