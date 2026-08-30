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

function trimIqrOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = prices.filter(
    (p) => p >= Math.max(3, q1 - 1.5 * iqr) && p <= q3 + 1.5 * iqr
  );
  return filtered.length >= 2 ? filtered : prices;
}

function calcMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export type CompsSource = "browse_api" | "sold_comps_api" | "ai_estimate";

export interface EbayCompsResult {
  min: number;
  max: number;
  median: number;
  count: number;
  currency: SupportedCurrency;
  source: CompsSource;
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
          const prices: number[] = (data?.items ?? [])
            .map((i: any) => Number(i.soldPrice))
            .filter((n: number) => !isNaN(n) && n > 0);

          if (prices.length >= 2) {
            prices.sort((a, b) => a - b);
            const valid = trimIqrOutliers(prices);
            return {
              min: Math.round(valid[0] * 100) / 100,
              max: Math.round(valid[valid.length - 1] * 100) / 100,
              median: Math.round(calcMedian(valid) * 100) / 100,
              count: valid.length,
              currency: targetCurrency,
              source: "sold_comps_api",
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

      const isLuxury = /\b(prada|gucci|louis vuitton|chanel|dior|bottega|saint laurent|ysl|hermes|celine|balenciaga|burberry)\b/i.test(productName);

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

            const isQueryMultiPack = /\b(pack|lot|bundle|set|box|bulk|\d+x|\d+\s*pk)\b/i.test(productName);

            // Filter out unrelated low-value noise (e.g. empty box, dust bag only, replacement strap)
            const filteredItems = items.filter((item: any) => {
              const title = (item.title || "").toLowerCase();
              const price = Number(item.price?.value) || 0;

              // If luxury, filter out boxes/dustbags and items under $25 (likely knockoffs or accessories)
              if (isLuxury) {
                if (price < 20) return false;
                if (/\b(box only|empty box|dustbag only|dust bag only|paper bag|paperbag|ribbon|shopping bag|authenticity card only|care booklet)\b/i.test(title)) {
                  return false;
                }
              }

              if (!isQueryMultiPack) {
                if (/\b(\d+\s*pack|\d+\s*pk|\d+\s*pcs|\d+\s*pieces|pack of \d+|box of \d+|tray of|lot of \d+|\d+x\b|carton of|wholesale)\b/i.test(title)) {
                  return false;
                }
              }

              return true;
            });

            const rawPrices: number[] = filteredItems
              .map((item: any) => (Number(item.price?.value) || 0) * fxMultiplier)
              .filter((n: number) => !isNaN(n) && n >= (isLuxury ? 35 : 1) && n <= 10000);

            if (rawPrices.length >= 2) {
              rawPrices.sort((a, b) => a - b);
              const valid = trimIqrOutliers(rawPrices);
              return {
                min: Math.round(valid[0] * 100) / 100,
                max: Math.round(valid[valid.length - 1] * 100) / 100,
                median: Math.round(calcMedian(valid) * 100) / 100,
                count: valid.length,
                currency: targetCurrency,
                source: "browse_api",
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
