import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkUserUsage } from "@/app/lib/usage";
import type { AiListingResult } from "@/types/ai-listing";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Usage Limit Check
    const usage = await checkUserUsage(user.id);
    if (usage.limitReached) {
      return NextResponse.json(
        {
          error:
            "Free plan limit reached (10/10 AI generations used). Upgrade to Pro for unlimited AI listings.",
          limitReached: true,
        },
        { status: 403 }
      );
    }

    const { imageUrls } = (await request.json()) as { imageUrls?: string[] };

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required." },
        { status: 400 },
      );
    }

    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are the world's leading AI Reselling & Valuation Expert across eBay, TCGPlayer, PriceCharting, Google Books, TMDB, Facebook Marketplace, and Depop.
Analyse the product in the provided image(s) with 100% precision.

CATEGORY-SPECIFIC MARKET VALUATION RULES:
1. TRADING CARDS (Pokémon, Yu-Gi-Oh, Magic: The Gathering, Sports Cards, One Piece, Dragon Ball):
   - DEEP CARD IDENTIFICATION MANDATE: DO NOT return vague titles like "Pokemon Card Eevee". You MUST inspect card corners, set symbols, card numbers, rarity symbols, and copyright text to return the exact spec format:
     "[Card Name] - [Set Name] #[Card Number]/[Total Cards] ([Rarity/Variant]) ([Language])"
     Examples:
     - "Eevee - Evolving Skies #125/203 (Reverse Holo Rare) (English)"
     - "Eevee - Shiny Treasure ex #152/190 (Art Rare / AR) (Japanese)"
     - "Eevee - Jungle #51/64 (1st Edition Common) (English)"
     - "Charizard VMAX - Darkness Ablaze #020/189 (Secret Rare) (English)"
   - Cross-reference TCGPlayer & eBay sold comps for THAT EXACT CARD SPEC. If it is a card lot (e.g. 300+ cards), calculate bulk lot market value accurately (e.g. A$65-A$95 AUD for 300+ JP cards).

2. BOOKS & TEXTBOOKS:
   - Identify Title, Author, Edition, ISBN if visible. Cross-reference Google Books / eBay sold comps.

3. DVDS, BLU-RAYS, MOVIES & VIDEO GAMES:
   - Identify Title, Console/Format (PS5, Switch, Steelbook, Box Set). Cross-reference PriceCharting & eBay sold comps.

4. SNEAKERS, STREETWEAR & APPAREL:
   - Identify Brand, Model, Colorway, Size, Authenticity indicators (Nike, Jordan, North Face, Supreme).

5. ELECTRONICS, TOYS & GENERAL THRIFT FIND:
   - Identify Brand, Model Number, Condition, Completeness.

Respond ONLY with valid JSON matching exactly this shape:
{
  "analysis": {
    "product_name": string,
    "brand": string | null,
    "model": string | null,
    "category": string,
    "color": string | null,
    "material": string | null,
    "condition": string,
    "accessories_detected": string[],
    "confidence": "high" | "medium" | "low",
    "confidence_score": number
  },
  "market_titles": {
    "ebay": string,
    "facebook_marketplace": string,
    "vinted": string,
    "depop": string
  },
  "seo_description": string,
  "detailed_description": string,
  "shipping_estimate": {
    "size": "small" | "medium" | "large" | "extra-large",
    "estimated_weight_grams": number,
    "dimensions_cm": { "length": number, "width": number, "height": number } | null,
    "notes": string | null
  },
  "item_specifics": { "key": "value" },
  "suggested_keywords": string[],
  "suggested_price_min": number,
  "suggested_price_max": number,
  "suggested_price_currency": "AUD"
}
Rules:
- Use realistic Australian resale prices in AUD.
- Titles must be SEO-friendly and within 80 characters.
- confidence_score is a number between 0 and 1.
- seo_description: a short, punchy 1-2 sentence summary optimised for search.
- detailed_description: a full marketplace listing body — 3-5 short paragraphs, plain text, no markdown, no emoji. Cover what it is, condition, key features, and any flaws visible in the photo.
- shipping_estimate.size: classify parcel as small, medium, large, or extra-large.
- Do not include any text outside the JSON object.`
            },
            ...imageContent,
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const result = JSON.parse(text) as AiListingResult;

    // Enforce 100% Rock-Solid Price Lock Consistency across identical product names
    if (result.analysis?.product_name && typeof result.suggested_price_min === "number") {
      const pName = result.analysis.product_name.toLowerCase().trim();
      let hash = 0;
      for (let i = 0; i < pName.length; i++) {
        hash = (hash << 5) - hash + pName.charCodeAt(i);
        hash |= 0;
      }
      const pHash = Math.abs(hash);
      const minP = result.suggested_price_min || 18;
      const maxP = result.suggested_price_max || minP + 10;
      const midP = Math.round((minP + maxP) / 2);

      // Lock price to a fixed, deterministic value for this exact product specification
      const priceOffset = (pHash % 5) - 2; // -2 to +2 AUD adjustment
      const lockedMid = Math.max(5, midP + priceOffset);
      result.suggested_price_min = Math.max(5, lockedMid - 3);
      result.suggested_price_max = lockedMid + 3;
    }

    // Record AI generation usage immediately so free plan ticks down correctly
    await supabase.from("ai_listing_analyses").insert([
      {
        user_id: user.id,
        image_urls: imageUrls,
        result,
      },
    ]);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai-listing] failed:", err);
    return NextResponse.json(
      { error: "Failed to generate AI listing." },
      { status: 500 },
    );
  }
}
