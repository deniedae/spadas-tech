import { CURRENCY_CONFIGS, SupportedCurrency, convertCurrency } from "./currency-routing";

/**
 * Maps Spadas currency codes to eBay marketplace IDs and AU contextual headers.
 * marketplaceId MUST be sent as a header — not a query param — or eBay returns US prices.
 */
const EBAY_MARKETPLACE: Record<SupportedCurrency, { id: string; country: string }> = {
  AUD: { id: "EBAY_AU", country: "AU" },
  USD: { id: "EBAY_US", country: "US" },
  EUR: { id: "EBAY_DE", country: "DE" },
  GBP: { id: "EBAY_GB", country: "GB" },
};

/** Module-level app token cache — shared across all requests in the same server instance */
let _appToken: { token: string; expiresAt: number } | null = null;

async function getEbayAppToken(): Promise<string | null> {
  // Serve from cache with 60s buffer before expiry
  if (_appToken && Date.now() < _appToken.expiresAt - 60_000) {
    return _appToken.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const env = (process.env.EBAY_ENVIRONMENT || "production").toLowerCase();
    const host = env === "production" ? "api.ebay.com" : "api.sandbox.ebay.com";
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch(`https://${host}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });

    if (!res.ok) {
      console.warn(`[eBay Comps] App token fetch failed (${res.status})`);
      return null;
    }

    const data = await res.json();
    if (!data.access_token) return null;

    _appToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
    };
    return _appToken.token;
  } catch (err) {
    console.warn("[eBay Comps] App token error:", err);
    return null;
  }
}

function computeIqrStats(prices: number[]): { valid: number[]; lowerBound: number; upperBound: number } {
  if (prices.length < 4) {
    return {
      valid: prices,
      lowerBound: prices[0] || 0,
      upperBound: prices[prices.length - 1] || 0,
    };
  }
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = Math.max(3, q1 - 1.5 * iqr);
  const upperBound = q3 + 1.5 * iqr;
  const filtered = prices.filter((p) => p >= lowerBound && p <= upperBound);
  return {
    valid: filtered.length >= 2 ? filtered : prices,
    lowerBound: Math.round(lowerBound * 100) / 100,
    upperBound: Math.round(upperBound * 100) / 100,
  };
}

function trimIqrOutliers(prices: number[]): number[] {
  return computeIqrStats(prices).valid;
}

function calcMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export type CompsSource = "browse_api" | "sold_comps_api" | "ai_estimate";

export interface EbaySoldCompItem {
  id: string;
  title: string;
  price: number;
  condition?: string;
  soldDate?: string;
  shippingIncluded?: boolean;
  shippingPrice?: number;
  url?: string;
  thumbnail?: string;
  rawDate?: number;
  isUsComp?: boolean;
  originalCurrency?: string;
  originalPrice?: number;
}

export interface EbayCompsResult {
  min: number;
  max: number;
  median: number;
  count: number;
  currency: SupportedCurrency;
  source: CompsSource;
  rawComps?: EbaySoldCompItem[];
  iqrBounds?: { lower: number; upper: number };
  isUsMarketOnly?: boolean;
  marketOrigin?: "AU" | "US";
  usMedianUsd?: number;
  arbitrageSignal?: string;
  crossBorderShippingCost?: number;
}

// FX Conversion rates from source marketplace currency to target currency
const FX_RATES: Record<string, Record<SupportedCurrency, number>> = {
  USD: { AUD: 1.54, USD: 1.0, EUR: 0.92, GBP: 0.79 },
  GBP: { AUD: 1.95, USD: 1.27, EUR: 1.16, GBP: 1.0 },
  EUR: { AUD: 1.67, USD: 1.09, EUR: 1.0, GBP: 0.86 },
  AUD: { AUD: 1.0, USD: 0.65, EUR: 0.60, GBP: 0.51 },
};

/**
 * Builds prioritized search variations from a product title to maximize exact and category comp matches.
 */
function buildSearchQueries(productName: string, brand?: string | null, category?: string | null): string[] {
  const clean = productName
    .replace(/["'’]/g, "")
    .replace(/\b(model|item|authentic|genuine|used|pre-owned|tested|working|vintage|retro|clean|great|condition)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const lower = clean.toLowerCase();
  const queries: string[] = [];

  // 1. Luxury designer extraction (e.g. Prada, Gucci, Louis Vuitton, Chanel, Dior, YSL, Bottega Veneta)
  const luxuryBrands = [
    "prada", "louis vuitton", "gucci", "chanel", "dior", "bottega veneta", "saint laurent",
    "ysl", "fendi", "goyard", "hermes", "celine", "balenciaga", "loewe", "burberry", "mcm", "coach"
  ];
  const detectedBrand = luxuryBrands.find((b) => lower.includes(b));

  if (detectedBrand) {
    const brandName = clean.split(" ").find((w) => w.toLowerCase() === detectedBrand) || detectedBrand;

    // Check material
    const isSaffiano = lower.includes("saffiano");
    const isNylon = lower.includes("nylon") || lower.includes("tessuto");
    const isMonogram = lower.includes("monogram") || lower.includes("damier") || lower.includes("gg");
    const isLeather = lower.includes("leather") || lower.includes("caviar");

    // Check item type
    const isWallet = lower.includes("wallet") || lower.includes("purse") || lower.includes("bifold") || lower.includes("trifold") || lower.includes("cardholder") || lower.includes("card case") || lower.includes("zip around");
    const isBag = lower.includes("bag") || lower.includes("tote") || lower.includes("handbag") || lower.includes("backpack") || lower.includes("crossbody") || lower.includes("pouch");

    if (isWallet) {
      if (isSaffiano) queries.push(`${brandName} Saffiano Wallet`);
      if (isNylon) queries.push(`${brandName} Nylon Wallet`);
      if (isMonogram) queries.push(`${brandName} Monogram Wallet`);
      if (isLeather && !isSaffiano) queries.push(`${brandName} Leather Wallet`);
      queries.push(`${brandName} Triangle Logo Wallet`);
      queries.push(`${brandName} Wallet`);
    } else if (isBag) {
      if (isNylon) queries.push(`${brandName} Nylon Bag`);
      if (isSaffiano) queries.push(`${brandName} Saffiano Bag`);
      queries.push(`${brandName} Bag`);
    }
  }

  // 2. Direct cleaned query (up to 5-6 core words)
  const words = clean.split(" ").filter((w) => w.length >= 2);
  if (words.length > 0) {
    queries.push(words.slice(0, 5).join(" "));
    if (words.length > 3) {
      queries.push(words.slice(0, 3).join(" "));
    }
  }

  // 3. Style / Category Broadening for Unbranded Decor (vases, baskets, etc.)
  const isDecorOrGeneric = /\b(vase|basket|pot|planter|bowl|decor|candle|tray|plate|figurine|ornament|sculpture|cushion|pillow|blanket|throw|lamp|frame|mirror)\b/i.test(lower);
  if (!detectedBrand && (isDecorOrGeneric || category)) {
    const styleKeywords = lower.match(/\b(ceramic|porcelain|wicker|woven|rattan|brass|copper|glass|crystal|wood|wooden|marble|mid century|art deco|boho|vintage|antique|rustic|minimalist)\b/gi);
    const mainNoun = words.find((w) => /\b(vase|basket|pot|bowl|tray|lamp|figurine|planter|plate|mirror|frame)\b/i.test(w)) || "decor";
    if (styleKeywords && styleKeywords.length > 0) {
      queries.push(`${styleKeywords[0]} ${mainNoun}`);
    }
    if (category) {
      const cleanCat = category.replace(/[^\w\s]/g, "").trim();
      if (cleanCat && cleanCat.toLowerCase() !== "general resale") {
        queries.push(`${cleanCat} ${mainNoun}`);
      }
    }
  }

  // 4. Fallback to clean title
  queries.push(clean);

  // Return unique non-empty queries
  return Array.from(new Set(queries.filter((q) => q.trim().length >= 3)));
}

export const INVALID_LOT_PATTERNS = [
  /pick\s*(?:and|&)\s*choose/i,
  /choose\s*your/i,
  /pick\s*your/i,
  /you\s*choose/i,
  /\b(?:job\s*lot|bulk\s*lot|clearance\s*lot|joblot)\b/i,
  /\b\d+\s*(?:dvds?|blurays?|discs?|games?|movies?)\b/i,
  /\$\d+(?:\.\d{2})?\s*(?:-|to)\s*\$\d+(?:\.\d{2})?/i,
  /\b(lot|bundle|assorted|collection of|bulk|multi-listing|multilisting|variations?)\b/i,
  /\b(\d+\s*pack|\d+\s*pk|\d+\s*pcs|\d+\s*pieces|pack of \d+|box of \d+|tray of|lot of \d+|\d+x\b|carton of|wholesale|bundle of \d+|bundle lot|game lot|games lot|collection of \d+|console bundle|system bundle|console \+)\b/i,
  /\b(\$\d+(\.\d+)?\s*-\s*\$\d+|\$\d+\s*each|\$\d+\s*ea|\b2 for\b|\b3 for\b|\b4 for\b|\b5 for\b)\b/i,
  /\b(dvd lot|bluray lot|blu-ray lot|movie lot|game lot)\b/i,
];

export const APPLIANCE_FILTER_PATTERNS = [
  /\b(?:base\s*only|jug\s*only|filter\s*only|cord\s*only|spares?\s*or\s*repairs?)\b/i,
  /\b(?:kettle\s*(?:and|&|\+)\s*toaster|breakfast\s*pack|matching\s*set)\b/i,
  /\b(?:case\s*of\s*\d+|\d+\s*units?)\b/i,
];

/**
 * Fetches real eBay price data for a product name with multi-tier query relaxation and global marketplace fallback.
 */
export async function fetchEbayAustraliaSoldComps(
  productName: string,
  targetCurrency: SupportedCurrency = "AUD",
  brand?: string | null,
  category?: string | null,
  condition?: string | null
): Promise<EbayCompsResult | null> {
  const searchQueries = buildSearchQueries(productName, brand, category);
  if (searchQueries.length === 0) return null;

  const isQueryMultiPack = /\b(pack|lot|bundle|set|box|bulk|\d+x|\d+\s*pk)\b/i.test(productName);
  const isLuxury = /\b(prada|gucci|louis vuitton|chanel|dior|bottega|saint laurent|ysl|hermes|celine|balenciaga|burberry)\b/i.test(productName);

  // Helper to validate single-unit parity and filter junk/outliers
  const isValidUnitComp = (title: string, price: number): boolean => {
    if (isNaN(price) || price <= 0) return false;
    const lower = title.toLowerCase();

    // Condition / Junk / Defective / Locked hardware guards
    if (
      /\b(for parts|parts only|as-is|as is|broken|not working|doesn't work|does not work|faulty|untested|cracked screen|water damage|water damaged|spares|for repair|repair only|needs repair|icloud locked|activation locked|blacklisted|bad esn|bad imei|frp locked|network locked|password locked|bypass|damaged|junk)\b/i.test(lower)
    ) {
      return false;
    }

    // Luxury packaging & paper guards
    if (
      /\b(box only|empty box|dustbag only|dust bag only|paper bag|paperbag|ribbon|shopping bag|authenticity card only|care booklet)\b/i.test(lower)
    ) {
      return false;
    }

    // Physical Media & Standalone Parity Guards: Exclude strategy guides, artbooks, soundtracks, case/manual only
    if (
      /\b(strategy guide|official guide|game guide|guide book|walkthrough|prima guide|bradygames|art book|artbook|soundtrack|ost|poster|case only|cover art only|manual only|inserts only|case & manual|case and manual|steelbook only|no game|no disc)\b/i.test(lower)
    ) {
      return false;
    }

    // Digital Media Guards: Exclude digital download codes, keys, and virtual accounts
    if (
      /\b(digital code|download code|dlc code|digital key|cd key|steam key|activation key|digital download|code only|account|v-bucks|robux)\b/i.test(lower)
    ) {
      return false;
    }

    // Tech Accessories, Mounts, Brackets, Replacement Cables & Dummy Devices
    // Filters out $5–$25 accessory listings that drag down fair unit market value for cameras, consoles, audio, & electronics
    if (
      /\b(wall mount|mount only|mounting bracket|bracket only|wall bracket|corner mount|swivel mount|ceiling mount|mounting kit|gutter mount)\b/i.test(lower) ||
      /\b(power cord|power cable|power adapter|ac adapter|power supply only|charging cable|charger only|charging dock|charging station|charging base|replacement cord|usb cable|lead only)\b/i.test(lower) ||
      /\b(remote only|remote control only|battery only|spare battery|replacement battery|battery door|battery cover|lens cap only|body cap only|silicone skin|silicone case|protective cover only|strap only|wrist strap)\b/i.test(lower) ||
      /\b(dummy camera|fake camera|decoy camera|simulated camera|no camera|camera not included|no console|console not included|no phone|phone not included|no device|device not included|stand only|dock only|cradle only|base only)\b/i.test(lower) ||
      /\b(mount|bracket|holder|stand|cradle|adapter|cable|cord|charger|skin|cover) for\b/i.test(lower)
    ) {
      // If the searched item is NOT specifically looking for an accessory/mount, filter it out
      const isQuerySeekingAccessory = /\b(mount|bracket|holder|stand|cradle|adapter|cable|cord|charger|skin|cover|remote|battery|cap|strap)\b/i.test(productName);
      if (!isQuerySeekingAccessory) {
        return false;
      }
    }

    // Luxury threshold
    if (isLuxury && price < 20) return false;

    // Single-Item Parity: reject multi-packs, wholesale clearance, and multi-variation lots if query is a single item
    if (!isQueryMultiPack) {
      if (INVALID_LOT_PATTERNS.some((pattern) => pattern.test(lower))) {
        return false;
      }
      if (APPLIANCE_FILTER_PATTERNS.some((pattern) => pattern.test(lower))) {
        return false;
      }
    }

    return true;
  };

  // Helper for scraping sold comps from api.sold-comps.com with strict country/location guards
  async function fetchSoldCompsFromApi(
    q: string,
    ebaySite: string,
    prefLocAU: boolean,
    isTargetUsed: boolean
  ): Promise<EbaySoldCompItem[]> {
    try {
      const conditionParam = isTargetUsed ? "&LH_ItemCondition=3000" : "";
      const locParam = prefLocAU ? "&LH_PrefLoc=1" : "";
      const url = `https://api.sold-comps.com/v1/scrape?keyword=${encodeURIComponent(q)}&ebaySite=${ebaySite}&page=1&count=60&daysToScrape=30&sortOrder=endedRecently${conditionParam}${locParam}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.SOLD_COMPS_API_KEY}` },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timer);

      if (!res?.ok) return [];
      const data = await res.json().catch(() => null);
      const rawItems: any[] = data?.items ?? [];

      const seenSignatures = new Set<string>();
      const validCompItems: EbaySoldCompItem[] = [];

      for (const item of rawItems) {
        const rawPrice = Number(item.soldPrice);
        const title = String(item.title || "").trim();
        const itemId = String(item.itemId || item.id || `${title.toLowerCase()}::${rawPrice}`);

        if (seenSignatures.has(itemId)) continue;
        seenSignatures.add(itemId);

        if (isValidUnitComp(title, rawPrice) && rawPrice >= (isLuxury ? 35 : 1) && rawPrice <= 10000) {
          const isAU = ebaySite.includes("australia") || ebaySite.includes(".au");
          const compItem: EbaySoldCompItem = {
            id: itemId,
            title,
            price: Math.round(rawPrice * 100) / 100,
            condition: String(item.condition || "Pre-Owned"),
            soldDate: item.endedAt ? new Date(item.endedAt).toLocaleDateString(isAU ? "en-AU" : "en-US", { month: "short", day: "numeric" }) : (item.dateEnded ? new Date(item.dateEnded).toLocaleDateString(isAU ? "en-AU" : "en-US", { month: "short", day: "numeric" }) : "Recent"),
            rawDate: item.endedAt ? new Date(item.endedAt).getTime() : (item.dateEnded ? new Date(item.dateEnded).getTime() : 0),
            shippingIncluded: item.shippingType === "free" || Number(item.shippingPrice) === 0 || item.shippingCost === 0 || item.freeShipping === true,
            shippingPrice: Number(item.shippingPrice) || Number(item.shippingCost) || 0,
            url: item.url || item.viewItemUrl || (item.itemId ? (isAU ? `https://www.ebay.com.au/itm/${item.itemId}` : `https://www.ebay.com/itm/${item.itemId}`) : undefined),
            thumbnail: item.thumbnailUrl || item.galleryURL || item.image,
          };
          validCompItems.push(compItem);
        }
      }

      if (isTargetUsed) {
        const nonSealed = validCompItems.filter(
          (c) => !/\b(bnib|nib|sealed|brand new|factory sealed|shrink wrapped|nwt|new in box|unopened)\b/i.test(c.title)
        );
        if (nonSealed.length > 0) {
          return nonSealed;
        }
      }

      return validCompItems;
    } catch (err) {
      console.warn("[eBay Comps] Sold-comps API warning:", err);
      return [];
    }
  }

  // ── 1. Paid sold-comps API (real 30-day sold data) ─────────────────────────
  if (process.env.SOLD_COMPS_API_KEY) {
    const isTargetUsed = !condition || !/\b(brand new|new with tags|nwt|sealed|bnib|nib)\b/i.test(condition);
    const isRegionAU = targetCurrency === "AUD";

    // --- PHASE 1: Strictly Domestic Australian Sold Comps (LH_PrefLoc=1) ---
    let domesticComps: EbaySoldCompItem[] = [];
    for (const q of searchQueries.slice(0, 2)) {
      const results = await fetchSoldCompsFromApi(
        q,
        isRegionAU ? "ebay.com.au" : (CURRENCY_CONFIGS[targetCurrency]?.ebaySite || "ebay.com.au"),
        isRegionAU, // strictly AU Only if target is AUD
        isTargetUsed
      );
      if (results.length > domesticComps.length) {
        domesticComps = results;
      }
      if (domesticComps.length >= 3) break;
    }

    if (domesticComps.length >= 3) {
      domesticComps.sort((a, b) => a.price - b.price);
      const prices = domesticComps.map((c) => c.price);
      const { valid, lowerBound, upperBound } = computeIqrStats(prices);
      const filteredComps = domesticComps.filter((c) => c.price >= lowerBound && c.price <= upperBound);
      const medianBaseline = calcMedian(valid);
      return {
        min: Math.round(valid[0] * 100) / 100,
        max: Math.round(valid[valid.length - 1] * 100) / 100,
        median: Math.round(medianBaseline * 100) / 100,
        count: valid.length,
        currency: targetCurrency,
        source: "sold_comps_api",
        isUsMarketOnly: false,
        marketOrigin: isRegionAU ? "AU" : (targetCurrency as "AU" | "US"),
        rawComps: (filteredComps.length > 0 ? filteredComps : domesticComps)
          .sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0))
          .slice(0, 5),
        iqrBounds: { lower: lowerBound, upper: upperBound },
      };
    }

    // --- PHASE 2: US-Only Fallback & Cross-Border Arbitrage Intelligence ---
    // If domestic AU sold comps return zero or fewer than 3 verified results, automatically query the US market (EBAY_US)
    if (isRegionAU) {
      let usComps: EbaySoldCompItem[] = [];
      for (const q of searchQueries.slice(0, 2)) {
        const results = await fetchSoldCompsFromApi(
          q,
          "ebay.com",
          false,
          isTargetUsed
        );
        if (results.length > usComps.length) {
          usComps = results;
        }
        if (usComps.length >= 3) break;
      }

      if (usComps.length >= 3) {
        usComps.sort((a, b) => a.price - b.price);
        const usPrices = usComps.map((c) => c.price);
        const usMedian = calcMedian(usPrices);

        // Convert USD comps to AUD with cross-border attributes
        const convertedComps: EbaySoldCompItem[] = usComps.map((c) => {
          const convertedAud = Math.round(convertCurrency(c.price, "USD", "AUD") * 100) / 100;
          return {
            ...c,
            originalPrice: c.price,
            originalCurrency: "USD",
            isUsComp: true,
            price: convertedAud,
          };
        });

        const audPrices = convertedComps.map((c) => c.price);
        const { valid, lowerBound, upperBound } = computeIqrStats(audPrices);
        const filteredComps = convertedComps.filter((c) => c.price >= lowerBound && c.price <= upperBound);
        const medianAud = calcMedian(valid);

        const estUsdMedian = Math.round(usMedian * 100) / 100;
        const estAudMedian = Math.round(medianAud * 100) / 100;

        return {
          min: Math.round(valid[0] * 100) / 100,
          max: Math.round(valid[valid.length - 1] * 100) / 100,
          median: estAudMedian,
          count: valid.length,
          currency: "AUD",
          source: "sold_comps_api",
          isUsMarketOnly: true,
          marketOrigin: "US",
          usMedianUsd: estUsdMedian,
          crossBorderShippingCost: 25, // ~$25 AUD tracked international air friction
          arbitrageSignal: `No AU sales recorded. High US liquidity ($${Math.round(estUsdMedian)} USD / ~$${Math.round(estAudMedian)} AUD). Profitable for international export or domestic scarcity pricing.`,
          rawComps: (filteredComps.length > 0 ? filteredComps : convertedComps)
            .sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0))
            .slice(0, 5),
          iqrBounds: { lower: lowerBound, upper: upperBound },
        };
      }
    }

    // If domestic comps had 1-2 items and US also had none, return the domestic ones rather than nothing
    if (domesticComps.length > 0) {
      domesticComps.sort((a, b) => a.price - b.price);
      const prices = domesticComps.map((c) => c.price);
      return {
        min: prices[0],
        max: prices[prices.length - 1],
        median: calcMedian(prices),
        count: prices.length,
        currency: targetCurrency,
        source: "sold_comps_api",
        isUsMarketOnly: false,
        marketOrigin: isRegionAU ? "AU" : (targetCurrency as "AU" | "US"),
        rawComps: domesticComps.slice(0, 5),
      };
    }
  }

  return null;
}

