import { CURRENCY_CONFIGS, SupportedCurrency } from "@/app/lib/currency-routing";

export interface MarketplaceComparison {
  platformId: "ebay" | "depop" | "poshmark" | "mercari" | "facebook" | "google_shopping";
  name: string;
  tagline: string;
  icon: string; // Emoji / Icon identifier
  estimatedSalePrice: number;
  platformFeeRate: number; // e.g. 0.1325
  platformFeeAmount: number;
  estimatedShipping: number;
  netPayout: number;
  marginPercentage: number;
  isBestProfit: boolean;
  searchUrl: string;
  payoutBadge: string;
}

export interface OmniComparisonResult {
  query: string;
  currency: SupportedCurrency;
  currencySymbol: string;
  baseEstimatedPrice: number;
  marketplaces: MarketplaceComparison[];
  bestPlatform: MarketplaceComparison;
  spread: {
    maxNetPayout: number;
    minNetPayout: number;
    profitDifference: number;
  };
}

/**
 * Builds direct search URLs with "Sold / Completed" filters where supported
 */
export function buildMarketplaceCompUrl(
  platformId: MarketplaceComparison["platformId"],
  query: string,
  currency: SupportedCurrency = "AUD"
): string {
  const encoded = encodeURIComponent(query.trim());
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.AUD;

  switch (platformId) {
    case "ebay":
      // Direct link to Sold & Completed items on the region-specific eBay site
      return `https://www.${config.ebaySite}/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`;

    case "depop":
      // Depop global search
      return `https://www.depop.com/search/?q=${encoded}`;

    case "poshmark":
      // Poshmark sold comps filter
      return `https://poshmark.com/search?query=${encoded}&type=sold`;

    case "mercari":
      // Mercari search with items
      return `https://www.mercari.com/search/?keyword=${encoded}`;

    case "facebook":
      // Facebook Marketplace search
      return `https://www.facebook.com/marketplace/search/?query=${encoded}`;

    case "google_shopping":
      // Google Shopping price comparison search
      return `https://www.google.com/search?tbm=shop&q=${encoded}`;

    default:
      return `https://www.google.com/search?q=${encoded}`;
  }
}

/**
 * Calculates net payouts across 5 major resale channels and ranks by profitability
 */
export function calculateOmniMarketplaceComps(params: {
  productName: string;
  brand?: string | null;
  basePrice: number;
  currency?: SupportedCurrency;
  customCost?: number;
}): OmniComparisonResult {
  const { productName, brand, basePrice, customCost = 0 } = params;
  const currency = params.currency || "AUD";
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.AUD;
  const sym = config.symbol;

  const fullQuery = [brand, productName].filter(Boolean).join(" ").trim() || "Item";

  // Platform-specific typical sale price variation (e.g. Depop tends to fetch higher for vintage streetwear)
  const isVintageStreetwear = /\b(vintage|carhartt|nike|jordan|supreme|stussy|y2k|harley|band tee|90s|jacket|hoodie)\b/i.test(fullQuery);
  const isElectronics = /\b(camera|lens|sony|canon|nintendo|playstation|xbox|apple|iphone|ipod|gameboy)\b/i.test(fullQuery);

  const priceDepop = isVintageStreetwear ? Math.round(basePrice * 1.12) : Math.round(basePrice * 0.95);
  const pricePoshmark = isVintageStreetwear ? Math.round(basePrice * 1.05) : Math.round(basePrice * 0.9);
  const priceMercari = isElectronics ? Math.round(basePrice * 0.98) : Math.round(basePrice * 0.92);
  const priceFacebook = Math.round(basePrice * 0.88); // Local deals typically move slightly lower for quick cash

  // 1. eBay: 13.25% + $0.30 fixed fee + standard shipping deduction
  const ebayShipping = basePrice > 50 ? 12 : 9.5;
  const ebayFee = Math.round((basePrice * 0.1325 + 0.3) * 100) / 100;
  const ebayNet = Math.max(0, Math.round((basePrice - ebayFee - ebayShipping) * 100) / 100);

  // 2. Depop: ~10% marketplace fee + ~3% transaction fee, buyer often covers shipping on lightweight items
  const depopFee = Math.round((priceDepop * 0.10 + priceDepop * 0.033) * 100) / 100;
  const depopShipping = isVintageStreetwear ? 4 : 8; // Buyer pays majority on Depop
  const depopNet = Math.max(0, Math.round((priceDepop - depopFee - depopShipping) * 100) / 100);

  // 3. Poshmark: Flat $2.95 under $15, 20% over $15. Buyer pays 100% of flat shipping!
  const poshmarkFee = pricePoshmark < 15 ? 2.95 : Math.round(pricePoshmark * 0.20 * 100) / 100;
  const poshmarkNet = Math.max(0, Math.round((pricePoshmark - poshmarkFee) * 100) / 100);

  // 4. Mercari: 10% selling fee + 2.9% + $0.50 payment fee
  const mercariFee = Math.round((priceMercari * 0.10 + priceMercari * 0.029 + 0.50) * 100) / 100;
  const mercariShipping = 6.5;
  const mercariNet = Math.max(0, Math.round((priceMercari - mercariFee - mercariShipping) * 100) / 100);

  // 5. Facebook Marketplace: 0% fee for local cash meetup!
  const fbFee = 0;
  const fbShipping = 0;
  const fbNet = Math.max(0, priceFacebook);

  const rawPlatforms: Omit<MarketplaceComparison, "isBestProfit">[] = [
    {
      platformId: "ebay",
      name: "eBay",
      tagline: "Highest Buyer Traffic & Liquidity",
      icon: "🛍️",
      estimatedSalePrice: basePrice,
      platformFeeRate: 0.1325,
      platformFeeAmount: ebayFee,
      estimatedShipping: ebayShipping,
      netPayout: ebayNet,
      marginPercentage: basePrice > 0 ? Math.round(((ebayNet - customCost) / basePrice) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("ebay", fullQuery, currency),
      payoutBadge: "Fastest Sell-Through",
    },
    {
      platformId: "depop",
      name: "Depop",
      tagline: "Top Prices for Vintage & Streetwear",
      icon: "⚡",
      estimatedSalePrice: priceDepop,
      platformFeeRate: 0.10,
      platformFeeAmount: depopFee,
      estimatedShipping: depopShipping,
      netPayout: depopNet,
      marginPercentage: priceDepop > 0 ? Math.round(((depopNet - customCost) / priceDepop) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("depop", fullQuery, currency),
      payoutBadge: isVintageStreetwear ? "Streetwear Premium" : "Gen-Z Audience",
    },
    {
      platformId: "poshmark",
      name: "Poshmark",
      tagline: "Fashion & Shoes (Buyer Pays Shipping)",
      icon: "👗",
      estimatedSalePrice: pricePoshmark,
      platformFeeRate: 0.20,
      platformFeeAmount: poshmarkFee,
      estimatedShipping: 0,
      netPayout: poshmarkNet,
      marginPercentage: pricePoshmark > 0 ? Math.round(((poshmarkNet - customCost) / pricePoshmark) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("poshmark", fullQuery, currency),
      payoutBadge: "Zero Shipping Cost",
    },
    {
      platformId: "mercari",
      name: "Mercari",
      tagline: "General Collectibles & Electronics",
      icon: "📦",
      estimatedSalePrice: priceMercari,
      platformFeeRate: 0.10,
      platformFeeAmount: mercariFee,
      estimatedShipping: mercariShipping,
      netPayout: mercariNet,
      marginPercentage: priceMercari > 0 ? Math.round(((mercariNet - customCost) / priceMercari) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("mercari", fullQuery, currency),
      payoutBadge: "Great for Bundles",
    },
    {
      platformId: "facebook",
      name: "FB Marketplace",
      tagline: "Local Cash Meetup · 0% Selling Fees",
      icon: "🤝",
      estimatedSalePrice: priceFacebook,
      platformFeeRate: 0,
      platformFeeAmount: fbFee,
      estimatedShipping: fbShipping,
      netPayout: fbNet,
      marginPercentage: priceFacebook > 0 ? Math.round(((fbNet - customCost) / priceFacebook) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("facebook", fullQuery, currency),
      payoutBadge: "0% Fees (Cash in Hand)",
    },
  ];

  // Find max net payout
  const maxNet = Math.max(...rawPlatforms.map((p) => p.netPayout));
  const minNet = Math.min(...rawPlatforms.map((p) => p.netPayout));

  const platformsWithBest: MarketplaceComparison[] = rawPlatforms
    .map((p) => ({
      ...p,
      isBestProfit: p.netPayout === maxNet && maxNet > 0,
    }))
    .sort((a, b) => b.netPayout - a.netPayout);

  const bestPlatform = platformsWithBest[0];

  return {
    query: fullQuery,
    currency,
    currencySymbol: sym,
    baseEstimatedPrice: basePrice,
    marketplaces: platformsWithBest,
    bestPlatform,
    spread: {
      maxNetPayout: maxNet,
      minNetPayout: minNet,
      profitDifference: Math.round((maxNet - minNet) * 100) / 100,
    },
  };
}
