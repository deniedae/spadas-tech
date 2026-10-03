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
import { SupportedCurrency } from "@/app/lib/currency-routing";
import { estimateAustralianMarketValue } from "@/lib/valuation-heuristics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || url.searchParams.get("query") || url.searchParams.get("title") || "";
    const brand = url.searchParams.get("brand") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const condition = url.searchParams.get("condition") || undefined;
    const currency = (url.searchParams.get("currency") as SupportedCurrency) || "AUD";

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
    const currency = (body.currency as SupportedCurrency) || "AUD";

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
  // If compsResult was found from US, mark tier
  if (compsResult && compsResult.isUsMarketOnly) {
    attemptTier = "us_fallback";
  }

  // Fallback: If still null or 0 comps, provide intelligent Australian category valuation
  // rather than a dead-end or faking mock $30 comps.
  let categoryEstimate: any = null;
  if (!compsResult || compsResult.count === 0) {
    categoryEstimate = estimateAustralianMarketValue({
      title: trimmed,
      brand,
      category,
      condition,
    });
    compsResult = {
      min: categoryEstimate.minPrice,
      max: categoryEstimate.maxPrice,
      median: categoryEstimate.estimatedMedian,
      count: 0, // Real 0 comps count so UI knows it's an intelligent estimate, not fabricated sales
      currency,
      source: "category_valuation",
      isUsMarketOnly: false,
      arbitrageSignal: `No recent direct eBay AU sales. Estimated from Australian secondary market category trends: ${categoryEstimate.resaleAdvice}`,
      rawComps: [],
    };
    attemptTier = "synthetic";
  }

  // ── RETAIL CAP & PRICE-BAND SANITY GUARD (Multi-Pack & Pack-Size Normalizer) ──
  const isQueryMultiPack = /\b(pack|lot|bundle|set|box|bulk|\d+x|\d+\s*pk)\b/i.test(trimmed);

  if (compsResult && compsResult.rawComps && compsResult.rawComps.length > 0) {
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
      compsResult.count = processedComps.length;
      compsResult.rawComps = processedComps;
    }
  }

  return NextResponse.json({
    success: true,
    productName: trimmed,
    queryUsed,
    attemptTier,
    comps: compsResult?.rawComps || [],
    rawComps: compsResult?.rawComps || [],
    compsCount: compsResult?.count || 0,
    minPrice: compsResult?.min || 0,
    maxPrice: compsResult?.max || 0,
    median: compsResult?.median || 0,
    currency: compsResult?.currency || currency,
    isUsMarketOnly: Boolean(compsResult?.isUsMarketOnly),
    crossBorderShippingCost: compsResult?.crossBorderShippingCost || 0,
    arbitrageSignal: compsResult?.arbitrageSignal,
    isCategoryEstimate: Boolean(categoryEstimate),
    categoryTier: categoryEstimate?.categoryTier || null,
    typicalOpShopCost: categoryEstimate?.typicalOpShopCost || null,
  });
}
