"use server";

import { RadarAlert, RadarFilterOptions } from "@/types/radar";

export interface RawLocalListing {
  id: string;
  title: string;
  category: string;
  localPrice: number;
  estimatedMarketValue: number;
  distanceMiles: number;
  sourceUrl: string;
  imageUrl: string;
  marketplace: "Facebook Marketplace" | "Gumtree" | "OfferUp" | "Garage Sale" | "Craigslist";
}

const MOCK_LOCAL_FEED: RawLocalListing[] = [
  {
    id: "radar-1",
    title: "Nintendo Switch Console w/ Mario Kart 8 & Pro Controller",
    category: "Gaming",
    localPrice: 130,
    estimatedMarketValue: 290,
    distanceMiles: 3.2,
    sourceUrl: "https://facebook.com/marketplace",
    imageUrl: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=600&q=80",
    marketplace: "Facebook Marketplace",
  },
  {
    id: "radar-2",
    title: "Vintage 90s Nike Windbreaker Jacket (L)",
    category: "Streetwear",
    localPrice: 20,
    estimatedMarketValue: 110,
    distanceMiles: 1.8,
    sourceUrl: "https://gumtree.com.au",
    imageUrl: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80",
    marketplace: "Gumtree",
  },
  {
    id: "radar-3",
    title: "Sony PS5 DualSense Wireless Controller Midnight Black",
    category: "Gaming",
    localPrice: 25,
    estimatedMarketValue: 70,
    distanceMiles: 4.5,
    sourceUrl: "https://facebook.com/marketplace",
    imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80",
    marketplace: "Facebook Marketplace",
  },
  {
    id: "radar-4",
    title: "Canon AE-1 35mm Vintage Film Camera + 50mm Lens",
    category: "Cameras",
    localPrice: 50,
    estimatedMarketValue: 180,
    distanceMiles: 5.1,
    sourceUrl: "https://facebook.com/marketplace",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
    marketplace: "Garage Sale",
  },
  {
    id: "radar-5",
    title: "Bose Wave Music System IV Platinum White",
    category: "Audio",
    localPrice: 60,
    estimatedMarketValue: 240,
    distanceMiles: 2.4,
    sourceUrl: "https://gumtree.com.au",
    imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
    marketplace: "Gumtree",
  },
  {
    id: "radar-6",
    title: "Air Jordan 1 Retro High OG Chicago Size 10.5",
    category: "Sneakers",
    localPrice: 180,
    estimatedMarketValue: 480,
    distanceMiles: 6.8,
    sourceUrl: "https://facebook.com/marketplace",
    imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80",
    marketplace: "Facebook Marketplace",
  },
];

export async function scanRadarArbitrage(filters: RadarFilterOptions): Promise<RadarAlert[]> {
  const ebayFeeRate = 0.1325; // 13.25% eBay fee
  const estShipping = 12; // $12 average shipping cost

  const filteredAlerts: RadarAlert[] = [];

  for (const item of MOCK_LOCAL_FEED) {
    const fees = Math.round(item.estimatedMarketValue * ebayFeeRate * 100) / 100;
    const netProfit = Math.round((item.estimatedMarketValue - item.localPrice - fees - estShipping) * 100) / 100;
    const roiPct = item.localPrice > 0 ? Math.round((netProfit / item.localPrice) * 100) : 0;

    // Filter checks
    if (netProfit < filters.minProfit) continue;
    if (item.distanceMiles > filters.maxDistanceMiles) continue;
    if (
      filters.selectedCategory &&
      filters.selectedCategory !== "All" &&
      item.category !== filters.selectedCategory
    ) {
      continue;
    }

    const confidenceScore = Math.floor(Math.random() * 8) + 92; // 92% - 99% match
    const buyScript = `Hi! Is this "${item.title}" still available? I can pick it up today with $${item.localPrice} cash.`;

    filteredAlerts.push({
      id: item.id,
      title: item.title,
      category: item.category,
      localPrice: item.localPrice,
      estimatedMarketValue: item.estimatedMarketValue,
      potentialProfit: netProfit,
      roiPct,
      distanceMiles: item.distanceMiles,
      sourceUrl: item.sourceUrl,
      imageUrl: item.imageUrl,
      marketplace: item.marketplace,
      confidenceScore,
      status: "active",
      buyScript,
      created_at: new Date().toISOString(),
    });
  }

  return filteredAlerts;
}
