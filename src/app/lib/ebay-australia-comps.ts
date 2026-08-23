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

/**
 * Fetches real eBay AU price data for a product name.
 *
 * Priority:
 *   1. Paid sold-comps API (if SOLD_COMPS_API_KEY is set) — real 30-day sold data
 *   2. eBay Browse API (active listings) — real market prices, no seller approval needed
 *
 * Returns null if both sources fail, so the caller can label the price as "AI Estimate".
 */
export async function fetchEbayAustraliaSoldComps(
  productName: string,
  targetCurrency: SupportedCurrency = "AUD"
): Promise<EbayCompsResult | null> {
  // Normalise query — strip noise, cap at 4 core keywords for best eBay match coverage
  let queryText = productName
    .replace(/["']/g, "")
    .replace(/\b(model|item|authentic|genuine|used|pre-owned|tested|working|vintage)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = queryText.split(" ");
  if (words.length > 4) queryText = words.slice(0, 4).join(" ");
  if (!queryText) return null;

  const encodedQuery = encodeURIComponent(queryText);

  // ── 1. Paid sold-comps API (real 30-day sold data) ─────────────────────────
  if (process.env.SOLD_COMPS_API_KEY) {
    try {
      const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.AUD;
      const url = `https://api.sold-comps.com/v1/scrape?keyword=${encodedQuery}&ebaySite=${config.ebaySite}&page=1&count=60&daysToScrape=30&sortOrder=endedRecently`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

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

        if (prices.length > 0) {
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

  // ── 2. eBay Browse API — active listing price range ────────────────────────
  // Uses app-level client_credentials token (no user auth needed).
  // marketplaceId MUST be in the header, not the URL — critical for AU pricing.
  try {
    const appToken = await getEbayAppToken();
    if (appToken) {
      const marketplace = EBAY_MARKETPLACE[targetCurrency] || EBAY_MARKETPLACE.AUD;
      const env = (process.env.EBAY_ENVIRONMENT || "production").toLowerCase();
      const apiHost = env === "production" ? "api.ebay.com" : "api.sandbox.ebay.com";

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

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

        const prices: number[] = items
          .map((item: any) => Number(item.price?.value))
          .filter((n: number) => !isNaN(n) && n >= 3 && n <= 5000);

        if (prices.length >= 3) {
          prices.sort((a, b) => a - b);
          const valid = trimIqrOutliers(prices);
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
  } catch (err) {
    console.warn("[eBay Comps] Browse API warning:", err);
  }

  return null;
}
