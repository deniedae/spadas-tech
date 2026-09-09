import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createOpenAiClient, getPrimaryAiApiKey } from "@/app/lib/config/ai-models";
import { computeOffMarketIntelligence, OffMarketIntelligence } from "@/lib/off-market-engine";

export const preferredRegion = "syd1";

export interface MarketplaceIntelligenceResponse {
  product_name: string;
  brand?: string;
  category?: string;
  p2p_demand_level: "HIGH" | "MODERATE" | "NICHE_SLOW";
  p2p_estimated_cash_price: number;
  cash_negotiation_buffer: {
    list_price: number;
    target_cash_price: number;
    floor_price: number;
  };
  physical_pickup_score: number; // 0 - 100
  pickup_viability_reason: string;
  primary_local_channel: "Facebook Marketplace" | "Gumtree AU" | "Local Collector Meet" | "Specialist Group";
  channels: Array<{
    channel: string;
    suitability_score: number;
    estimated_days_to_cash: string;
    strategy: string;
  }>;
  buyer_demographic: string;
  tactical_listing_hook: string;
  safety_tip: string;
  arbitrage_notes: string[];
  off_market_intelligence?: OffMarketIntelligence;
}

export function generateLocalMarketplaceFallback(
  productName = "Identified Item",
  brand = "",
  category = "General Goods",
  estimatedValue = 40,
  currency = "AUD"
): MarketplaceIntelligenceResponse {
  const pName = productName.toLowerCase();
  const cat = category.toLowerCase();
  const val = Math.max(10, Math.round(estimatedValue));

  // Determine physical pickup suitability based on bulky / fragile / heavy profile
  let pickupScore = 55;
  let pickupReason = "Standard parcelable item; viable for both shipping and local pickup.";
  let primaryChannel: MarketplaceIntelligenceResponse["primary_local_channel"] = "Facebook Marketplace";

  if (
    pName.includes("speaker") ||
    pName.includes("subwoofer") ||
    pName.includes("amplifier") ||
    pName.includes("furniture") ||
    pName.includes("chair") ||
    pName.includes("table") ||
    pName.includes("mirror") ||
    pName.includes("lamp") ||
    pName.includes("monitor") ||
    pName.includes("tv") ||
    pName.includes("bike") ||
    cat.includes("furniture") ||
    cat.includes("heavy")
  ) {
    pickupScore = 95;
    pickupReason = "Bulky / heavy profile. Local pickup completely eliminates costly parcel shipping and carrier damage liability.";
    primaryChannel = "Facebook Marketplace";
  } else if (
    pName.includes("vintage") ||
    pName.includes("carhartt") ||
    pName.includes("nike") ||
    pName.includes("jacket") ||
    pName.includes("hoodie") ||
    cat.includes("apparel") ||
    cat.includes("streetwear")
  ) {
    pickupScore = 70;
    pickupReason = "High local demand among streetwear enthusiasts looking for cash-and-carry deals.";
    primaryChannel = "Facebook Marketplace";
  } else if (
    pName.includes("tool") ||
    pName.includes("drill") ||
    pName.includes("saw") ||
    pName.includes("lawn") ||
    pName.includes("mower") ||
    cat.includes("hardware")
  ) {
    pickupScore = 90;
    pickupReason = "Contractor & DIY favorite. Fast cash liquidity on Gumtree AU and Facebook Marketplace.";
    primaryChannel = "Gumtree AU";
  } else if (
    pName.includes("pokemon") ||
    pName.includes("tcg") ||
    pName.includes("lego") ||
    pName.includes("retro") ||
    pName.includes("nintendo") ||
    cat.includes("toy") ||
    cat.includes("collectible")
  ) {
    pickupScore = 80;
    pickupReason = "Dedicated collector market. High cash conversion in local hobbyist swap meets and FB groups.";
    primaryChannel = "Specialist Group";
  }

  // Cash negotiation ladder:
  // List at ~15% above target, expect buyer to counter at target, floor is 80%
  const targetCash = Math.round(val * 0.9);
  const listPrice = Math.round(targetCash * 1.18);
  const floorPrice = Math.round(targetCash * 0.85);

  const channels = [
    {
      channel: "Facebook Marketplace",
      suitability_score: primaryChannel === "Facebook Marketplace" ? 96 : 85,
      estimated_days_to_cash: "1 - 3 days",
      strategy: "List with clean daylight photos and specify 'Cash on Pickup in local area'.",
    },
    {
      channel: "Gumtree AU",
      suitability_score: primaryChannel === "Gumtree AU" ? 92 : 72,
      estimated_days_to_cash: "2 - 5 days",
      strategy: "Great for tools, furniture, and practical household gear with older local buyer base.",
    },
    {
      channel: "Local Specialist & Collector Circles",
      suitability_score: primaryChannel === "Specialist Group" ? 95 : 68,
      estimated_days_to_cash: "1 - 4 days",
      strategy: "Post to suburb buy/swap/sell groups for zero fees and rapid cash collection.",
    },
  ];

  return {
    product_name: productName,
    brand,
    category,
    p2p_demand_level: val >= 50 ? "HIGH" : "MODERATE",
    p2p_estimated_cash_price: targetCash,
    cash_negotiation_buffer: {
      list_price: listPrice,
      target_cash_price: targetCash,
      floor_price: floorPrice,
    },
    physical_pickup_score: pickupScore,
    pickup_viability_reason: pickupReason,
    primary_local_channel: primaryChannel,
    channels,
    buyer_demographic: "Local bargain hunters, DIYers & collectors seeking same-day pickup without shipping wait times.",
    tactical_listing_hook: `Clean condition ${brand ? brand + " " : ""}${productName}. Tested & ready. Cash on pickup preferred.`,
    safety_tip: "Meet during daylight in a public location or front porch. Accept cash or instant Osko/PayID with confirmed balance before handover.",
    arbitrage_notes: [
      `Local P2P nets 100% cash with 0% platform or seller processing tariffs.`,
      `List at $${listPrice} ${currency} to allow standard $${listPrice - targetCash} negotiation room.`,
      `Do not accept below $${floorPrice} ${currency} cash floor.`,
    ],
    off_market_intelligence: computeOffMarketIntelligence(productName, brand, category, val, currency),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      image,
      productName,
      brand,
      category,
      estimatedValue = 40,
      currency = "AUD",
    } = body;

    // Check for optional session (non-blocking)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );

    const authHeader = req.headers.get("authorization");
    let user: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data } = await supabase.auth.getUser(token);
      user = data?.user;
    }
    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    }

    const apiKey = getPrimaryAiApiKey();
    if (!apiKey || (!image && !productName)) {
      return NextResponse.json(
        generateLocalMarketplaceFallback(
          productName || "Scanned Resale Item",
          brand || "",
          category || "General",
          Number(estimatedValue) || 40,
          currency
        )
      );
    }

    const openai = createOpenAiClient();

    const systemPrompt = `You are a specialized localized peer-to-peer (P2P) reseller intelligence engine.
Analyze this item exclusively for LOCAL cash sales and non-eBay liquidation channels:
- Facebook Marketplace
- Gumtree AU
- Local Collector & Community Buy/Swap/Sell Groups

Key Valuation Principles for Local Peer-to-Peer:
1. Physical Pickup Viability (0-100%): Rate how advantageous local cash pickup is over shipping. Bulky items (speakers, furniture, tools, monitors, bicycles) score 90-100% because shipping is prohibitive or risky. Compact, high-dollar items score lower because shipping is easy.
2. Cash Negotiation Ladder in ${currency}:
   - list_price: Realistic asking price (with 15-20% negotiation padding).
   - target_cash_price: What the seller actually expects in cash in hand (0% platform fees).
   - floor_price: Absolute lowest walk-away cash offer to accept.
3. P2P Demand Level: "HIGH", "MODERATE", or "NICHE_SLOW".
4. Primary Local Channel: "Facebook Marketplace", "Gumtree AU", "Local Collector Meet", or "Specialist Group".
5. Local Buyer Demographic: Who actually buys this locally (e.g., student furnishers, retro gamers, tradies, vintage clothing collectors).
6. Tactical Listing Hook: Compelling 1-2 sentence Facebook Marketplace title/hook.
7. Safety Tip: Specific local pickup and cash fraud prevention tip.

Output strictly valid JSON adhering to:
{
  "product_name": string,
  "brand": string,
  "category": string,
  "p2p_demand_level": "HIGH" | "MODERATE" | "NICHE_SLOW",
  "p2p_estimated_cash_price": number,
  "cash_negotiation_buffer": {
    "list_price": number,
    "target_cash_price": number,
    "floor_price": number
  },
  "physical_pickup_score": number,
  "pickup_viability_reason": string,
  "primary_local_channel": "Facebook Marketplace" | "Gumtree AU" | "Local Collector Meet" | "Specialist Group",
  "channels": [
    {
      "channel": string,
      "suitability_score": number,
      "estimated_days_to_cash": string,
      "strategy": string
    }
  ],
  "buyer_demographic": string,
  "tactical_listing_hook": string,
  "safety_tip": string,
  "arbitrage_notes": string[]
}`;

    let messages: any[] = [{ role: "system", content: systemPrompt }];

    if (image && typeof image === "string") {
      const cleanImage = image.trim().replace(/[\r\n]/g, "");
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Evaluate this item for local peer-to-peer cash resale in ${currency}. Item hints: ${productName || "Unknown"} ${brand || ""} ${category || ""}.`,
          },
          {
            type: "image_url",
            image_url: {
              url: cleanImage,
              detail: "auto",
            },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Evaluate "${productName}" by ${brand || "Unknown"} in category "${category || "General"}" (estimated value: $${estimatedValue} ${currency}) for local P2P cash resale in ${currency}.`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 700,
      messages,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        generateLocalMarketplaceFallback(
          productName || "Scanned Resale Item",
          brand || "",
          category || "General",
          Number(estimatedValue) || 40,
          currency
        )
      );
    }

    const parsed = JSON.parse(content);
    if (!parsed.off_market_intelligence) {
      parsed.off_market_intelligence = computeOffMarketIntelligence(
        productName || parsed.product_name || "Item",
        brand || parsed.brand || "",
        category || parsed.category || "General",
        Number(estimatedValue) || Number(parsed.p2p_estimated_cash_price) || 40,
        currency
      );
    }
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[Marketplace Intel API Error]:", error);
    return NextResponse.json(
      generateLocalMarketplaceFallback("Identified Item", "", "General", 40, "AUD"),
      { status: 200 }
    );
  }
}
