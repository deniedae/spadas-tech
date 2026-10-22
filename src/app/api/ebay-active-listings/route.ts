import { NextResponse } from "next/server";
import { fetchEbayActiveListings } from "@/app/lib/ebay-australia-comps";
import {
  SupportedCurrency,
  detectGeoCurrency,
  extractCountryHeader,
  resolveEffectiveCurrency,
} from "@/app/lib/currency-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>(["AUD", "USD", "GBP", "EUR"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").trim();
  const countryHeader = extractCountryHeader(request);
  const requestedCurrency = resolveEffectiveCurrency(params.get("currency"), countryHeader);

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }

  if (!SUPPORTED_CURRENCIES.has(requestedCurrency)) {
    return NextResponse.json({ error: "Unsupported marketplace currency." }, { status: 400 });
  }

  try {
    const listings = await fetchEbayActiveListings(query, requestedCurrency, 8);
    const prices = listings.map((listing) => listing.price).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
    const middle = Math.floor(prices.length / 2);
    const median = prices.length
      ? prices.length % 2
        ? prices[middle]
        : (prices[middle - 1] + prices[middle]) / 2
      : 0;

    return NextResponse.json({
      listings,
      count: listings.length,
      median,
      min: prices[0] || 0,
      max: prices[prices.length - 1] || 0,
      currency: requestedCurrency,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/ebay-active-listings] Browse API lookup failed:", error);
    return NextResponse.json({ error: "Could not retrieve live eBay listings." }, { status: 502 });
  }
}