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

    case "gumtree": {
      if (currency === "USD") {
        return `https://www.mercari.com/search/?keyword=${encoded}`;
      } else if (currency === "GBP") {
        return `https://www.gumtree.com/search?search_category=all&q=${encoded}`;
      }
      return `https://www.gumtree.com.au/s-k0?q=${encoded}`;
    }

    case "facebook":
      return `https://www.facebook.com/marketplace/search/?query=${encoded}`;

    case "google_shopping": {
      const gl = currency === "USD" ? "us" : currency === "GBP" ? "gb" : "au";
      const hl = currency === "USD" ? "en-US" : currency === "GBP" ? "en-GB" : "en-AU";
      return `https://www.google.com/search?tbm=shop&q=${encoded}&gl=${gl}&hl=${hl}`;
    }

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

  const isUK = currency === "GBP";
  const isUS = currency === "USD";

  // 1. eBay: Official domestic seller fee (13.4% + $0.33 AU, 13.25% + $0.30 US, 12.8% + £0.30 UK) + standard tracked shipping
  const ebayFeeRate = isUK ? 0.128 : isUS ? 0.1325 : 0.134;
  const fixedFee = isUK ? 0.30 : isUS ? 0.30 : 0.33;
  const rawEbayShipping = basePrice > 50 ? 12 : 9.5;
  const ebayShipping = isUK ? 3.49 : isUS ? 4.80 : (currency === "AUD" ? rawEbayShipping : convertCurrency(rawEbayShipping, "AUD", currency));
  const ebayFee = Math.round((basePrice * ebayFeeRate + fixedFee) * 100) / 100;
  const ebayNet = Math.max(0, Math.round((basePrice - ebayFee - ebayShipping) * 100) / 100);

  // 2. Apparel channel (Vinted in UK with 0% seller fee, Depop in AU/US with 10% fee)
  const fashionFeeRate = isUK ? 0.0 : 0.10;
  const depopFee = Math.round((basePrice * fashionFeeRate + (isUK ? 0 : basePrice * 0.033)) * 100) / 100;
  const depopShipping = isUK ? 0 : (isUS ? 4.50 : 8.00); // Buyer pays postage on Vinted
  const depopNet = Math.max(0, Math.round((basePrice - depopFee - depopShipping) * 100) / 100);

  // 3. Classifieds (Gumtree UK/AU, Mercari US)
  const mercariFee = isUS ? Math.round(basePrice * 0.10 * 100) / 100 : 0;
  const gumtreeNet = Math.max(0, Math.round((basePrice - mercariFee) * 100) / 100);

  // 4. Facebook Marketplace (0% local cash meetup)
  const fbFee = 0;
  const fbShipping = 0;
  const fbNet = Math.max(0, basePrice);

  const rawPlatforms: Omit<MarketplaceComparison, "isBestProfit">[] = [
    {
      platformId: "ebay",
      name: isUK ? "eBay UK" : isUS ? "eBay US" : "eBay Australia",
      tagline: isUK ? "Official 12.8% Fee · Highest Liquidity & Buyer Traffic" : isUS ? "Official 13.25% Fee · Largest Resale Audience" : "Official 13.4% Fee · Maximum Verified Sales Volume",
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
      tagline: isUK ? "0% Seller Fees · Enormous UK Apparel Audience" : "10% Seller Fee · Curated Streetwear & Vintage",
      icon: isUK ? "👗" : "⚡",
      estimatedSalePrice: basePrice,
      platformFeeRate: fashionFeeRate,
      platformFeeAmount: depopFee,
      estimatedShipping: depopShipping,
      netPayout: depopNet,
      marginPercentage: basePrice > 0 ? Math.round(((depopNet - customCost) / basePrice) * 100) : 0,
      searchUrl: isUK ? `https://www.vinted.co.uk/catalog?search_text=${encodeURIComponent(fullQuery)}` : buildMarketplaceCompUrl("depop", fullQuery, currency),
      payoutBadge: isUK ? "0% Seller Fees" : "Streetwear Audience",
    },
    {
      platformId: "gumtree",
      name: isUK ? "Gumtree UK" : isUS ? "Mercari US" : "Gumtree AU",
      tagline: isUS ? "10% Selling Fee · Ship Nationwide" : "0% Listing Fees · Local Pick-up & Cash in Hand",
      icon: "🌿",
      estimatedSalePrice: basePrice,
      platformFeeRate: isUS ? 0.10 : 0,
      platformFeeAmount: mercariFee,
      estimatedShipping: 0,
      netPayout: gumtreeNet,
      marginPercentage: basePrice > 0 ? Math.round(((gumtreeNet - customCost) / basePrice) * 100) : 0,
      searchUrl: isUK ? `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(fullQuery)}` : isUS ? `https://www.mercari.com/search/?keyword=${encodeURIComponent(fullQuery)}` : buildMarketplaceCompUrl("gumtree", fullQuery, currency),
      payoutBadge: isUS ? "Nationwide Shipping" : "0% Fees (Cash in Hand)",
    },
    {
      platformId: "facebook",
      name: "FB Marketplace",
      tagline: "0% Fees · Local Cash In Hand · Immediate Buyer Meetup",
      icon: "🤝",
      estimatedSalePrice: basePrice,
      platformFeeRate: 0,
      platformFeeAmount: fbFee,
      estimatedShipping: fbShipping,
      netPayout: fbNet,
      marginPercentage: basePrice > 0 ? Math.round(((fbNet - customCost) / basePrice) * 100) : 0,
      searchUrl: buildMarketplaceCompUrl("facebook", fullQuery, currency),
      payoutBadge: "0% Fees (Local Cash)",
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
