export interface RadarAlert {
  id: string;
  title: string;
  category: string;
  localPrice: number;
  estimatedMarketValue: number;
  potentialProfit: number;
  roiPct: number;
  distanceMiles: number;
  sourceUrl: string;
  imageUrl: string;
  marketplace: "Facebook Marketplace" | "Gumtree" | "OfferUp" | "Garage Sale" | "Craigslist";
  confidenceScore: number;
  status: "active" | "dismissed" | "purchased";
  buyScript: string;
  created_at: string;
}

export interface RadarFilterOptions {
  maxDistanceMiles: number;
  minProfit: number;
  selectedCategory: string;
}
