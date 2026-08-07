import { NextResponse } from "next/server";
import { RadarAlert } from "@/types/radar";

interface IncomingBrowserListing {
  id?: string;
  title: string;
  price: number;
  imageUrl?: string;
  itemUrl: string;
}

/**
 * Dynamic Item Classification Engine for eBay Comps
 */
function classifyAndCalculateComps(scrapedTitle: string, localPrice: number): { estimatedValue: number; category: string } {
  const t = scrapedTitle.toLowerCase();
  const softwareKeywords = [
    "just dance", "mario", "zelda", "pokemon", "cartridge", "disc", "game",
    "case", "cover", "fifa", "nba", "gta", "smash bros", "call of duty", "accessory"
  ];

  const isSoftware = softwareKeywords.some((kw) => t.includes(kw));

  if (isSoftware) {
    const estimatedValue = Math.max(localPrice + 15, Math.round(localPrice * 1.35));
    return {
      estimatedValue: Math.min(65.00, Math.max(35.00, estimatedValue)),
      category: "Video Game Software",
    };
  }

  if (t.includes("oled")) return { estimatedValue: 380.00, category: "Hardware Console" };
  if (t.includes("switch lite")) return { estimatedValue: 180.00, category: "Hardware Console" };
  if (t.includes("switch")) return { estimatedValue: 280.00, category: "Hardware Console" };
  if (t.includes("3ds")) return { estimatedValue: 240.00, category: "Hardware Console" };
  if (t.includes("ds lite") || t.includes("dsi")) return { estimatedValue: 110.00, category: "Hardware Console" };
  if (t.includes("gameboy")) return { estimatedValue: 195.00, category: "Hardware Console" };
  if (t.includes("iphone 11")) return { estimatedValue: 310.00, category: "Smartphone" };
  if (t.includes("iphone 12")) return { estimatedValue: 420.00, category: "Smartphone" };

  return {
    estimatedValue: Math.round(localPrice * 1.5),
    category: "Marketplace Item",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawListings: IncomingBrowserListing[] = Array.isArray(body.listings)
      ? body.listings
      : body.title
      ? [body]
      : [];

    if (rawListings.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_LISTINGS_PROVIDED", message: "No valid listings passed in payload.", alerts: [] },
        { status: 400 }
      );
    }

    const ebayFeeRate = 0.1325;
    const estShipping = 8;
    const alerts: RadarAlert[] = [];

    for (const item of rawListings) {
      if (!item.title || typeof item.price !== "number" || item.price <= 0) continue;

      const itemId = item.id || (item.itemUrl.includes("/item/") ? item.itemUrl.split("/item/")[1]?.split("/")[0] : `browser-${Date.now()}`);
      const canonicalUrl = item.itemUrl.includes("/item/")
        ? item.itemUrl.split("?")[0]
        : `https://www.facebook.com/marketplace/item/${itemId}/`;

      const { estimatedValue, category } = classifyAndCalculateComps(item.title, item.price);
      const fees = Math.round(estimatedValue * ebayFeeRate * 100) / 100;
      const potentialProfit = Math.round((estimatedValue - item.price - fees - estShipping) * 100) / 100;
      const roiPct = item.price > 0 ? Math.round((potentialProfit / item.price) * 100) : 0;

      alerts.push({
        id: `swoopa-live-${itemId}`,
        title: item.title,
        category: `Browser Live Capture (${category})`,
        localPrice: item.price,
        estimatedMarketValue: estimatedValue,
        potentialProfit,
        roiPct,
        distanceMiles: 2,
        sourceUrl: canonicalUrl,
        imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80",
        marketplace: "Facebook Marketplace",
        confidenceScore: 100,
        status: "active",
        buyScript: `Hi! Is your "${item.title}" still available for $${item.price} on Facebook Marketplace? I can pick it up today with cash.`,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (err) {
    console.error("Radar sync endpoint error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Failed to process live browser sync payload." },
      { status: 500 }
    );
  }
}
