/**
 * Comps Evidence & Provenance Engine
 *
 * Decouples comps fetching and normalization from presentation.
 * Transforms raw sold/active marketplace data into a sober, inspectable
 * valuation evidence model with plain-English methodology and explicit uncertainty.
 */

import { fmtMoney } from "@/app/lib/listings";
import { isBulkOrLotTitle, cleanBrandText, cleanConditionText } from "@/lib/lens-utils";
import { APPLIANCE_FILTER_PATTERNS } from "@/app/lib/ebay-australia-comps";
import { calculateMarketplaceFees, getDomesticShippingRate } from "@/lib/fee-engine";
import { estimateThriftCost } from "@/lib/thrift-cop-engine";

export type NormalizedCompsSource =
  | "sold_comps"        // Real eBay completed/sold transaction comps
  | "active_asks"       // Real eBay active asking prices (0 completed sales on record)
  | "cached_sold"       // Cached sold transactions from previous check
  | "ai_estimate"       // Algorithmic / AI model baseline estimate
  | "insufficient_data";// Zero usable market data

export type EvidenceConfidenceTier =
  | "STRONG_EVIDENCE"   // >= 5 sold comps, good recency and condition match
  | "MODERATE_EVIDENCE" // 2 - 4 sold comps
  | "LIMITED_EVIDENCE"  // 1 sold comp or active asks only
  | "INSUFFICIENT_DATA";// 0 sold comps

export type SoberVerdict =
  | "STRONG_MARGIN"       // e.g. net profit >= $25 and ROI >= 100% with solid comps
  | "MODERATE_MARGIN"     // profitable with viable margin
  | "LOW_CONFIDENCE"      // high variance, 1 comp, or unverified model
  | "INSUFFICIENT_DATA"   // 0 sold comps
  | "LOW_MARGIN";         // minimal or negative net margin

export interface CleanCompRecord {
  id: string;
  title: string;
  price: number;
  formattedPrice: string;
  condition: string;
  soldDate: string;
  shippingIncluded?: boolean;
  shippingPrice?: number;
  url?: string;
  thumbnail?: string;
  matchPercentage: number;
  isActiveAsk: boolean;
  isUsComp?: boolean;
}

export interface CompsEvidence {
  sourceState: NormalizedCompsSource;
  sourceLabel: string;
  sourceBadge: string;
  isFallback: boolean;

  valuationTitle: string;
  hasUsableSoldData: boolean;
  estimatedValue: number;
  formattedValue: string;
  currency: string;
  currencySymbol: string;

  sampleSize: number;
  evidenceSubtitle: string;

  typicalRange: { min: number; max: number };
  typicalRangeFormatted: string;
  soldMedian: number;
  soldMedianFormatted: string;
  marketName: string;
  conditionMatch: string;
  evidenceWindowText: string;
  updatedText: string;

  confidenceTier: EvidenceConfidenceTier;
  confidenceLabel: string;

  soberVerdict: SoberVerdict;
  soberVerdictLabel: string;

  methodologySummary: string;
  methodologyDetails: {
    rawCount: number;
    cleanedCount: number;
    outliersTrimmed: number;
    lotsExcluded: number;
    partsExcluded: number;
    iqrApplied: boolean;
    conditionFiltered: boolean;
  };

  estimatedProfit?: number;
  cleanListings: CleanCompRecord[];
}

export interface EvaluateCompsOptions {
  rawComps?: any[];
  compsSource?: string;
  isCachedFallback?: boolean;
  targetTitle?: string;
  brand?: string | null;
  condition?: string;
  category?: string;
  currency?: string;
  timestamp?: number;
  estCost?: number;
  estimatedValue?: number;
  fallbackPrice?: number;
  isUsMarket?: boolean;
  copVerdict?: string;
  suggestedMin?: number;
  suggestedMax?: number;
}

function parseCompPrice(c: any): number {
  if (typeof c?.price === "number") return isNaN(c.price) ? 0 : c.price;
  if (typeof c?.price === "string") {
    const cleaned = c.price.replace(/^(aud|au|usd|us)?\s*\$+/i, "").trim().replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "Updated recently";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec < 60) return "Updated just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "Updated 1 minute ago";
  if (diffMin < 60) return `Updated ${diffMin} minutes ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "Updated 1 hour ago";
  if (diffHours < 24) return `Updated ${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function formatCurrencyAmount(val: number, currency = "AUD"): string {
  const rounded = Math.round(val);
  const prefix = currency === "USD" ? "$" : currency === "GBP" ? "£" : "A$";
  return `${prefix}${rounded.toLocaleString(currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "en-AU")}`;
}

export function evaluateCompsEvidence(options: EvaluateCompsOptions): CompsEvidence {
  const {
    rawComps = [],
    compsSource,
    isCachedFallback = false,
    targetTitle = "Scanned Item",
    brand,
    condition = "Used - Good",
    category,
    currency: rawCurrency = "AUD",
    isUsMarket = false,
    timestamp = Date.now(),
    estCost = 0,
    estimatedValue: rawEstimate = 0,
    fallbackPrice = 0,
    copVerdict: rawCopVerdict,
    suggestedMin: fallbackMin,
    suggestedMax: fallbackMax,
  } = options;

  const currency = isUsMarket ? "USD" : rawCurrency;
  const fallbackEstimate = rawEstimate || fallbackPrice || 0;

  const safeBrand = cleanBrandText(brand);
  const safeCondition = cleanConditionText(condition, "Used");
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "A$";
  const marketName = currency === "USD" ? "eBay US" : currency === "GBP" ? "eBay UK" : "eBay Australia";

  // 1. Separate valid comps from malformed inputs
  const rawList = (rawComps || []).filter((c) => c && (c.title || parseCompPrice(c) > 0));
  const rawCount = rawList.length;

  // 2. Separate active asks vs sold comps
  const isGlobalActiveSource =
    compsSource === "browse_api" ||
    (rawList.length > 0 &&
      rawList.every((c) => Boolean(c.isActiveAsk || c.is_active_ask || c.soldDate === "Active Ask")));

  // 3. Filter lots, bundles, bulk packs, and mismatched parts
  const isTargetLot = isBulkOrLotTitle(targetTitle);
  let lotsExcluded = 0;
  let partsExcluded = 0;

  const filteredLots = rawList.filter((c) => {
    if (isTargetLot) return true;
    if (isBulkOrLotTitle(c.title, targetTitle)) {
      lotsExcluded++;
      return false;
    }
    if (c.title) {
      const lower = c.title.toLowerCase();
      if (APPLIANCE_FILTER_PATTERNS.some((p) => p.test(lower))) {
        const isQuerySeeking = /\b(base|jug|filter|cord|spares|toaster|set|pack|case)\b/i.test(targetTitle);
        if (!isQuerySeeking) {
          partsExcluded++;
          return false;
        }
      }
    }
    return true;
  });

  const lotCleaned = filteredLots.length > 0 ? filteredLots : rawList;

  // 4. Outlier detection and trimming via Interquartile Range (IQR)
  const validPrices = lotCleaned
    .map((c) => parseCompPrice(c))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  let maxIqrPrice = Infinity;
  let minIqrPrice = 1;
  let iqrApplied = false;
  let outliersTrimmed = 0;

  if (validPrices.length >= 3) {
    const q1 = validPrices[Math.floor(validPrices.length * 0.25)];
    const q3 = validPrices[Math.floor(validPrices.length * 0.75)];
    const iqr = q3 - q1;
    if (iqr > 0) {
      maxIqrPrice = q3 + 1.5 * iqr;
      minIqrPrice = Math.max(1, q1 - 1.5 * iqr);
      iqrApplied = true;
    }
  }

  // Cap extreme single outliers at 2.2x median
  const medianP = validPrices.length > 0 ? validPrices[Math.floor(validPrices.length / 2)] : fallbackEstimate;
  if (medianP > 0) {
    maxIqrPrice = Math.min(maxIqrPrice, Math.round(medianP * 2.2 * 100) / 100);
  }

  const iqrCleaned = lotCleaned.filter((c) => {
    const p = parseCompPrice(c);
    if (!p) return true;
    const keep = p <= maxIqrPrice && p >= minIqrPrice;
    if (!keep) outliersTrimmed++;
    return keep;
  });

  const usableComps = iqrCleaned.length > 0 ? iqrCleaned : lotCleaned;

  // 5. Condition-Aware Sanitization (used items stripped of Brand New / Sealed comps)
  const isTargetUsed = !/\b(brand new|new with tags|nwt|sealed|bnib|nib)\b/i.test(safeCondition);
  let conditionFiltered = false;
  let finalCandidates = usableComps;

  if (isTargetUsed && usableComps.length >= 3) {
    const sealedRegex = /\b(brand new|sealed|factory sealed|shrink wrapped|bnib|nib|nwt|new in box|unopened)\b/i;
    const usedOnly = usableComps.filter((c) => !sealedRegex.test(c.title || ""));
    if (usedOnly.length >= 2) {
      conditionFiltered = true;
      finalCandidates = usedOnly;
    }
  }

  // 6. Map clean listings
  const cleanListings: CleanCompRecord[] = finalCandidates.slice(0, 10).map((c, idx) => {
    const isCompActiveAsk = Boolean(
      isGlobalActiveSource ||
        c.isActiveAsk ||
        c.is_active_ask ||
        c.soldDate === "Active Ask" ||
        c.sold_date === "Active Ask"
    );
    const dateStr = isCompActiveAsk ? "Active Ask" : c.soldDate || c.sold_date || "Recent sale";
    const priceVal = parseCompPrice(c) || fallbackEstimate;
    return {
      id: c.id || `comp-${idx}`,
      title: c.title || targetTitle,
      price: priceVal,
      formattedPrice: formatCurrencyAmount(priceVal, currency),
      condition: cleanConditionText(c.condition, safeCondition),
      soldDate: dateStr,
      shippingIncluded: Boolean(c.shippingIncluded ?? c.shipping_included),
      shippingPrice: c.shippingPrice || c.shipping_price || 0,
      url: c.url,
      thumbnail: c.thumbnail || c.imageUrl || c.image_url,
      matchPercentage: typeof c.matchPercentage === "number" ? c.matchPercentage : 90,
      isActiveAsk: isCompActiveAsk,
      isUsComp: Boolean(c.isUsComp),
    };
  });

  // 7. Calculate Statistical Metrics
  const prices = cleanListings.map((c) => c.price).filter((p) => p > 0).sort((a, b) => a - b);
  const sampleSize = cleanListings.length;

  let soldMedian = fallbackEstimate;
  let rangeMin = fallbackMin ?? fallbackEstimate;
  let rangeMax = fallbackMax ?? fallbackEstimate;

  if (prices.length > 0) {
    soldMedian = prices[Math.floor(prices.length / 2)];
    if (prices.length === 1) {
      rangeMin = Math.round(prices[0] * 0.9);
      rangeMax = Math.round(prices[0] * 1.1);
    } else {
      // 20th and 80th percentiles for clean typical range
      const lowIdx = Math.floor(prices.length * 0.2);
      const highIdx = Math.min(prices.length - 1, Math.ceil(prices.length * 0.8));
      rangeMin = prices[lowIdx];
      rangeMax = prices[highIdx];
    }
  }

  // Guarantee min <= median <= max
  rangeMin = Math.min(rangeMin, soldMedian);
  rangeMax = Math.max(rangeMax, soldMedian);

  // 8. Determine Normalized Source State
  let sourceState: NormalizedCompsSource;
  if (isCachedFallback || compsSource === "cached_last_check") {
    sourceState = "cached_sold";
  } else if (isGlobalActiveSource && sampleSize > 0) {
    sourceState = "active_asks";
  } else if (sampleSize > 0) {
    sourceState = "sold_comps";
  } else if (compsSource === "ai_estimate" && fallbackEstimate > 0) {
    sourceState = "ai_estimate";
  } else {
    sourceState = "insufficient_data";
  }

  // 9. Valuation Title & Provenance Subtitle
  let valuationTitle: string;
  let sourceLabel: string;
  let sourceBadge: string;
  let isFallback = false;
  let hasUsableSoldData = false;

  switch (sourceState) {
    case "sold_comps":
      valuationTitle = "Estimated resale value";
      sourceLabel = "Relevant sold listings support estimate";
      sourceBadge = "Sold comps";
      hasUsableSoldData = true;
      break;
    case "cached_sold":
      valuationTitle = "Estimated resale value (cached)";
      sourceLabel = "Cached sold data from previous check";
      sourceBadge = "Cached sold comps";
      isFallback = true;
      hasUsableSoldData = true;
      break;
    case "active_asks":
      valuationTitle = "Active asking-price reference";
      sourceLabel = "Live competitor asking prices (not sold value)";
      sourceBadge = "Active listings only";
      isFallback = true;
      break;
    case "ai_estimate":
      valuationTitle = "AI estimate (sold comps unavailable)";
      sourceLabel = "Algorithmic estimate (insufficient sold data)";
      sourceBadge = "AI estimate";
      isFallback = true;
      break;
    case "insufficient_data":
    default:
      valuationTitle = "Price undetermined";
      sourceLabel = "Not enough usable evidence to provide estimate";
      sourceBadge = "Insufficient data";
      isFallback = true;
      break;
  }

  const updatedText = formatRelativeTime(timestamp);
  const evidenceSubtitle = hasUsableSoldData
    ? `Based on ${sampleSize} sold listing${sampleSize === 1 ? "" : "s"} · ${updatedText}`
    : sourceState === "active_asks"
    ? `Based on ${sampleSize} active listing${sampleSize === 1 ? "" : "s"} · ${updatedText}`
    : sourceState === "ai_estimate"
    ? `AI estimate · sold comps unavailable · ${updatedText}`
    : `Insufficient data · ${updatedText}`;

  const evidenceWindowText = hasUsableSoldData
    ? `${sampleSize} sold listings · last 90 days`
    : sourceState === "active_asks"
    ? `${sampleSize} active listings · live market`
    : "0 sold listings · last 90 days";

  // 10. Evidence Quality & Sober Verdict
  let confidenceTier: EvidenceConfidenceTier;
  let confidenceLabel: string;

  if (sourceState === "insufficient_data" || sampleSize === 0) {
    confidenceTier = "INSUFFICIENT_DATA";
    confidenceLabel = "Insufficient sold data";
  } else if (sourceState === "active_asks" || sampleSize === 1) {
    confidenceTier = "LIMITED_EVIDENCE";
    confidenceLabel = "Limited evidence";
  } else if (sampleSize < 5) {
    confidenceTier = "MODERATE_EVIDENCE";
    confidenceLabel = "Moderate evidence";
  } else {
    confidenceTier = "STRONG_EVIDENCE";
    confidenceLabel = "Strong evidence";
  }

  // Sober Verdict: Strong margin, Moderate margin, Low confidence, Insufficient sold data, Low margin
  let soberVerdict: SoberVerdict;
  let soberVerdictLabel: string;

  const marketplaceFee = calculateMarketplaceFees(soldMedian, currency);
  const shippingRate = getDomesticShippingRate(category, targetTitle, undefined, currency).rate;
  const effectiveCost =
    typeof estCost === "number" && estCost > 0
      ? estCost
      : estimateThriftCost(category, currency);
  const estimatedProfit = Math.round((soldMedian - effectiveCost - marketplaceFee - shippingRate) * 100) / 100;

  if (sourceState === "insufficient_data" || sampleSize === 0) {
    soberVerdict = "INSUFFICIENT_DATA";
    soberVerdictLabel = "Insufficient sold data";
  } else if (confidenceTier === "LIMITED_EVIDENCE") {
    soberVerdict = "LOW_CONFIDENCE";
    soberVerdictLabel = "Low confidence";
  } else if (estimatedProfit <= 0 || rawCopVerdict === "PASS_RISKY") {
    soberVerdict = "LOW_MARGIN";
    soberVerdictLabel = "Low margin";
  } else if (estimatedProfit >= 25 && sampleSize >= 3) {
    soberVerdict = "STRONG_MARGIN";
    soberVerdictLabel = "Strong margin";
  } else {
    soberVerdict = "MODERATE_MARGIN";
    soberVerdictLabel = "Moderate margin";
  }

  // 11. Plain-English Methodology Line
  let methodologySummary: string;
  if (hasUsableSoldData) {
    const parts: string[] = [`Based on ${sampleSize} sold listings`];
    if (lotsExcluded > 0 || partsExcluded > 0) parts.push("duplicates/parts/lots removed");
    if (outliersTrimmed > 0 || iqrApplied) parts.push("outliers trimmed");
    methodologySummary = parts.join(" · ");
  } else if (sourceState === "active_asks") {
    methodologySummary = `Based on ${sampleSize} live asking listings · 0 completed sales on record · asking price guide only`;
  } else {
    methodologySummary = "Algorithmic baseline appraisal · zero completed sales on record";
  }

  return {
    sourceState,
    sourceLabel,
    sourceBadge,
    isFallback,
    valuationTitle,
    hasUsableSoldData,
    estimatedValue: sourceState === "insufficient_data" ? 0 : soldMedian,
    formattedValue: sourceState === "insufficient_data" ? "Price undetermined" : formatCurrencyAmount(soldMedian, currency),
    currency,
    currencySymbol,
    sampleSize,
    evidenceSubtitle,
    typicalRange: { min: rangeMin, max: rangeMax },
    typicalRangeFormatted: sourceState === "insufficient_data" ? "—" : `${formatCurrencyAmount(rangeMin, currency)}–${formatCurrencyAmount(rangeMax, currency)}`,
    soldMedian: sourceState === "insufficient_data" ? 0 : soldMedian,
    soldMedianFormatted: sourceState === "insufficient_data" ? "—" : formatCurrencyAmount(soldMedian, currency),
    marketName,
    conditionMatch: safeCondition,
    evidenceWindowText,
    updatedText,
    confidenceTier,
    confidenceLabel,
    soberVerdict,
    soberVerdictLabel,
    methodologySummary,
    methodologyDetails: {
      rawCount,
      cleanedCount: sampleSize,
      outliersTrimmed,
      lotsExcluded,
      partsExcluded,
      iqrApplied,
      conditionFiltered,
    },
    estimatedProfit: sourceState === "insufficient_data" ? 0 : estimatedProfit,
    cleanListings,
  };
}
