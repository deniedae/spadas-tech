"use server";

import { RadarAlert, RadarFilterOptions } from "@/types/radar";

const SOLD_COMPS_KEY = "sc_live_f893a2e791b34c02911b";

interface RealEbayItem {
  title: string;
  soldPrice: string;
  soldCurrency: string;
  imageUrl?: string;
  itemUrl?: string;
}

const SEARCH_CATEGORIES = [
  { keyword: "Nintendo Switch Console", category: "Gaming", marketplace: "Facebook Marketplace" as const },
  { keyword: "Vintage Nike Windbreaker", category: "Streetwear", marketplace: "Gumtree" as const },
  { keyword: "PS5 Controller DualSense", category: "Gaming", marketplace: "Facebook Marketplace" as const },
  { keyword: "Canon 35mm SLR Camera", category: "Cameras", marketplace: "Garage Sale" as const },
  { keyword: "Bose Wave Music System", category: "Audio", marketplace: "Gumtree" as const },
  { keyword: "Air Jordan 1 Retro High", category: "Sneakers", marketplace: "Facebook Marketplace" as const },
  { keyword: "Game Boy Color Console", category: "Gaming", marketplace: "Facebook Marketplace" as const },
  { keyword: "Seiko Automatic Diver Watch", category: "Watches", marketplace: "Gumtree" as const },
];

export async function scanRadarArbitrage(filters: RadarFilterOptions): Promise<RadarAlert[]> {
  const ebayFeeRate = 0.1325; // 13.25% eBay fee
  const estShipping = 12; // $12 average shipping cost

  // Helper to fetch median eBay sold price for a keyword
  const fetchMedianPrice = async (keyword: string): Promise<number> => {
    const keywordEnc = encodeURIComponent(keyword);
    const endpoint = `https://api.sold-comps.com/v1/scrape?keyword=${keywordEnc}&ebaySite=ebay.com.au&page=1&count=5&daysToScrape=30&sortOrder=endedRecently`;
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: "Bearer " + SOLD_COMPS_KEY },
        next: { revalidate: 1800 },
      });
      if (!res.ok) return 0;
      const scData = (await res.json()) as { items?: RealEbayItem[] };
      if (!scData.items || scData.items.length === 0) return 0;
      const prices = scData.items
        .map((i) => Number(i.soldPrice))
        .filter((n) => !Number.isNaN(n) && n > 0);
      if (prices.length === 0) return 0;
      prices.sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    } catch {
      return 0;
    }
  };

  // Fetch real local listings from configurable endpoint (set LOCAL_FEED_URL env var)
  const localFeedEndpoint = process.env.LOCAL_FEED_URL || "https://example.com/api/local-listings";
  let localListings: any[] = [];
  try {
    const resp = await fetch(localFeedEndpoint);
    if (resp.ok) {
      localListings = (await resp.json()) as any[];
    } else {
      console.warn("Failed to fetch local feed, falling back to empty list");
    }
  } catch (e) {
    console.error("Error fetching local listings:", e);
  }

  const realAlerts: RadarAlert[] = [];

  for (const item of localListings) {
    // Apply category filter if set
    if (filters.selectedCategory && filters.selectedCategory !== "All" && item.category !== filters.selectedCategory) {
      continue;
    }
    // Apply distance filter if set
    if (filters.maxDistanceMiles && item.distanceMiles > filters.maxDistanceMiles) {
      continue;
    }

    const medianPrice = await fetchMedianPrice(item.title);
    if (medianPrice === 0) continue; // skip if market value unavailable

    const localPrice = Number(item.localPrice);
    const fees = Math.round(medianPrice * ebayFeeRate * 100) / 100;
    const potentialProfit = Math.round((medianPrice - localPrice - fees - estShipping) * 100) / 100;
    const roiPct = localPrice > 0 ? Math.round((potentialProfit / localPrice) * 100) : 0;

    if (potentialProfit < filters.minProfit) continue;

    const confidenceScore = Math.floor(Math.random() * 7) + 93; // placeholder confidence
    const buyScript = `Hi! Is this "${item.title}" still available? I can pick it up today with $${localPrice} cash.`;

    realAlerts.push({
      id: `radar-real-${item.id}-${Date.now()}`,
      title: item.title,
      category: item.category,
      localPrice,
      estimatedMarketValue: Math.round(medianPrice * 100) / 100,
      potentialProfit,
      roiPct,
      distanceMiles: item.distanceMiles ?? 0,
      sourceUrl: item.sourceUrl ?? "",
      imageUrl: item.imageUrl ?? "",
      marketplace: item.marketplace ?? "Unknown",
      confidenceScore,
      status: "active",
      buyScript,
      created_at: new Date().toISOString(),
    });
  }

  return realAlerts;
}
