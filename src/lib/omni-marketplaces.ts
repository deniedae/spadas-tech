import { CURRENCY_CONFIGS, SupportedCurrency, convertCurrency } from "@/app/lib/currency-routing";

export interface MarketplaceComparison {
  platformId: "ebay" | "depop" | "gumtree" | "facebook" | "google_shopping";
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
  platformId: "ebay" | "depop" | "gumtree" | "facebook" | "google_shopping",
  query: string,
  currency: SupportedCurrency = "USD"
): string {
  const encoded = encodeURIComponent(query.trim());

  switch (platformId) {
    case "ebay": {
      // Dynamic eBay marketplace routing based on currency (defaults to US)
      let domain = "www.ebay.com";
      if (currency === "AUD") domain = "www.ebay.com.au";
      else if (currency === "GBP") domain = "www.ebay.co.uk";
      else if (currency === "EUR") domain = "www.ebay.de";
      return `https://${domain}/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`;
    }

    case "depop":
      // Depop search query
      return `https://www.depop.com/search/?q=${encoded}`;

    case "gumtree":
      // Gumtree Australia local search
      return `https://www.gumtree.com.au/s-k0?q=${encoded}`;

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
  baseCurrency?: SupportedCurrency | string;
  currency?: SupportedCurrency;
  customCost?: number;
}): OmniComparisonResult {
  const { productName, brand, customCost = 0 } = params;
  const currency = params.currency || "USD";
  const baseCurrency = (params.baseCurrency || "USD") as SupportedCurrency;
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const sym = config.symbol;

  // Accurately convert basePrice to target currency if different
  const basePrice = baseCurrency !== currency
    ? convertCurrency(params.basePrice, baseCurrency, currency)
    : params.basePrice;

  const effectiveCost = baseCurrency !== currency && customCost > 0
    ? convertCurrency(customCost, baseCurrency, currency)
    : customCost;

  const fullQuery = [brand, productName].filter(Boolean).join(" ").trim() || "Item";

  // Platform-specific typical sale price variation (e.g. Depop tends to fetch higher for vintage streetwear)
  const isVintageStreetwear = /\b(vintage|carhartt|nike|jordan|supreme|stussy|y2k|harley|band tee|90s|jacket|hoodie)\b/i.test(fullQuery);
  const isElectronics = /\b(camera|lens|sony|canon|nintendo|playstation|xbox|apple|iphone|ipod|gameboy)\b/i.test(fullQuery);

  const priceDepop = isVintageStreetwear ? Math.round(basePrice * 1.12) : Math.round(basePrice * 0.95);
  const priceGumtree = isElectronics ? Math.round(basePrice * 0.92) : Math.round(basePrice * 0.88);
  const priceFacebook = Math.round(basePrice * 0.88); // Local deals typically move slightly lower for quick cash

  const isUK = currency === "GBP";
  const isUS = currency === "USD";

  // 1. eBay: Domestic marketplace fee & postage calculation
  const ebayFeeRate = isUK ? 0.128 : isUS ? 0.1325 : 0.134;
  const fixedFee = isUK ? 0.30 : isUS ? 0.30 : 0.33;
  const rawEbayShipping = basePrice > 50 ? 12 : 9.5;
  const ebayShipping = isUK ? 3.49 : isUS ? 4.80 : (currency === "AUD" ? rawEbayShipping : convertCurrency(rawEbayShipping, "AUD", currency));
  const ebayFee = Math.round((basePrice * ebayFeeRate + fixedFee) * 100) / 100;
  const ebayNet = Math.max(0, Math.round((basePrice - ebayFee - ebayShipping) * 100) / 100);

  // 2. Apparel channel (Vinted in UK with 0% fees, Depop in AU/US with 10% fee)
  const fashionFeeRate = isUK ? 0.0 : 0.10;
  const depopFee = Math.round((priceDepop * fashionFeeRate + (isUK ? 0 : priceDepop * 0.033)) * 100) / 100;
  const depopShipping = isUK ? 0 : (isVintageStreetwear ? 4 : 8); // Buyer pays on Vinted
  const depopNet = Math.max(0, Math.round((priceDepop - depopFee - depopShipping) * 100) / 100);

  // 3. Classifieds (Gumtree UK/AU, Mercari US)
  const gumtreeFee = 0;
  const gumtreeShipping = 0;
  const gumtreeNet = Math.max(0, priceGumtree);

  // 4. Facebook Marketplace (0% local cash meetup)
  const fbFee = 0;
  const fbShipping = 0;
  const fbNet = Math.max(0, priceFacebook);

  const rawPlatforms: Omit<MarketplaceComparison, "isBestProfit">[] = [
    {
      platformId: "ebay",
      name: isUK ? "eBay UK" : isUS ? "eBay US" : "eBay Australia",
      tagline: isUK ? "Highest Buyer Traffic & Liquidity in UK" : isUS ? "Highest Buyer Traffic & Liquidity in US" : "Highest Buyer Traffic & Liquidity in AU",
      icon: "🛍️",
      estimatedSalePrice: basePrice,
      platformFeeRate: ebayFeeRate,
      platformFeeAmount: ebayFee,
      estimatedShipping: ebayShipping,
      netPayout: ebayNet,
      marginPercentage: basePrice > 0 ? Math.round(((ebayNet - customCost) / basePrice) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("ebay", fullQuery, currency),
      payoutBadge: "Fastest Sell-Through",
    },
    {
      platformId: "depop",
      name: isUK ? "Vinted UK" : isUS ? "Depop US" : "Depop AU",
      tagline: isUK ? "0% Seller Fees · Enormous UK Apparel Audience" : "Top Prices for Vintage & Y2K Streetwear",
      icon: isUK ? "👗" : "⚡",
      estimatedSalePrice: priceDepop,
      platformFeeRate: fashionFeeRate,
      platformFeeAmount: depopFee,
      estimatedShipping: depopShipping,
      netPayout: depopNet,
      marginPercentage: priceDepop > 0 ? Math.round(((depopNet - customCost) / priceDepop) * 100) : 0,
      searchUrl: isUK ? `https://www.vinted.co.uk/catalog?search_text=${encodeURIComponent(fullQuery)}` : buildMarketplaceCompUrl("depop", fullQuery, currency),
      payoutBadge: isUK ? "0% Seller Fees" : isVintageStreetwear ? "Streetwear Premium" : "Gen-Z Audience",
    },
    {
      platformId: "gumtree",
      name: isUK ? "Gumtree UK" : isUS ? "Mercari US" : "Gumtree AU",
      tagline: "Local Classifieds · Free Listing · 0% Fees",
      icon: "🌿",
      estimatedSalePrice: priceGumtree,
      platformFeeRate: 0,
      platformFeeAmount: gumtreeFee,
      estimatedShipping: gumtreeShipping,
      netPayout: gumtreeNet,
      marginPercentage: priceGumtree > 0 ? Math.round(((gumtreeNet - customCost) / priceGumtree) * 100) : 0,
      searchUrl: isUK ? `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(fullQuery)}` : isUS ? `https://www.mercari.com/search/?keyword=${encodeURIComponent(fullQuery)}` : buildMarketplaceCompUrl("gumtree", fullQuery, currency),
      payoutBadge: "0% Fees (Cash in Hand)",
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
      payoutBadge: "Instant Local Buyers",
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
