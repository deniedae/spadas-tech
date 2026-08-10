import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkUserUsage } from "@/app/lib/usage";
import type { AiListingResult } from "@/types/ai-listing";

export const preferredRegion = "syd1";

const SOLD_COMPS_KEY = process.env.SOLD_COMPS_API_KEY;
const SERPAPI_KEY = "837f35e9709091f977c567789f8368b8263b49c1620ed4d47b7aa3825cd0591f";

export interface SourcingVerdict {
  identification: {
    product_name: string;
    brand: string | null;
    category: string;
    condition: string;
    confidence: "high" | "medium" | "low";
    confidence_score: number;
  };
  market_prices: {
    suggested_median: number;
    suggested_min: number;
    suggested_max: number;
    sample_size: number;
    currency: string;
  };
  cost: number;
  fees: {
    marketplace_fee: number;
    payment_fee: number;
    shipping_estimated: number;
  };
  profit: {
    gross: number;
    net: number;
    margin_pct: number;
    roi_pct: number;
  };
  verdict: "buy" | "caution" | "pass";
  verdict_reason: string;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function estimateFees(salePrice: number, shipping: number) {
  const marketplaceFee = Math.round(salePrice * 0.1325 * 100) / 100;
  const paymentFee = Math.round((salePrice + shipping) * 0.027 * 100) / 100;
  return { marketplace_fee: marketplaceFee, payment_fee: paymentFee };
}

// 1. Primary Scraper with 2500ms Circuit Breaker Timeout
async function fetchPrimaryComps(keyword: string): Promise<Array<{ title?: string; condition?: string; soldPrice: number; soldCurrency: string }>> {
  const host = "api" + "." + "sold-comps" + "." + "com";
  const path = "/v1/scrape";
  const scEndpoint =
    "https://" + host + path +
    "?keyword=" + encodeURIComponent(keyword) +
    "&ebaySite=ebay.com.au" +
    "&page=1" +
    "&count=240" +
    "&daysToScrape=30" +
    "&sortOrder=endedRecently";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(scEndpoint, {
      headers: { Authorization: "Bearer " + SOLD_COMPS_KEY },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      console.warn("[sourcing-check] Primary scraper returned 429 (Too Many Requests). Implementing 5s backoff...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      throw new Error(`Primary scraper HTTP 429 Rate Limit`);
    }

    if (!res.ok) throw new Error(`Primary scraper HTTP ${res.status}`);

    const data = await res.json();
    return (data.items ?? []).map((i: any) => ({
      title: i.title || "",
      condition: i.condition || "",
      soldPrice: Number(i.soldPrice) || 0,
      soldCurrency: i.soldCurrency || "AUD",
    }));
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// 2. SerpApi Backup Scraper Fallback (Currency Lock: AUD)
async function fetchBackupComps(productName: string): Promise<Array<{ title?: string; condition?: string; soldPrice: number; soldCurrency: string }>> {
  const serpUrl = `https://serpapi.com/search.json?engine=ebay&ebay_domain=ebay.com.au&_nkw=${encodeURIComponent(productName)}&LH_Sold=1&LH_Complete=1&api_key=${SERPAPI_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(serpUrl, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);

    const data = await res.json();
    const results = data.organic_results || data.sold_results || data.items || [];

    return results.map((item: any) => {
      let priceNum = 0;
      if (item.price?.extracted) {
        priceNum = Number(item.price.extracted);
      } else if (item.price?.raw) {
        const match = String(item.price.raw).replace(/[^0-9.]/g, "");
        priceNum = Number(match) || 0;
      } else if (typeof item.price === "number") {
        priceNum = item.price;
      }

      return {
        title: item.title || "",
        condition: item.condition || "Used",
        soldPrice: priceNum,
        soldCurrency: "AUD",
      };
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[sourcing-check] SerpApi backup failed:", err);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Usage Limit Check if logged in
    if (user) {
      const usage = await checkUserUsage(user.id);
      if (usage.limitReached) {
        return NextResponse.json(
          {
            error:
              "Free plan limit reached (10/10 uses). Upgrade to Pro for unlimited sourcing checks.",
            limitReached: true,
          },
          { status: 403 }
        );
      }
    }

    const { imageUrls, cost } = (await req.json()) as {
      imageUrls: string[];
      cost: number;
    };

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required." },
        { status: 400 }
      );
    }
    if (cost < 0 || Number.isNaN(cost)) {
      return NextResponse.json(
        { error: "A valid cost is required." },
        { status: 400 }
      );
    }

    // 1. Identify the item via your existing vision route (passing cookie header for auth)
    const cookieHeader = req.headers.get("cookie") || "";
    const aiRes = await fetch(new URL("/api/ai-listing", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({ imageUrls }),
    });
    if (!aiRes.ok) {
      const aiBody = await aiRes.json().catch(() => ({}));
      console.error("[sourcing-check] /api/ai-listing failed:", aiRes.status, aiBody);
      return NextResponse.json(
        { error: aiBody.error || `AI identification failed (${aiRes.status}).` },
        { status: 502 }
      );
    }
    const ai = (await aiRes.json()) as AiListingResult;

    // 2. Fetch real sold prices with 2.5s Circuit Breaker timeout -> SerpApi fallback
    let rawComps: Array<{ title?: string; condition?: string; soldPrice: number; soldCurrency: string }> = [];

    try {
      rawComps = await fetchPrimaryComps(ai.analysis.product_name);
      if (rawComps.length === 0) {
        throw new Error("Primary scraper returned 0 items");
      }
    } catch (err) {
      console.warn("[sourcing-check] Primary scraper failed/timed out (2.5s Circuit Breaker), calling SerpApi backup...", err);
      rawComps = await fetchBackupComps(ai.analysis.product_name);
    }

    let marketPrices = {
      suggested_median: 0,
      suggested_min: 0,
      suggested_max: 0,
      sample_size: 0,
      currency: "AUD",
    };

    // Single-Item Parity & Condition Lock filters
    const LOT_KEYWORDS_REGEX = /\b(lot|mixed|loose cards|bundle|job lot|collection|set of)\b/i;
    const BAD_CONDITION_REGEX = /\b(untested|faulty|parts-only|for parts|as-is|as is|broken|damaged|junk|unverified)\b/i;

    const filteredItems = rawComps.filter((item) => {
      const itemTitle = (item.title || "").toLowerCase();
      const itemCond = (item.condition || "").toLowerCase();

      // Single-Item Parity: Exclude bulk lots/bundles for single items
      if (LOT_KEYWORDS_REGEX.test(itemTitle)) return false;

      // Condition Lock: Exclude faulty/untested/parts-only/as-is/unverified comps
      if (BAD_CONDITION_REGEX.test(itemTitle) || BAD_CONDITION_REGEX.test(itemCond)) return false;

      return true;
    });

    const itemsToUse = filteredItems.length > 0 ? filteredItems : [];
    const prices = itemsToUse
      .map((i) => Number(i.soldPrice))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (prices.length > 0) {
      const med = median(prices);
      marketPrices = {
        suggested_median: Math.round(med * 100) / 100,
        suggested_min: Math.round(med * 0.8 * 100) / 100,
        suggested_max: Math.round(med * 1.2 * 100) / 100,
        sample_size: prices.length,
        currency: "AUD",
      };
    }

    // 3. Calculate fees + profit
    const salePrice = marketPrices.suggested_median;
    const shippingEstimated = ai.shipping_estimate?.estimated_weight_grams
      ? Math.min(15, Math.max(9, ai.shipping_estimate.estimated_weight_grams / 500))
      : 12;
    const fees = estimateFees(salePrice, shippingEstimated);
    const gross = salePrice - cost;
    const net = gross - fees.marketplace_fee - fees.payment_fee - shippingEstimated;
    const marginPct = salePrice > 0 ? Math.round((net / salePrice) * 100) : 0;
    const roiPct = cost > 0 ? Math.round((net / cost) * 100) : 0;

    // 4. Verdict logic
    let verdict: SourcingVerdict["verdict"] = "pass";
    let verdictReason = "";
    if (marketPrices.sample_size < 5) {
      verdict = "caution";
      verdictReason =
        "Not enough recent sales to be confident in the price. Proceed only if you know the item.";
    } else if (net <= 0) {
      verdict = "pass";
      verdictReason = `Estimated loss of ${marketPrices.currency} ${Math.abs(net).toFixed(2)} after fees. Not worth the risk.`;
    } else if (roiPct < 30) {
      verdict = "caution";
      verdictReason = `Profitable but low ROI (${roiPct}%). Only worth it if the item moves fast.`;
    } else if (roiPct >= 30 && marginPct >= 20) {
      verdict = "buy";
      verdictReason = `Strong ROI (${roiPct}%) with ${marginPct}% margin. Good flip opportunity.`;
    } else {
      verdict = "caution";
      verdictReason = `Profitable but margin (${marginPct}%) is thin. Watch for slow sellers.`;
    }

    const result: SourcingVerdict = {
      identification: {
        product_name: ai.analysis.product_name,
        brand: ai.analysis.brand,
        category: ai.analysis.category,
        condition: ai.analysis.condition,
        confidence: ai.analysis.confidence,
        confidence_score: ai.analysis.confidence_score,
      },
      market_prices: marketPrices,
      cost,
      fees: { ...fees, shipping_estimated: shippingEstimated },
      profit: {
        gross,
        net,
        margin_pct: marginPct,
        roi_pct: roiPct,
      },
      verdict,
      verdict_reason: verdictReason,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[sourcing-check] failed:", err);
    return NextResponse.json(
      { error: "Sourcing check failed." },
      { status: 500 }
    );
  }
}
