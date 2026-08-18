import { CURRENCY_CONFIGS, SupportedCurrency } from "./currency-routing";

/**
 * Live eBay Regional 30-Day Sold Comps Fetcher
 * Queries live eBay sold comps (ebay.com.au, ebay.com, ebay.de, ebay.co.uk) to calculate accurate min, max, and median resale prices in target currency.
 */
export async function fetchEbayAustraliaSoldComps(
  productName: string,
  targetCurrency: SupportedCurrency = "AUD"
): Promise<{
  min: number;
  max: number;
  median: number;
  count: number;
  currency: SupportedCurrency;
} | null> {
  const keyword = encodeURIComponent(productName.trim());
  if (!keyword) return null;

  const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.AUD;
  const ebayDomain = config.ebaySite;

  // 1. Try API Sold Comps service if key is present
  if (process.env.SOLD_COMPS_API_KEY) {
    try {
      const url = `https://api.sold-comps.com/v1/scrape?keyword=${keyword}&ebaySite=${ebayDomain}&page=1&count=60&daysToScrape=30&sortOrder=endedRecently`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.SOLD_COMPS_API_KEY}` },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        const items = data?.items ?? [];
        const prices = items
          .map((i: any) => Number(i.soldPrice))
          .filter((n: number) => !Number.isNaN(n) && n > 0);

        if (prices.length > 0) {
          prices.sort((a: number, b: number) => a - b);
          const midIdx = Math.floor(prices.length / 2);
          const median = prices.length % 2 === 0 ? (prices[midIdx - 1] + prices[midIdx]) / 2 : prices[midIdx];
          return {
            min: Math.round(prices[0] * 100) / 100,
            max: Math.round(prices[prices.length - 1] * 100) / 100,
            median: Math.round(median * 100) / 100,
            count: prices.length,
            currency: targetCurrency,
          };
        }
      }
    } catch (err) {
      console.warn("[eBay Comps] Primary API sold comps warning:", err);
    }
  }

  // 2. Direct Regional eBay Public RSS/HTML Sold Comps Scraper
  try {
    const ebayRssUrl = `https://www.${ebayDomain}/sch/i.html?_nkw=${keyword}&LH_Sold=1&LH_Complete=1&_sop=13&_rss=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(ebayRssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timer);

    if (res && res.ok) {
      const html = await res.text().catch(() => "");
      // Regex match sold prices from regional eBay result HTML (e.g., "AU $45.00", "$120.50", "£45.00", "€60.00")
      const priceMatches = [...html.matchAll(/(?:AU\s*\$|US\s*\$|\$|£|€)\s*([0-9]+(?:\.[0-9]{2})?)/gi)];
      const prices = priceMatches
        .map((m) => parseFloat(m[1]))
        .filter((n) => !Number.isNaN(n) && n >= 5 && n <= 5000);

      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        // Trim extreme outliers (top 10% and bottom 10%)
        const trimCount = Math.floor(prices.length * 0.1);
        const validPrices = prices.slice(trimCount, prices.length - trimCount || prices.length);

        const midIdx = Math.floor(validPrices.length / 2);
        const median = validPrices.length % 2 === 0 ? (validPrices[midIdx - 1] + validPrices[midIdx]) / 2 : validPrices[midIdx];

        return {
          min: Math.round(validPrices[0] * 100) / 100,
          max: Math.round(validPrices[validPrices.length - 1] * 100) / 100,
          median: Math.round(median * 100) / 100,
          count: validPrices.length,
          currency: targetCurrency,
        };
      }
    }
  } catch (err) {
    console.warn("[eBay Comps] Public regional eBay scraper warning:", err);
  }

  return null;
}
