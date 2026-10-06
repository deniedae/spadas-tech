import { NextResponse } from "next/server";
import {
  fetchEbayAustraliaSoldComps,
  sanitizeTitleForBroadening,
  extractPackMultiplier,
  isMultiPackOrLot,
  applyTightClusterSanityGuard,
  calcMedian,
  EbayCompsResult,
  EbaySoldCompItem,
} from "@/app/lib/ebay-australia-comps";
import { SupportedCurrency, detectGeoCurrency } from "@/app/lib/currency-routing";
import { estimateAustralianMarketValue } from "@/lib/valuation-heuristics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || url.searchParams.get("query") || url.searchParams.get("title") || "";
    const brand = url.searchParams.get("brand") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const condition = url.searchParams.get("condition") || undefined;

    const countryHeader = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry");
    const detectedCurrency = detectGeoCurrency(countryHeader).currency;
    const currency = (url.searchParams.get("currency") as SupportedCurrency) || detectedCurrency || "AUD";

    return await handleCompsSearch(query, brand, category, condition, currency);
  } catch (err: any) {
    console.error("[api/ebay-australia-comps GET] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || body.title || body.searchTitle || body.productName || "";
    const brand = body.brand || undefined;
    const category = body.category || undefined;
    const condition = body.condition || undefined;

    const countryHeader = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry");
    const detectedCurrency = detectGeoCurrency(countryHeader).currency;
    const currency = (body.currency as SupportedCurrency) || detectedCurrency || "AUD";

    return await handleCompsSearch(query, brand, category, condition, currency);
  } catch (err: any) {
    console.error("[api/ebay-australia-comps POST] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

async function handleCompsSearch(
  query: string,
  brand?: string,
  category?: string,
  condition?: string,
  currency: SupportedCurrency = "AUD"
) {
  const trimmed = (query || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Search query or title is required" }, { status: 400 });
  }

  let attemptTier: "exact" | "broadened" | "us_fallback" | "synthetic" = "exact";
  let queryUsed = trimmed;

  // ── ATTEMPT 1: Full identified query (Exact Title) ──
  let compsResult: EbayCompsResult | null = await fetchEbayAustraliaSoldComps(
    trimmed,
    currency,
    brand,
    category,
    condition
  );

  // ── ATTEMPT 2: If 0 sold comps: Strip stop-words & descriptors ──
  if (!compsResult || compsResult.count === 0) {
    const broadenedQuery = sanitizeTitleForBroadening(trimmed, brand);
    if (broadenedQuery && broadenedQuery.toLowerCase() !== trimmed.toLowerCase()) {
      queryUsed = broadenedQuery;
      attemptTier = "broadened";
      compsResult = await fetchEbayAustraliaSoldComps(
        broadenedQuery,
        currency,
        brand,
        category,
        condition
      );
    }
  }

  // ── ATTEMPT 3: Cross-border US fallback (LH_PrefLoc=2 with $25 AUD penalty) ──
  // Note: fetchEbayAustraliaSoldComps natively queries US with crossBorderShippingCost: 25 if AU has 0 comps.
  if (compsResult && compsResult.isUsMarketOnly) {
    attemptTier = "us_fallback";
  } else if (compsResult && compsResult.isActiveAskOnly) {
    attemptTier = "broadened";
  }

  // ── RULE: 0 Sold Comps + 0 Active Listings ──
  // Never fabricate prices, net profit, or verdicts.
  // Category benchmarks may only show as a muted hint: "Similar brands often sell for $X–$Y — verify on eBay"
  let categoryHint: string | null = null;
  const isZeroMarketData = Boolean(
    !compsResult ||
    compsResult.noMarketData ||
    (compsResult.count === 0 && !compsResult.isActiveAskOnly)
  );

  if (isZeroMarketData) {
    const catEstimate = estimateAustralianMarketValue({
      title: trimmed,
      brand,
      category,
      condition,
    });
    categoryHint = `Similar brands often sell for $${catEstimate.minPrice}–$${catEstimate.maxPrice} — verify on eBay`;
  }

  // ── RETAIL CAP & PRICE-BAND SANITY GUARD (Multi-Pack & Pack-Size Normalizer) ──
  const isQueryMultiPack = /\b(pack|lot|bundle|set|box|bulk|\d+x|\d+\s*pk)\b/i.test(trimmed);

  if (!isZeroMarketData && compsResult && compsResult.rawComps && compsResult.rawComps.length > 0) {
    let processedComps: EbaySoldCompItem[] = [];

    for (const comp of compsResult.rawComps) {
      if (!isQueryMultiPack && !comp.isNormalized) {
        const multiplier = extractPackMultiplier(comp.title);
        if (multiplier && multiplier >= 2) {
          // Normalize unit price: e.g. $51.20 / 6 = $8.53
          processedComps.push({
            ...comp,
            price: Math.round((comp.price / multiplier) * 100) / 100,
            isNormalized: true,
            packMultiplier: multiplier,
            originalMultiPrice: comp.price,
          });
          continue;
        } else if (isMultiPackOrLot(comp.title)) {
          // Discard unquantified bulk lots/bundles from single-item medians
          continue;
        }
      }
      processedComps.push(comp);
    }

    if (processedComps.length >= 2) {
      const sanityCheck = applyTightClusterSanityGuard(processedComps, isQueryMultiPack);
      if (sanityCheck.appliedGuard) {
        processedComps = sanityCheck.filteredComps;
      }
    }

    if (processedComps.length > 0) {
      processedComps.sort((a, b) => a.price - b.price);
      const prices = processedComps.map((c) => c.price);
      compsResult.min = prices[0];
      compsResult.max = prices[prices.length - 1];
      compsResult.median = Math.round(calcMedian(prices) * 100) / 100;
      if (!compsResult.isActiveAskOnly) {
        compsResult.count = processedComps.length;
      }
      compsResult.rawComps = processedComps;
    }
  }

  const finalComps = isZeroMarketData ? [] : (compsResult?.rawComps || []);
  const finalCount = isZeroMarketData ? 0 : (compsResult?.count || 0);
  const activeCount = isZeroMarketData ? 0 : (compsResult?.activeListingsCount || (compsResult?.isActiveAskOnly ? finalComps.length : 0));
  const activeComps = isZeroMarketData ? [] : (compsResult?.activeComps || []);
  const recommendedPrice = isZeroMarketData ? 0 : (compsResult?.recommendedPrice || compsResult?.median || 0);

  return NextResponse.json({
    success: true,
    productName: trimmed,
    queryUsed,
    attemptTier,
    comps: finalComps,
    rawComps: finalComps,
    compsCount: finalCount,
    soldCount: finalCount,
    soldMedian: isZeroMarketData ? 0 : (compsResult?.soldMedian || compsResult?.median || 0),
    soldMin: isZeroMarketData ? 0 : (compsResult?.soldMin || compsResult?.min || 0),
    soldMax: isZeroMarketData ? 0 : (compsResult?.soldMax || compsResult?.max || 0),
    activeCount,
    activeComps,
    activeMedian: isZeroMarketData ? 0 : (compsResult?.activeMedian || 0),
    activeMin: isZeroMarketData ? 0 : (compsResult?.activeMin || 0),
    activeMax: isZeroMarketData ? 0 : (compsResult?.activeMax || 0),
    recommendedPrice,
    isActiveAskOnly: Boolean(compsResult?.isActiveAskOnly),
    noMarketData: isZeroMarketData,
    minPrice: isZeroMarketData ? 0 : (compsResult?.min || 0),
    maxPrice: isZeroMarketData ? 0 : (compsResult?.max || 0),
    median: isZeroMarketData ? 0 : (compsResult?.median || 0),
    currency: compsResult?.currency || currency,
    isUsMarketOnly: Boolean(compsResult?.isUsMarketOnly),
    crossBorderShippingCost: compsResult?.crossBorderShippingCost || 0,
    arbitrageSignal: isZeroMarketData
      ? "Not enough market data to value this item"
      : (compsResult?.arbitrageSignal || (compsResult?.isActiveAskOnly ? "Currently listed — not sold prices." : undefined)),
    categoryHint,
  });
}
