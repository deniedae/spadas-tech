if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkUserUsage } from "@/app/lib/usage";
import { AiListingResultSchema } from "@/app/lib/schemas/ai-listing-schema";
import { AR_SCAN_MODEL_FALLBACKS, LISTING_MODEL_FALLBACKS, getPrimaryAiApiKey, createOpenAiClient } from "@/app/lib/config/ai-models";
import type { AiListingResult } from "@/types/ai-listing";

export const preferredRegion = "syd1";

function generateMockAiListingResult(): AiListingResult {
  const mockCatalog = [
    {
      product_name: "Nintendo Game Boy Color (Berry Red)",
      brand: "Nintendo",
      model: "CGB-001",
      category: "Video Games & Consoles",
      condition: "Used - Good",
      price_min: 75,
      price_max: 95,
      bbox: { x: 22, y: 18, width: 55, height: 60 },
    },
    {
      product_name: "Sony Walkman WM-FX290 Cassette Player",
      brand: "Sony",
      model: "WM-FX290",
      category: "Vintage Electronics",
      condition: "Used - Good",
      price_min: 55,
      price_max: 70,
      bbox: { x: 20, y: 20, width: 60, height: 55 },
    },
    {
      product_name: "Pokémon Base Set Unlimited Charmander 46/102",
      brand: "Wizards of the Coast",
      model: "Base Set 46/102",
      category: "Trading Cards",
      condition: "Used - Good",
      price_min: 30,
      price_max: 45,
      bbox: { x: 28, y: 22, width: 44, height: 56 },
    },
    {
      product_name: "Bose SoundLink Mini II Bluetooth Speaker",
      brand: "Bose",
      model: "SoundLink Mini II",
      category: "Consumer Electronics",
      condition: "Used - Working",
      price_min: 80,
      price_max: 105,
      bbox: { x: 18, y: 25, width: 64, height: 50 },
    },
    {
      product_name: "Logitech MX Master 3S Wireless Mouse",
      brand: "Logitech",
      model: "MX Master 3S",
      category: "Computer Accessories",
      condition: "Used - Good",
      price_min: 70,
      price_max: 90,
      bbox: { x: 25, y: 20, width: 50, height: 60 },
    },
    {
      product_name: "Super Mario World SNES Cartridge",
      brand: "Nintendo",
      model: "SNES Cartridge",
      category: "Video Games",
      condition: "Used - Good",
      price_min: 40,
      price_max: 55,
      bbox: { x: 20, y: 15, width: 60, height: 65 },
    },
  ];

  const item = mockCatalog[Math.floor(Math.random() * mockCatalog.length)];

  return {
    isMockFallback: true,
    inventory_condition: "used_working",
    defect_notes: ["Minor surface wear consistent with thrifted pre-owned inventory"],
    as_is_disclaimer: "Item tested and functional. Sold as described with minor cosmetic wear.",
    detected_objects: [
      {
        id: `mock-obj-${Date.now()}`,
        product_name: item.product_name,
        brand: item.brand,
        category: item.category,
        condition: item.condition,
        bbox: item.bbox,
        confidence_score: 0.96,
      },
    ],
    analysis: {
      product_name: item.product_name,
      brand: item.brand,
      model: item.model,
      category: item.category,
      color: "Original",
      material: null,
      condition: item.condition,
      accessories_detected: [],
      confidence: "high",
      confidence_score: 0.96,
    },
    market_titles: {
      ebay: `${item.product_name} - Genuine Resale Unit`,
      facebook_marketplace: item.product_name,
      vinted: item.product_name,
      depop: item.product_name,
    },
    seo_description: `Verified authentic ${item.product_name} in ${item.condition} condition.`,
    detailed_description: `Authentic ${item.product_name}. Tested and in ${item.condition} working condition. Strong reseller margin potential.`,
    shipping_estimate: {
      size: "small",
      estimated_weight_grams: 350,
      dimensions_cm: { length: 20, width: 15, height: 10 },
      notes: "Standard shipping parcel",
    },
    item_specifics: {
      Brand: item.brand || "Unbranded",
      Model: item.model || "Standard",
      Condition: item.condition,
    },
    suggested_keywords: [item.brand || "vintage", item.category, "authentic"],
    suggested_price_min: item.price_min,
    suggested_price_max: item.price_max,
    suggested_price_currency: "AUD",
  };
}

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.error?.code || "";
  const type = err.type || err.error?.type || "";
  const msg = (err.message || "").toLowerCase();

  return (
    code === "rate_limit_exceeded" ||
    type === "rate_limit_exceeded" ||
    msg.includes("rate_limit_exceeded") ||
    msg.includes("rate limit") ||
    msg.includes("requests per minute") ||
    msg.includes("rpm limit")
  );
}

function isCreditOrQuotaError(err: any): boolean {
  if (!err) return false;
  if (isRateLimitError(err)) return false; // Exclude RPM rate limits from quota exhaustion!

  const status = err.status || err.statusCode;
  const code = err.code || err.error?.code || "";
  const msg = (err.message || "").toLowerCase();

  return (
    status === 401 ||
    status === 402 ||
    code === "insufficient_quota" ||
    code === "invalid_api_key" ||
    msg.includes("insufficient_quota") ||
    msg.includes("quota") ||
    msg.includes("credit balance") ||
    msg.includes("billing") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid_api_key")
  );
}

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

    const body = await request.json().catch(() => ({}));
    const { imageUrls, isArScan } = body as { imageUrls?: string[]; isArScan?: boolean };

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required." },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Usage Limit Check (Bypassed for real-time live AR continuous video stream or unauthenticated guests)
    if (!isArScan && user) {
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
      image_url: { url, detail: "high" as const },
    }));

    const openai = createOpenAiClient();
    let completion;
    let hasCreditOrQuotaError = false;
    const targetModels = isArScan ? AR_SCAN_MODEL_FALLBACKS : LISTING_MODEL_FALLBACKS;

    for (const modelName of targetModels) {
      try {
        const reqParams: any = {
          model: modelName,
          temperature: 0.0,
          response_format: zodResponseFormat(AiListingResultSchema, "ai_listing_analysis"),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are the world's leading AI Reselling & Valuation Expert across eBay, TCGPlayer, PriceCharting, Google Books, TMDB, Facebook Marketplace, and Depop.
Analyse the product in the provided image(s) with 100% precision.

STRICT ZERO-HALLUCINATION & HIGH CONFIDENCE GATEWAY:
- Identify an item ONLY if you are 100% CERTAIN of its visual identity from readable text, brand logos, distinct packaging, or clear product shape.
- DO NOT GUESS OR HALLUCINATE item names from blurry backgrounds, random shadows, or motion blur.
- If an item is blurry, unreadable, or cannot be positively identified with 90%+ confidence, set "product_name": null and "detected_objects": []. Never return a random guess that could mislead a seller.

INSTANT SINGLE-PASS BRAND & OCR MANDATE:
- Inspect every square millimeter of the image for text, brand logos, model plates, clothing tags, card set numbers, and packaging typography.
- If ANY brand logo or name (e.g. Nike, Sony, Nintendo, Bose, Logitech, EFM, Apple, Samsung, Adidas, Pokémon, Wizards of the Coast) is present anywhere in the frame, extract and specify that exact brand name on your VERY FIRST PASS. Never leave brand empty if a logo or text is visible.

REAL MARKET VALUE & EBAY SOLD COMP VALUATION MANDATE:
1. Accurate Resale Market Valuations:
   - Provide realistic, accurate Australian eBay sold comp price ranges (suggested_price_min, suggested_price_max, suggested_price_median) reflecting current market resale values.
   - Always default condition to clean, professional pre-owned categories ("used_working" or "Used - Good") unless factory-sealed.
   - Never output "untested" or "faulty" penalties. Resellers need real, clean pre-owned market comp prices.

2. Sales Velocity & Flip Speed Prediction:
   - Always populate "sales_velocity" object:
     * sell_speed: "FAST_FLIP" (for video games, streetwear, TCG cards, Apple/Sony/Bose electronics), "MODERATE" (standard electronics, books, homewares), or "SLOW_BURNER" (rare vintage/niche items).
     * est_days_to_sell: "1-3 Days" for FAST_FLIP, "7-14 Days" for MODERATE, "30-90 Days" for SLOW_BURNER.
     * demand_score: integer from 55 to 98 representing sell-through demand ratio.
     * sell_through_rate: e.g. "88% High Demand" or "65% Steady Turnover".

3. Professional Market Descriptions:
   - Provide clean, crisp product descriptions and SEO titles tailored for eBay, Depop, and Facebook Marketplace.

4. Banned Category Prohibition:
   - Vacuum Cleaners and floor care appliances of any type remain STRICTLY BANNED. Instantly set product_name: null.

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

2. Precise Comp & Clean Output Formatting:
   - Clean Subtitles & Condition: DO NOT include internal AI reasoning in condition or subtitle fields. Return clean, professional condition labels.

STRICT MANDATORY OCR & IDENTIFICATION LOCK:
1. Mandatory Brand OCR Lock:
   - If visible text, logo, or brand marking (e.g., "EFM", "Sony", "Bose", "JBL", "Nike", "Apple", "Nintendo", "Logitech") is detected on the item, package, or label, lock onto that exact brand name.
2. Physical Type Validation:
   - Verify physical form factor before outputting product name (e.g., speaker cannot be classified as charging pad).

Rules:
- Use realistic Australian resale prices in AUD.
- Titles must be SEO-friendly and within 80 characters.
- confidence_score is a number between 0 and 1.
- seo_description: a short, punchy 1-2 sentence summary optimised for search.
- detailed_description: a full marketplace listing body — 3-5 short paragraphs, plain text, no markdown, no emoji. Cover what it is, condition, key features, and any flaws visible in the photo.
- shipping_estimate.size: classify parcel as small, medium, large, or extra-large.`,
                },
                ...imageContent,
              ],
            },
          ],
        };

        if (modelName.startsWith("gpt-5")) {
          reqParams.reasoning = { effort: isArScan ? "none" : "low" };
        }

        completion = await openai.chat.completions.create(reqParams);
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err: any) {
        console.warn(`[ai-listing] Model ${modelName} call warning:`, err);
        if (isRateLimitError(err)) {
          console.warn("[ai-listing] OpenAI RPM rate limit hit on model:", modelName);
          return NextResponse.json(
            {
              isRateLimited: true,
              retryAfter: 5,
              rawError: err?.message || "OpenAI RPM rate limit exceeded.",
              error: "OpenAI rate limit reached. Pausing scan for 5s.",
            },
            { status: 429 }
          );
        }
        if (isCreditOrQuotaError(err)) {
          hasCreditOrQuotaError = true;
          console.warn("[ai-listing] Credit exhaustion / 401/402 quota error detected on model:", modelName);
        }
      }
    }

    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
      if (hasCreditOrQuotaError || process.env.OPENAI_API_KEY?.startsWith("sk-proj-placeholder")) {
        console.warn("[ai-listing] Credit exhaustion fallback triggered due to API status/credits.");
        return NextResponse.json(generateMockAiListingResult());
      }
      throw new Error("No model response received.");
    }

    const result = JSON.parse(content) as AiListingResult;

    // Fetch REAL-TIME eBay Australia Sold Comps for the identified item
    if (result.analysis?.product_name && process.env.SOLD_COMPS_API_KEY) {
      try {
        const pName = result.analysis.product_name.trim();
        const url = new URL("https://api.sold-comps.com/v1/scrape");
        url.searchParams.set("keyword", pName);
        url.searchParams.set("ebaySite", "ebay.com.au");
        url.searchParams.set("page", "1");
        url.searchParams.set("count", "60");
        url.searchParams.set("daysToScrape", "30");
        url.searchParams.set("sortOrder", "endedRecently");

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);

        const compRes = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${process.env.SOLD_COMPS_API_KEY}` },
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timer);

        if (compRes && compRes.ok) {
          const compData = await compRes.json().catch(() => null);
          const items = compData?.items ?? [];
          const prices = items
            .map((i: any) => Number(i.soldPrice))
            .filter((n: number) => !Number.isNaN(n) && n > 0);

          if (prices.length > 0) {
            prices.sort((a: number, b: number) => a - b);
            const midIdx = Math.floor(prices.length / 2);
            const medianPrice = prices.length % 2 === 0 ? (prices[midIdx - 1] + prices[midIdx]) / 2 : prices[midIdx];
            
            result.suggested_price_min = Math.round(prices[0] * 100) / 100;
            result.suggested_price_max = Math.round(prices[prices.length - 1] * 100) / 100;
            result.suggested_price_median = Math.round(medianPrice * 100) / 100;
          }
        }
      } catch (compErr) {
        console.warn("[ai-listing] Live eBay comps lookup warning:", compErr);
      }
    }

    // Record AI generation usage for listing generations safely without failing on Base64 image strings
    if (!isArScan && user) {
      try {
        const sanitizedUrls = imageUrls.map((u) =>
          u.startsWith("data:") ? `data:image/jpeg;base64,...(${u.length} bytes)` : u
        );
        await supabase.from("ai_listing_analyses").insert([
          {
            user_id: user.id,
            image_urls: sanitizedUrls,
            result,
          },
        ]);
      } catch (dbErr) {
        console.warn("[ai-listing] Supabase DB record insert warning:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[ai-listing] failed error:", err);
    if (isRateLimitError(err)) {
      return NextResponse.json(
        {
          isRateLimited: true,
          retryAfter: 5,
          rawError: err?.message || "OpenAI RPM rate limit exceeded.",
          error: "OpenAI rate limit reached. Pausing scan for 5s.",
        },
        { status: 429 }
      );
    }
    if (isCreditOrQuotaError(err)) {
      console.warn("[ai-listing] Returning mock fallback result due to credit exhaustion.");
      return NextResponse.json(generateMockAiListingResult());
    }
    return NextResponse.json(
      { error: "Failed to generate AI listing." },
      { status: 500 }
    );
  }
}
