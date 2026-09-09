import { CURRENCY_CONFIGS, SupportedCurrency } from "./currency-routing";

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
function buildSearchQueries(productName: string): string[] {
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

  // 3. Fallback to clean title
  queries.push(clean);

  // Return unique non-empty queries
  return Array.from(new Set(queries.filter((q) => q.trim().length >= 3)));
}

/**
 * Fetches real eBay price data for a product name with multi-tier query relaxation and global marketplace fallback.
 */
export async function fetchEbayAustraliaSoldComps(
  productName: string,
  targetCurrency: SupportedCurrency = "AUD"
): Promise<EbayCompsResult | null> {
  const searchQueries = buildSearchQueries(productName);
  if (searchQueries.length === 0) return null;

  const isQueryMultiPack = /\b(pack|lot|bundle|set|box|bulk|\d+x|\d+\s*pk)\b/i.test(productName);
  const isLuxury = /\b(prada|gucci|louis vuitton|chanel|dior|bottega|saint laurent|ysl|hermes|celine|balenciaga|burberry)\b/i.test(productName);

  // Helper to validate single-unit parity and filter junk/outliers
  const isValidUnitComp = (title: string, price: number): boolean => {
    if (isNaN(price) || price <= 0) return false;
    const lower = title.toLowerCase();

    // Condition / junk / accessory guards
    if (/\b(box only|empty box|dustbag only|dust bag only|paper bag|paperbag|ribbon|shopping bag|authenticity card only|care booklet|untested|faulty|for parts|parts only|as-is|as is|broken|damaged|junk)\b/i.test(lower)) {
      return false;
    }

    // Physical Media & Standalone Parity Guards: Exclude strategy guides, artbooks, soundtracks, case/manual only
    if (/\b(strategy guide|official guide|game guide|guide book|walkthrough|prima guide|bradygames|art book|artbook|soundtrack|ost|poster|case only|cover art only|manual only|inserts only|case & manual|case and manual|steelbook only|no game|no disc)\b/i.test(lower)) {
      return false;
    }

    // Digital Media Guards: Exclude digital download codes, keys, and virtual accounts
    if (/\b(digital code|download code|dlc code|digital key|cd key|steam key|activation key|digital download|code only|account|v-bucks|robux)\b/i.test(lower)) {
      return false;
    }

    // Luxury threshold
    if (isLuxury && price < 20) return false;

    // Single-Item Parity: reject multi-packs, wholesale bundles, bulk lots if query is a single item
    if (!isQueryMultiPack) {
      if (/\b(\d+\s*pack|\d+\s*pk|\d+\s*pcs|\d+\s*pieces|pack of \d+|box of \d+|tray of|lot of \d+|\d+x\b|carton of|wholesale|bundle of \d+|bundle lot|game lot|games lot|\d+\s*games|collection of \d+|console bundle|system bundle|console \+|job lot|joblot|bulk lot)\b/i.test(lower)) {
        return false;
      }
    }

    return true;
  };

  // ── 1. Paid sold-comps API (real 30-day sold data) ─────────────────────────
  if (process.env.SOLD_COMPS_API_KEY) {
    for (const q of searchQueries.slice(0, 2)) {
      try {
        const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.AUD;
        const url = `https://api.sold-comps.com/v1/scrape?keyword=${encodeURIComponent(q)}&ebaySite=${config.ebaySite}&page=1&count=60&daysToScrape=30&sortOrder=endedRecently`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.SOLD_COMPS_API_KEY}` },
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timer);

        if (res?.ok) {
          const data = await res.json().catch(() => null);
          const rawItems: any[] = data?.items ?? [];

          // Single-Source Guardrail: Deduplicate items across paginated/duplicated API nodes
          const seenSignatures = new Set<string>();
          const validCompItems: EbaySoldCompItem[] = [];

          for (const item of rawItems) {
            const rawPrice = Number(item.soldPrice);
            const title = String(item.title || "").trim();
            const itemId = String(item.itemId || item.id || `${title.toLowerCase()}::${rawPrice}`);

            if (seenSignatures.has(itemId)) continue;
            seenSignatures.add(itemId);

            if (isValidUnitComp(title, rawPrice) && rawPrice >= (isLuxury ? 35 : 1) && rawPrice <= 10000) {
              const compItem: EbaySoldCompItem = {
                id: itemId,
                title,
                price: Math.round(rawPrice * 100) / 100,
                condition: String(item.condition || "Pre-Owned"),
                soldDate: item.dateEnded ? new Date(item.dateEnded).toLocaleDateString("en-AU", { month: "short", day: "numeric" }) : "Recent",
                shippingIncluded: item.shippingCost === 0 || item.freeShipping === true,
                shippingPrice: Number(item.shippingCost) || 0,
                url: item.viewItemUrl || item.url || (item.itemId ? `https://www.ebay.com.au/itm/${item.itemId}` : undefined),
                thumbnail: item.galleryURL || item.image,
              };
              validCompItems.push(compItem);
            }
          }

          if (validCompItems.length >= 2) {
            validCompItems.sort((a, b) => a.price - b.price);
            const prices = validCompItems.map((c) => c.price);
            const { valid, lowerBound, upperBound } = computeIqrStats(prices);
            const filteredComps = validCompItems.filter((c) => c.price >= lowerBound && c.price <= upperBound);
            const medianBaseline = calcMedian(valid);
            return {
              min: Math.round(valid[0] * 100) / 100,
              max: Math.round(valid[valid.length - 1] * 100) / 100,
              median: Math.round(medianBaseline * 100) / 100,
              count: valid.length,
              currency: targetCurrency,
              source: "sold_comps_api",
              rawComps: (filteredComps.length > 0 ? filteredComps : validCompItems).slice(0, 10),
              iqrBounds: { lower: lowerBound, upper: upperBound },
            };
          }
        }
      } catch (err) {
        console.warn("[eBay Comps] Sold-comps API warning:", err);
      }
    }
  }

  // ── 2. eBay Browse API with Multi-Query & Multi-Marketplace Fallback ───────
  try {
    const appToken = await getEbayAppToken();
    if (appToken) {
      const primaryMarketplace = EBAY_MARKETPLACE[targetCurrency] || EBAY_MARKETPLACE.AUD;
      const marketplacesToTry = [
        primaryMarketplace,
        EBAY_MARKETPLACE.USD, // Global fallback if local region has 0 luxury comps
      ];

      const env = (process.env.EBAY_ENVIRONMENT || "production").toLowerCase();
      const apiHost = env === "production" ? "api.ebay.com" : "api.sandbox.ebay.com";

      for (const marketplace of marketplacesToTry) {
        const isGlobalMarketplace = marketplace.id !== primaryMarketplace.id;
        const fxMultiplier = isGlobalMarketplace
          ? (FX_RATES[marketplace.country === "US" ? "USD" : "AUD"]?.[targetCurrency] || 1.54)
          : 1.0;

        for (const query of searchQueries) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);

          const encodedQuery = encodeURIComponent(query);
          const res = await fetch(
            `https://${apiHost}/buy/browse/v1/item_summary/search` +
              `?q=${encodedQuery}&filter=buyingOptions%3A%7BFIXED_PRICE%7D&limit=50`,
            {
              headers: {
                Authorization: `Bearer ${appToken}`,
                "X-EBAY-C-MARKETPLACE-ID": marketplace.id,
                "X-EBAY-C-ENDUSERCTX": `contextualLocation=country=${marketplace.country}`,
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            }
          ).catch(() => null);
          clearTimeout(timer);

          if (res?.ok) {
            const data = await res.json().catch(() => null);
            const items: any[] = data?.itemSummaries ?? [];

            if (items.length === 0) continue;

            // Single-Source Guardrail: Deduplicate browse items across paginated/duplicate nodes
            const seenBrowseIds = new Set<string>();
            const validBrowseItems: EbaySoldCompItem[] = [];

            for (const item of items) {
              const itemId = String(item.itemId || `${(item.title || "").toLowerCase()}::${item.price?.value}`);
              if (seenBrowseIds.has(itemId)) continue;
              seenBrowseIds.add(itemId);

              const title = String(item.title || "");
              const unitPrice = (Number(item.price?.value) || 0) * fxMultiplier;

              if (isValidUnitComp(title, unitPrice) && unitPrice >= (isLuxury ? 35 : 1) && unitPrice <= 10000) {
                const compItem: EbaySoldCompItem = {
                  id: itemId,
                  title,
                  price: Math.round(unitPrice * 100) / 100,
                  condition: String(item.condition || "Pre-Owned"),
                  soldDate: "Active Comp",
                  shippingIncluded: item.shippingOptions?.[0]?.shippingCost?.value === "0.00",
                  shippingPrice: Number(item.shippingOptions?.[0]?.shippingCost?.value) || 0,
                  url: item.itemWebUrl || (item.itemId ? `https://www.ebay.com.au/itm/${item.itemId}` : undefined),
                  thumbnail: item.image?.imageUrl,
                };
                validBrowseItems.push(compItem);
              }
            }

            if (validBrowseItems.length >= 2) {
              validBrowseItems.sort((a, b) => a.price - b.price);
              const prices = validBrowseItems.map((c) => c.price);
              const { valid, lowerBound, upperBound } = computeIqrStats(prices);
              const filteredComps = validBrowseItems.filter((c) => c.price >= lowerBound && c.price <= upperBound);
              const medianBaseline = calcMedian(valid);
              return {
                min: Math.round(valid[0] * 100) / 100,
                max: Math.round(valid[valid.length - 1] * 100) / 100,
                median: Math.round(medianBaseline * 100) / 100,
                count: valid.length,
                currency: targetCurrency,
                source: "browse_api",
                rawComps: (filteredComps.length > 0 ? filteredComps : validBrowseItems).slice(0, 10),
                iqrBounds: { lower: lowerBound, upper: upperBound },
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[eBay Comps] Browse API warning:", err);
  }

  return null;
}
