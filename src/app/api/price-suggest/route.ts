import { NextResponse } from "next/server";

const SOLD_COMPS_KEY = process.env.SOLD_COMPS_API_KEY;
const SOLD_COMPS_URL = "[api.sold-comps.com](https://api.sold-comps.com/v1/scrape)";

export interface PriceSuggestion {
  suggested_min: number;
  suggested_max: number;
  suggested_median: number;
  sample_size: number;
  currency: string;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function POST(req: Request) {
  try {
    if (!SOLD_COMPS_KEY) {
      return NextResponse.json(
        { error: "SoldComps API key not configured." },
        { status: 500 }
      );
    }

    const { product } = (await req.json()) as { product?: string };

    if (!product || !product.trim()) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    const url = new URL(SOLD_COMPS_URL);
    url.searchParams.set("keyword", product.trim());
    url.searchParams.set("ebaySite", "ebay.com.au");
    url.searchParams.set("page", "1");
    url.searchParams.set("count", "240");
    url.searchParams.set("daysToScrape", "30");
    url.searchParams.set("sortOrder", "endedRecently");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${SOLD_COMPS_KEY}` },
      // cache sold-price data for an hour to keep free-tier usage low
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[price-suggest] SoldComps error:", res.status, body);
      return NextResponse.json(
        { error: `SoldComps lookup failed (${res.status}).` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      totalItems: number;
      items: Array<{ soldPrice: string; soldCurrency: string }>;
    };

    const items = data.items ?? [];
    if (items.length === 0) {
      return NextResponse.json({
        suggested_min: 0,
        suggested_max: 0,
        suggested_median: 0,
        sample_size: 0,
        currency: "AUD",
      });
    }

    const prices = items
      .map((i) => Number(i.soldPrice))
      .filter((n) => !Number.isNaN(n) && n > 0);

    const med = median(prices);
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    // A tighter, more usable range: 80% of median → 120% of median.
    // Keeps the suggestion grounded in the cluster of recent sales
    // rather than one outlier auction.
    const suggested_min = Math.round(med * 0.8 * 100) / 100;
    const suggested_max = Math.round(med * 1.2 * 100) / 100;

    const result: PriceSuggestion = {
      suggested_min,
      suggested_max,
      suggested_median: Math.round(med * 100) / 100,
      sample_size: prices.length,
      currency: items[0]?.soldCurrency || "AUD",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[price-suggest] failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch price suggestions." },
      { status: 500 }
    );
  }
}
