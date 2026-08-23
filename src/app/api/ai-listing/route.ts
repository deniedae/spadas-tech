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
import { callClaudeVision } from "@/app/lib/config/claude-vision";
import { callGeminiVision } from "@/app/lib/config/gemini-vision";
import { fetchEbayAustraliaSoldComps } from "@/app/lib/ebay-australia-comps";
import { detectGeoCurrency, SupportedCurrency } from "@/app/lib/currency-routing";
import type { AiListingResult } from "@/types/ai-listing";

export const preferredRegion = "syd1";

function createEmptyScanResult(): AiListingResult {
  return {
    isMockFallback: false,
    inventory_condition: "used_working",
    defect_notes: [],
    as_is_disclaimer: undefined,
    detected_objects: [],
    analysis: {
      product_name: "NO_CENTER_ITEM",
      brand: null,
      model: null,
      category: "NO_CENTER_ITEM",
      color: null,
      material: null,
      condition: "Used",
      accessories_detected: [],
      confidence: "low",
      confidence_score: 0,
    },
    market_titles: {
      ebay: "",
      facebook_marketplace: "",
      vinted: "",
      depop: "",
    },
    seo_description: "",
    detailed_description: "",
    shipping_estimate: {
      size: "small",
      estimated_weight_grams: 300,
      dimensions_cm: null,
      notes: null,
    },
    item_specifics: {},
    suggested_keywords: [],
    suggested_price_min: 0,
    suggested_price_max: 0,
    suggested_price_median: 0,
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

interface UserRateLimitRecord {
  minuteWindow: number[];
  dayWindow: number[];
  inFlight: boolean;
}

const userRateLimitMap = new Map<string, UserRateLimitRecord>();

export async function POST(request: Request) {
  let userId: string | null = null;
  let rawImageUrls: string[] = [];
  let supabaseClient: any = null;
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
    supabaseClient = supabase;

    const body = await request.json().catch(() => ({}));
    const { imageUrls, isArScan, mode } = body as { imageUrls?: string[]; isArScan?: boolean; mode?: "sweep" | "deep" | "live" | "focus" | "standard" };
    rawImageUrls = imageUrls || [];

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(createEmptyScanResult());
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isArScan) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest";
    const userIdentifier = user ? user.id : `guest-${clientIp}`;
    userId = user?.id || null;

    const now = Date.now();
    const userLimiter = userRateLimitMap.get(userIdentifier) || { minuteWindow: [], dayWindow: [], inFlight: false };

    userLimiter.minuteWindow = userLimiter.minuteWindow.filter((t) => now - t < 60000);
    userLimiter.dayWindow = userLimiter.dayWindow.filter((t) => now - t < 86400000);

    // Bypass in-flight lock for continuous AR camera streams so 100% of camera frames reach OpenAI Vision
    if (!isArScan && userLimiter.inFlight) {
      return NextResponse.json(
        {
          error: "rate_limit",
          scope: "user",
          message: "A scan is already in-flight for your account. Please wait.",
          retryAfterSeconds: 5,
        },
        { status: 429 }
      );
    }

    // Guest trial limit on AR scanning (up to 30 free live camera scans per day per IP before requiring signup)
    if (!user && userLimiter.dayWindow.length >= 30) {
      return NextResponse.json(
        {
          error: "Guest trial limit reached (30 AR scans). Please sign up or log in for unlimited scanning.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    if (!isArScan && userLimiter.minuteWindow.length >= 10) {
      const oldestInMin = userLimiter.minuteWindow[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((60000 - (now - oldestInMin)) / 1000));
      return NextResponse.json(
        {
          error: "rate_limit",
          scope: "user",
          message: `You've reached your scan limit (10 scans/min). Please wait ${retryAfterSeconds}s.`,
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    if (userLimiter.dayWindow.length >= 100) {
      return NextResponse.json(
        {
          error: "rate_limit",
          scope: "user",
          message: "Daily scan limit reached (100 scans/day). Please try again tomorrow.",
          retryAfterSeconds: 3600,
        },
        { status: 429 }
      );
    }

    userLimiter.inFlight = true;
    userLimiter.minuteWindow.push(now);
    userLimiter.dayWindow.push(now);
    userRateLimitMap.set(userIdentifier, userLimiter);

    // Usage Limit Check (10 Free Scans total for Non-Pro accounts on full generator routes)
    if (user && !isArScan) {
      const usage = await checkUserUsage(user.id);
      if (!usage.isPro && usage.limitReached) {
        return NextResponse.json(
          {
            error: "Free plan limit reached (10/10 AI scans used). Upgrade to Spadas Pro ($10 AUD/mo) for unlimited AR scans.",
            limitReached: true,
            isPro: false,
          },
          { status: 403 }
        );
      }
    }

    const imageContent = imageUrls.map((url) => {
      // Clean base64 strings (remove whitespace/newlines) to prevent OpenAI 400 "unsupported image" errors
      const cleanUrl = url.trim().replace(/[\r\n]/g, "");
      return {
        type: "image_url" as const,
        image_url: {
          url: cleanUrl,
          detail: "high" as const, // High-Detail 512px tile resolution for 100% OCR & brand identification
        },
      };
    });

    const openai = createOpenAiClient();
    let completion;
    let hasCreditOrQuotaError = false;
    const targetModels = isArScan ? AR_SCAN_MODEL_FALLBACKS : LISTING_MODEL_FALLBACKS;

    const modePrompt =
      mode === "sweep"
        ? `SCAN MODE: CONTINUOUS SWEEP / MULTI-ITEM DETECTION.
Scan the full scene and identify distinct physical products visible. Provide bounding boxes in detected_objects for each identified product. If no distinct object is in frame, return product_name: "NO_CENTER_ITEM".`
        : mode === "deep"
        ? `SCAN MODE: DEEP FORENSIC & OCR INSPECTION.
Perform deep OCR inspection of all text, model plates, serial numbers, care tags, and condition flaws visible on the centered item.`
        : `SCAN MODE: TARGETED CENTER FOCUS.
Focus 100% on the single primary product located in the center of the frame. Ignore hands, background objects, and peripheral clutter.`;

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
                  text: `You are an expert product identification and resale valuation engine for eBay Australia and global marketplaces.
${modePrompt}

CRITICAL IDENTIFICATION & GROUNDING MANDATES:
1. STRICT VISUAL GROUNDING — NO BRAND HALLUCINATIONS:
   - Identify the product based ONLY on what is directly visible in the image.
   - Extract the BRAND ONLY if a brand logo, emblem, label, or brand name is clearly visible on the item or packaging.
   - If the item is unbranded, generic, or the brand cannot be verified from the photo, set "brand": null.
   - NEVER invent or guess famous brands (e.g. Nike, Apple, Sony, Carhartt, Canon, Nintendo) on generic or unbranded items.

2. VERBATIM OCR TEXT EXTRACTION:
   - If the product has visible text (book title, game cover, DVD title, food packaging, tool label, electronics model number, wine/spirit label), transcribe that exact text directly into "product_name".
   - Examples of correct extraction:
     * Book titled "Atomic Habits" -> "Atomic Habits by James Clear Paperback Book"
     * Nintendo Switch cartridge "Mario Kart 8 Deluxe" -> "Mario Kart 8 Deluxe Nintendo Switch Game"
     * Coffee beans package "Vittoria Espresso 1kg" -> "Vittoria Espresso Coffee Beans 1kg"
     * Bottle "Vegemite 380g" -> "Vegemite Yeast Extract Spread 380g"
     * Unbranded ceramic cup -> "White Ceramic Coffee Mug with Handle"
     * Unbranded stainless bottle -> "Stainless Steel Insulated Water Bottle"

3. HONEST CATALOG TITLE ASSEMBLY:
   - Assemble "product_name" as: "[Brand if verified] [Model/Line/Title] [Key Feature/Color] [Category/Form Factor]"
   - Unbranded items: Describe accurately using "[Color/Material] [Style] [Product Type]" (e.g. "Black Cotton Crewneck T-Shirt", "Clear Glass Mason Jar 500ml").
   - NO PRODUCT IN FRAME: If frame is empty, blurry, or points at a blank surface/floor with no distinct physical item, set "product_name": "NO_CENTER_ITEM" and "detected_objects": null.

4. REALISTIC AUSTRALIAN RESALE VALUATION (AUD):
   - Provide realistic, conservative pre-owned market estimates in Australian Dollars (AUD).
   - Single everyday low-cost consumables (single disposable lighter, single pen, basic charging cable): estimate $1–$3 AUD, sell_speed: "SLOW_BURNER".
   - Standard controllers (Xbox Wireless, PS5 DualSense): estimate $45–$75 AUD.
   - Video games & collectibles: estimate realistic pre-owned market rate in AUD.

5. BANNED ITEMS:
   - Vacuum cleaners of all types remain strictly banned. Set "product_name": null for any vacuum cleaner.`,
                },
                ...imageContent,
              ],
            },
          ],
        };

        try {
          completion = await openai.chat.completions.create(reqParams);
          if (completion?.choices?.[0]?.message?.content) break;
        } catch (err1: any) {
          console.warn(`[ai-listing] Primary call on ${modelName} failed:`, err1?.message);

          if (isRateLimitError(err1)) {
            console.log(`[ai-listing] 429 Rate limit error on OpenAI model ${modelName} — surfacing error to UI (no retry, no failover).`);
            return NextResponse.json(
              {
                error: `OpenAI Rate Limit Exceeded (HTTP 429) on ${modelName}.`,
                isRateLimited: true,
                provider: "openai"
              },
              { status: 429 }
            );
          }

          if (isCreditOrQuotaError(err1)) {
            hasCreditOrQuotaError = true;
          }
        }
      } catch (outerErr: any) {
        console.warn(`[ai-listing] Model loop error on ${modelName}:`, outerErr?.message);
      }
    }

    const content = completion?.choices?.[0]?.message?.content;
    let result: AiListingResult | null = null;

    if (content) {
      try {
        result = JSON.parse(content) as AiListingResult;
      } catch {
        result = null;
      }
    }

    let activeProvider = "openai-vision";

    if (!result && imageUrls.length > 0) {
      try {
        const geminiResult = await callGeminiVision(imageUrls[0]);
        if (geminiResult && geminiResult.analysis?.product_name) {
          result = geminiResult;
          activeProvider = "gemini-flash";
        }
      } catch (gemErr) {
        console.warn("[ai-listing] Gemini vision fallback warning:", gemErr);
      }
    }

    if (!result) {
      console.warn("[ai-listing] Vision models returned empty response — returning clean empty result.");
      return NextResponse.json(createEmptyScanResult());
    }
    const countryHeader = request.headers.get("x-vercel-ip-country");
    const geoInfo = detectGeoCurrency(countryHeader);
    const targetCurrency: SupportedCurrency = (body.currency as SupportedCurrency) || geoInfo.currency;

    (result as any).provider = activeProvider;
    (result as any).suggested_price_currency = targetCurrency;
    console.log(`[Spadas Vision Diagnostic] userId: ${userId || "guest"} | provider: ${activeProvider} | product_name: "${result.analysis?.product_name}" | brand: "${result.analysis?.brand}" | category: "${result.analysis?.category}" | currency: ${targetCurrency}`);

    // Fetch REAL-TIME regional eBay Comps in target currency via Browse API / Sold Comps API
    if (result.analysis?.product_name) {
      try {
        const ebayComps = await fetchEbayAustraliaSoldComps(result.analysis.product_name, targetCurrency);
        if (ebayComps && ebayComps.count > 0) {
          result.suggested_price_min = ebayComps.min;
          result.suggested_price_max = ebayComps.max;
          result.suggested_price_median = ebayComps.median;
          result.ebay_comps_count = ebayComps.count;
          (result as any).comps_source = ebayComps.source;
          if (result.detected_objects && result.detected_objects.length > 0) {
            result.detected_objects[0].ebay_comps_count = ebayComps.count;
            (result.detected_objects[0] as any).comps_source = ebayComps.source;
          }
        } else {
          result.ebay_comps_count = undefined;
          (result as any).comps_source = "ai_estimate";
          if (result.detected_objects && result.detected_objects.length > 0) {
            result.detected_objects[0].ebay_comps_count = undefined;
            (result.detected_objects[0] as any).comps_source = "ai_estimate";
          }
        }
      } catch (compErr) {
        console.warn("[ai-listing] Live eBay comps lookup warning:", compErr);
        result.ebay_comps_count = undefined;
        (result as any).comps_source = "ai_estimate";
      }
    }

    // CATEGORY PRICE SANITY GUARD: Prevent sponsored tray outliers from inflating standard peripherals
    if (result.analysis?.product_name) {
      const lowerTitle = result.analysis.product_name.toLowerCase();

      // Standard Xbox Wireless Controller (Non-Elite / Non-Limited) Sanity Guard
      if (lowerTitle.includes("xbox") && lowerTitle.includes("controller") && !lowerTitle.includes("elite") && !lowerTitle.includes("starfield") && !lowerTitle.includes("anniversary")) {
        const cappedMedian = Math.min(result.suggested_price_median || 65, 75);
        result.suggested_price_min = Math.min(result.suggested_price_min || 45, 55);
        result.suggested_price_max = Math.min(result.suggested_price_max || 85, 85);
        result.suggested_price_median = cappedMedian;
      }

      // Single Disposable Lighter Sanity Guard (prevent multi-pack eBay listings from overvaluing a single $2 lighter)
      if (
        lowerTitle.includes("lighter") &&
        !lowerTitle.includes("zippo") &&
        !lowerTitle.includes("dupont") &&
        !lowerTitle.includes("dunhill") &&
        !lowerTitle.includes("vintage") &&
        !lowerTitle.includes("gold") &&
        !lowerTitle.includes("silver") &&
        !lowerTitle.includes("antique")
      ) {
        if (
          lowerTitle.includes("bic") ||
          lowerTitle.includes("cricket") ||
          lowerTitle.includes("disposable") ||
          lowerTitle.includes("clipper") ||
          lowerTitle.includes("flint lighter")
        ) {
          result.suggested_price_min = 1;
          result.suggested_price_max = 3;
          result.suggested_price_median = 2;
          if (result.sales_velocity) {
            result.sales_velocity.sell_speed = "SLOW_BURNER";
            result.sales_velocity.est_days_to_sell = "Low Flip Margin";
            result.sales_velocity.demand_score = 30;
          }
        }
      }

      // Single Standard Pen / Pencil Sanity Guard (prevent bulk box pricing)
      if (
        (lowerTitle.includes("pen") || lowerTitle.includes("pencil") || lowerTitle.includes("marker") || lowerTitle.includes("biro")) &&
        !lowerTitle.includes("montblanc") &&
        !lowerTitle.includes("parker") &&
        !lowerTitle.includes("cross") &&
        !lowerTitle.includes("fountain") &&
        !lowerTitle.includes("vintage") &&
        !lowerTitle.includes("pack") &&
        !lowerTitle.includes("box") &&
        !lowerTitle.includes("set")
      ) {
        if (lowerTitle.includes("bic") || lowerTitle.includes("papermate") || lowerTitle.includes("sharpie") || lowerTitle.includes("ballpoint")) {
          result.suggested_price_min = 1;
          result.suggested_price_max = 3;
          result.suggested_price_median = 2;
          if (result.sales_velocity) {
            result.sales_velocity.sell_speed = "SLOW_BURNER";
            result.sales_velocity.est_days_to_sell = "Low Flip Margin";
          }
        }
      }
    }

    // Clean up brand and title from junk punctuation (e.g. "/", ".", "-") across analysis and detected_objects
    const isJunkTitle = (title?: string | null) => {
      if (!title) return true;
      const trimmed = title.trim();
      return /^[.\/_\-–—:;,#@!$%^&*()+=~`\s]+$/.test(trimmed) || trimmed.length < 3 || trimmed.replace(/[^a-zA-Z0-9]/g, "").length < 2;
    };

    if (result.analysis) {
      const rawPName = (result.analysis.product_name || "").trim();
      if (isJunkTitle(rawPName)) {
        result.analysis.product_name = "NO_CENTER_ITEM";
      }

      const rawBrand = (result.analysis.brand || "").trim();
      if (/^[.\/_\-–—:;,\s]+$/.test(rawBrand) || rawBrand.length < 2) {
        result.analysis.brand = null;
      }
    }

    if (result.detected_objects && Array.isArray(result.detected_objects)) {
      result.detected_objects = result.detected_objects.filter((obj) => !isJunkTitle(obj.product_name));
    }

    // Persist scan history to public.scans table (skip empty sentinel / junk scans)
    const rawTitle = result.analysis?.product_name || (result as any).product_name || "";
    const isSentinelScan =
      !result ||
      rawTitle === "NO_CENTER_ITEM" ||
      rawTitle.length < 3 ||
      /^[.\/_\-–—:;,\s]+$/.test(rawTitle) ||
      (result as any).category === "NO_CENTER_ITEM" ||
      result.analysis?.category === "NO_CENTER_ITEM";

    if (user && !isSentinelScan) {
      try {
        const firstImg = imageUrls[0] || "";
        const sanitizedUrl = firstImg.startsWith("data:")
          ? `data:image/jpeg;base64,...(${firstImg.length} bytes)`
          : firstImg;

        console.log('[Spadas Lens] Inserting scan record:', {
          userId: user.id,
          imageUrl: sanitizedUrl,
          tokenCount: 2600,
          status: "completed"
        });

        await supabase.from("scans").insert([
          {
            user_id: user.id,
            image_url: sanitizedUrl,
            result_json: result,
            token_count: 2600,
            status: "completed",
          },
        ]);
      } catch (dbErr) {
        console.error('[Spadas Lens] Error inserting scan record:', dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[ai-listing] Primary AI call encountered error:", err?.message);

    return NextResponse.json(createEmptyScanResult());
  } finally {
    if (userId) {
      const currentLimiter = userRateLimitMap.get(userId);
      if (currentLimiter) {
        currentLimiter.inFlight = false;
      }
    }
  }
}

async function callGemini15FlashVision(base64DataUrl: string): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  try {
    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Analyse the product in this image for an Australian reseller valuation app. Return ONLY a JSON object:
{
  "product_name": "Brand + Model + Title",
  "brand": "Brand",
  "category": "Category",
  "condition": "Used - Good",
  "suggested_price_min": 50,
  "suggested_price_max": 120,
  "suggested_price_median": 85,
  "detected_objects": [
    {
      "id": "obj-1",
      "product_name": "Brand + Model + Title",
      "brand": "Brand",
      "category": "Category",
      "condition": "Used - Good",
      "bbox": { "x": 15, "y": 15, "width": 70, "height": 70 },
      "confidence_score": 0.98
    }
  ]
}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.startsWith("AQ.")) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) return null;
    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch (e) {
    console.warn("[Gemini 1.5 Flash Vision] Sub-300ms call error:", e);
    return null;
  }
}
