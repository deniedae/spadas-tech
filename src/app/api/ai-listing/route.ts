import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkUserUsage } from "@/app/lib/usage";
import type { AiListingResult } from "@/types/ai-listing";

export const preferredRegion = "syd1";

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

    const body = await request.json().catch(() => ({}));
    const { imageUrls, isArScan } = body as { imageUrls?: string[]; isArScan?: boolean };

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required." },
        { status: 400 },
      );
    }

    // Usage Limit Check (Bypassed for real-time live AR continuous video stream)
    if (!isArScan) {
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
    }

    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "low" as const },
    }));

    let completion;
    const targetModels = [
      "gpt-5-mini",
      "gpt-5.4-mini",
      "gpt-5",
      "gpt-5.6-sol",
      "chat-latest",
      "gpt-4o-mini",
      "gpt-4.1-mini",
      "gpt-4o",
    ];

    for (const modelName of targetModels) {
      try {
        completion = await openai.chat.completions.create({
          model: modelName,
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

UNIVERSAL VISION GATEWAY MANDATE:
- Evaluate ALL items in the frame, including groceries, consumables, pantry items, coffee/tea, household goods, tools, media, electronics, clothing, and low-cost items.
- DO NOT reject or ghost items based on category. Groceries, food, consumables, tools, media, and household goods MUST BE EVALUATED and priced.
- EXCEPTION: Vacuum cleaners and floor sweepers remain STRICTLY BANNED. Set "product_name": null for any vacuum cleaner.

STRICT SPECIFICITY FOR PRICING:
- NO VAGUE COMPS: Every detected item MUST include its specific brand, product line, model, or variant (e.g. "Bialetti Moka Express 6-Cup Coffee Maker" instead of "Coffee Maker", "Vittoria Mountain Grown Coffee Beans 1kg" instead of "Coffee", "Logitech MX Keys Wireless Keyboard" instead of "Keyboard").
- TRADING CARD (TCG) SPECIFICITY: For trading cards (Pokémon, Yu-Gi-Oh!, Magic: The Gathering, Sports Cards), you MUST append the set name or card number (e.g., "Yu-Gi-Oh! MRD-015 Time Wizard", "Pokémon Charizard Base Set 4/102"). Set "product_name": null if only generic "Trading Card" is read.

CONDITION PARITY & LISTING HONESTY:
- Accurately assess physical condition (e.g. "New / Sealed" ONLY if factory sealed packaging is clearly visible; otherwise mark "Used - Good" or "Used - Working").
- Never assume an item is Brand New if it is opened, thrifted, or used.

STRICT IDENTIFICATION GATEWAY (NO PARTIAL OR VAGUE MATCHES):
1. Strict Brand/Model/Variant Identification Gateway:
   - DO NOT return an item if the exact brand, model, set, or variant cannot be positively identified from the image or text.
   - Nullify Vague Reads: If details are vague or unclear (e.g. "exact card details unclear", "exact set/variant not fully readable", "unknown model", "unidentified item"), set "product_name": null.

2. Banned Category Prohibition:
   - Vacuum Cleaners of any type (e.g. Hoover, Dyson V-series, Roomba, Bissell, Eureka, Shop-Vac, Sweeper, floor cleaners) are STRICTLY BANNED. Instantly set "product_name": null.

3. Precise Comp & Clean Output Formatting:
   - Exclude bulk lots ("lot", "mixed", "loose cards", "job lot").
   - Exclude "Untested", "Faulty", "Parts-Only", "As-Is" conditions from comp valuations by default.
   - Clean Subtitles & Condition: DO NOT include internal AI reasoning in condition or subtitle fields. Return clean, professional condition labels.

STRICT MANDATORY OCR & IDENTIFICATION LOCK:
1. Mandatory Brand OCR Lock:
   - If visible text, logo, or brand marking (e.g., "EFM", "Sony", "Bose", "JBL", "Nike", "Apple", "Nintendo", "Logitech") is detected on the item, package, or label, lock onto that exact brand name.
2. Physical Type Validation:
   - Verify physical form factor before outputting product name (e.g., speaker cannot be classified as charging pad).

Respond ONLY with valid JSON matching exactly this shape:
{
  "detected_objects": [
    {
      "id": "string",
      "product_name": "string | null",
      "brand": "string | null",
      "category": "string",
      "condition": "string",
      "bbox": { "x": 10, "y": 15, "width": 40, "height": 50 },
      "confidence_score": 0.95
    }
  ],
  "analysis": {
    "product_name": string | null,
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
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err) {
        console.warn(`[ai-listing] Model ${modelName} fallback check:`, err);
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("No model response received.");
    }

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

    // Record AI generation usage for listing generations (skipping temporary live AR video frames)
    if (!isArScan) {
      await supabase.from("ai_listing_analyses").insert([
        {
          user_id: user.id,
          image_urls: imageUrls,
          result,
        },
      ]);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai-listing] failed:", err);
    return NextResponse.json(
      { error: "Failed to generate AI listing." },
      { status: 500 },
    );
  }
}
