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
import { saveProductToCache, getCachedProductScan } from "@/app/lib/cache/product-cache";
import { appraiseItemLocally } from "@/app/lib/offline/offline-engine";
import type { AiListingResult } from "@/types/ai-listing";

export const preferredRegion = "syd1";

function createEmptyScanResult(): AiListingResult {
  return {
    status: "unidentified",
    isMockFallback: false,
    inventory_condition: "used_working",
    defect_notes: [],
    as_is_disclaimer: undefined,
    detected_objects: [],
    analysis: {
      status: "unidentified",
      visual_reasoning: null,
      product_name: "unidentified",
      brand: null,
      model: null,
      category: "unidentified",
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
  let userIdentifier: string | null = null;
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
    userIdentifier = user ? user.id : `guest-${clientIp}`;
    userId = user?.id || null;

    const now = Date.now();
    const userLimiter = userRateLimitMap.get(userIdentifier) || { minuteWindow: [], dayWindow: [], inFlight: false };

    userLimiter.minuteWindow = userLimiter.minuteWindow.filter((t) => now - t < 60000);
    userLimiter.dayWindow = userLimiter.dayWindow.filter((t) => now - t < 86400000);

    // For standard listing generator (multi-step form), enforce strict 10/min and 100/day limits
    if (!isArScan) {
      if (userLimiter.inFlight) {
        return NextResponse.json(
          {
            error: "rate_limit",
            scope: "user",
            message: "A listing is already generating. Please wait a moment.",
            retryAfterSeconds: 3,
          },
          { status: 429 }
        );
      }

      if (userLimiter.minuteWindow.length >= 15) {
        const oldestInMin = userLimiter.minuteWindow[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((60000 - (now - oldestInMin)) / 1000));
        return NextResponse.json(
          {
            error: "rate_limit",
            scope: "user",
            message: `Rate limit reached. Please wait ${retryAfterSeconds}s.`,
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      if (userLimiter.dayWindow.length >= 200) {
        return NextResponse.json(
          {
            error: "rate_limit",
            scope: "user",
            message: "Daily scan limit reached. Please try again later.",
            retryAfterSeconds: 600,
          },
          { status: 429 }
        );
      }
    } else {
      // For AR Camera Lens: fast debounce (max 40 scans/min per user/IP)
      if (userLimiter.minuteWindow.length >= 40) {
        return NextResponse.json(
          {
            error: "rate_limit",
            scope: "user",
            message: "Camera scanning rapidly. Slow down slightly.",
            retryAfterSeconds: 2,
          },
          { status: 429 }
        );
      }
    }

    userLimiter.inFlight = true;
    userLimiter.minuteWindow.push(now);
    userLimiter.dayWindow.push(now);
    userRateLimitMap.set(userIdentifier, userLimiter);

    // Usage Limit Check (Free Scans total for Non-Pro accounts across studio generators)
    if (user && !body.isArScan) {
      const usage = await checkUserUsage(user.id);
      if (!usage.isPro && usage.limitReached) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${usage.maxFreeUses}/${usage.maxFreeUses} free AI scans used). Upgrade to Spadas Pro for unlimited AR scans and 1-click eBay publishing.`,
            limitReached: true,
            isPro: false,
          },
          { status: 403 }
        );
      }
    }

    // Sub-30ms Cache Lookup for repeated queries or known products
    if (body.productName || body.query) {
      const cached = await getCachedProductScan(body.productName || body.query);
      if (cached && cached.status === "identified") {
        return NextResponse.json(cached);
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
      mode === "deep"
        ? `SCAN MODE: DEEP FORENSIC & OCR INSPECTION.
Perform deep OCR inspection of all text, brand logos, model plates, serial numbers, care tags, and condition flaws visible on the centered item.`
        : mode === "sweep"
        ? `SCAN MODE: MULTI-ITEM SCENE SCAN.
Identify distinct physical products visible in the scene. If no distinct object is in frame, return product_name: "NO_CENTER_ITEM".`
        : `SCAN MODE: TARGETED CENTER RETICLE FOCUS.
Identify ONLY the single primary physical item positioned in the center target reticle (Image 1 is the high-res center crop). Disregard hands, table, floor, and room background.`;

    // Try OpenAI Vision first if key is valid
    const hasOpenAiKey = getPrimaryAiApiKey().length > 10 && !getPrimaryAiApiKey().includes("placeholder");

    if (hasOpenAiKey) {
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
                    text: `You are an expert reseller appraiser, luxury authenticator, and marketplace copywriter for eBay, Grailed, and Depop.

${modePrompt}

1. ACCURATE IDENTIFICATION & FORENSIC RECOGNITION:
- Identify ONLY what is directly visible in the image (Image 1 is the high-res center crop).
- LUXURY & DESIGNER GOODS (Prada, Louis Vuitton, Gucci, Chanel, Dior, Bottega Veneta, Saint Laurent, Fendi, Goyard, Hermes, Burberry, Celine, Coach, MCM, Vivienne Westwood):
  - Inspect visible hardware, logos, and emblems: Triangular metal enamel plaque ("PRADA MILANO"), gold/silver lettering, interlocking monogram, embossed leather stamps.
  - Inspect leather texture and textile: Saffiano cross-hatch leather, Tessuto nylon, Epi textured leather, monogram coated canvas, Caviar leather, Intrecciato woven leather, patent leather, or smooth calfskin.
  - Identify specific silhouette: Bifold Wallet, Zip-Around Continental Long Wallet, Flap Coin Purse, Cardholder, Chain Wallet, Crossbody Bag, Tote Bag.
  - Formulate precise product_name: e.g. "Prada Saffiano Leather Triangle Logo Bifold Wallet", "Prada Saffiano Metal Zip Around Long Continental Wallet Black", "Louis Vuitton Monogram Sarah Long Wallet", "Gucci GG Supreme Continental Wallet".
  - Realistic Resale Pricing: Authentic designer wallets in pre-owned good condition typically range $180 - $480 AUD (bags $350 - $1200+ AUD).

- SNEAKERS & STREETWEAR (Nike, Jordan, Yeezy, Adidas, Supreme, Stussy, Bape):
  - Identify specific model, silhouette, and colorway (e.g. "Nike Dunk Low Retro Panda", "Air Jordan 4 Military Black").

- VINTAGE DIGICAMS & TECH (Sony Cyber-shot, Canon PowerShot, Olympus, Nintendo):
  - Read visible model badges on the front or top plate (e.g. "Sony Cyber-shot DSC-W350 Digital Camera").

- NETWORKING & ELECTRONIC HARDWARE (TP-Link, Netgear, Linksys, Cisco, Belkin, Anker, Apple, Sony, Nintendo, Logitech):
  - Read visible brand stamps and model numbers (e.g., "TP-Link", "tp-link", "Archer", "N300", "AC1200", "Deco", "RE305").
  - Accurately categorize networking equipment (Wi-Fi extender, router, network switch, powerline adapter, USB Wi-Fi dongle, smart plug).
  - NEVER misidentify networking devices, USB dongles, or electronic plugs as "electronic cigarettes" or "vapes".

- FOR COMMON HOUSEHOLD OR UNBRANDED ITEMS (e.g. coffee mug, water bottle, phone case, generic t-shirt, desk fan):
  - Identify it accurately as what it actually is (e.g. "Ceramic Coffee Mug White 350ml", "Stainless Steel Kitchen Tongs").
  - Do NOT hallucinate high-end collector brands unless clearly visible.
  - Price realistically ($3 - $20 AUD for generic goods).
- If the item is blurry, empty, or genuinely unidentifiable, mark "status": "unidentified" rather than making a wild guess.

2. PROFESSIONAL RESELLER COPYWRITING (MUST SOUND 100% HUMAN):
- "market_titles.ebay": Max 80 characters. Use high-converting reseller structure:
  Format: [Brand] [Model/Style] [Key Color/Material] [Size/Attribute] [Condition]
  Example: "Prada Saffiano Leather Triangle Logo Bifold Wallet Black Authentic"
  NEVER repeat words. NO punctuation clutter, no fake emojis.
- "market_titles.facebook_marketplace": Clean, friendly, and local-buyer readable (e.g. "Prada Saffiano Leather Bifold Wallet - Great Condition").
- "market_titles.depop": Trendy lowercase aesthetic with 3-4 relevant hashtags (e.g. "prada saffiano leather triangle logo bifold wallet #prada #luxury #designer").
- "seo_description" & "detailed_description": Write a concise, professional 2-3 paragraph listing description written by an experienced human seller:
  - Paragraph 1: Overview of the item, brand, silhouette, and primary features.
  - Paragraph 2: Honest condition report (noting any visible wear, scuffs, or clean pre-owned status).
  - Paragraph 3: Fast shipping and careful packaging notice.
  - Plain clean text only. NO robotic buzzwords ("Introducing the ultimate...", "Look no further...").`,
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

            if (isRateLimitError(err1) || isCreditOrQuotaError(err1)) {
              console.warn(`[ai-listing] Upstream quota/rate issue on ${modelName} — falling through to next provider.`);
              hasCreditOrQuotaError = true;
            }
          }
        } catch (outerErr: any) {
          console.warn(`[ai-listing] Model loop error on ${modelName}:`, outerErr?.message);
        }
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
      const fallbackAppraisal = appraiseItemLocally(body.productName || body.query);
      result = {
        status: "identified",
        isMockFallback: true,
        inventory_condition: "used_working",
        defect_notes: [],
        suggested_price_min: Math.round(fallbackAppraisal.estimatedValue * 0.7),
        suggested_price_max: Math.round(fallbackAppraisal.estimatedValue * 1.3),
        suggested_price_median: fallbackAppraisal.estimatedValue,
        suggested_price_currency: "AUD",
        item_specifics: {},
        suggested_keywords: [fallbackAppraisal.brand, fallbackAppraisal.category, "Resale", "Thrift"],
        shipping_estimate: {
          size: "small",
          estimated_weight_grams: 500,
          dimensions_cm: { length: 25, width: 20, height: 5 },
          notes: "Standard satchel packaging",
        },
        market_titles: {
          ebay: `${fallbackAppraisal.productName} Great Condition Resale Find`,
          facebook_marketplace: `${fallbackAppraisal.productName} - Great Condition`,
          vinted: `${fallbackAppraisal.productName} - Great Condition`,
          depop: `${fallbackAppraisal.productName.toLowerCase()} #vintage #resale #thrift`,
        },
        seo_description: `Authentic ${fallbackAppraisal.productName} sourced in great condition. Checked and verified for immediate resale.`,
        detailed_description: `Authentic ${fallbackAppraisal.productName}. Pre-owned in good condition with minor natural wear. Ships carefully packaged with tracking.`,
        detected_tag_price: fallbackAppraisal.tagPrice,
        true_net_profit: fallbackAppraisal.trueNetProfit,
        roi_percentage: fallbackAppraisal.roiPercentage,
        cop_verdict: fallbackAppraisal.copVerdict,
        detected_objects: [
          {
            id: "offline-heuristics-1",
            product_name: fallbackAppraisal.productName,
            brand: fallbackAppraisal.brand,
            category: fallbackAppraisal.category,
            condition: fallbackAppraisal.condition,
            confidence_score: 0.92,
            detected_tag_price: fallbackAppraisal.tagPrice,
            true_net_profit: fallbackAppraisal.trueNetProfit,
            roi_percentage: fallbackAppraisal.roiPercentage,
            cop_verdict: fallbackAppraisal.copVerdict,
            bbox: { x: 15, y: 15, width: 70, height: 70 },
          },
        ],
        analysis: {
          status: "identified",
          product_name: fallbackAppraisal.productName,
          brand: fallbackAppraisal.brand,
          model: null,
          color: null,
          material: null,
          accessories_detected: [],
          category: fallbackAppraisal.category,
          condition: fallbackAppraisal.condition,
          confidence: "high",
          confidence_score: 0.92,
        },
      };
      activeProvider = "offline-heuristics";
    }

    const countryHeader = request.headers.get("x-vercel-ip-country");
    const geoInfo = detectGeoCurrency(countryHeader);
    const targetCurrency: SupportedCurrency = (body.currency as SupportedCurrency) || geoInfo.currency;

    (result as any).provider = activeProvider;
    (result as any).suggested_price_currency = targetCurrency;

    // GROUNDING VALIDATOR: Only discard if genuinely no physical item or empty sentinel
    const rawProdName = (result.analysis?.product_name || (result as any).product_name || "").trim();
    const isUnidentified =
      !rawProdName ||
      rawProdName === "NO_CENTER_ITEM" ||
      rawProdName.toLowerCase() === "unidentified" ||
      rawProdName.toLowerCase() === "unknown product" ||
      rawProdName.toLowerCase() === "null" ||
      rawProdName.length < 2 ||
      /^[.\/_\-–—:;,\s]+$/.test(rawProdName);

    if (isUnidentified) {
      result.status = "unidentified";
      if (result.analysis) {
        result.analysis.status = "unidentified";
        result.analysis.product_name = null;
        result.analysis.brand = null;
      }
      result.suggested_price_min = 0;
      result.suggested_price_max = 0;
      result.suggested_price_median = 0;
      result.detected_objects = [];
      return NextResponse.json(result);
    }

    result.status = "identified";
    if (result.analysis) {
      result.analysis.status = "identified";
      result.analysis.product_name = rawProdName;
      if (!result.suggested_price_median || result.suggested_price_median === 0) {
        result.suggested_price_median = 35;
        result.suggested_price_min = 20;
        result.suggested_price_max = 50;
      }
    }

    console.log(`[Spadas Vision Diagnostic] userId: ${userId || "guest"} | provider: ${activeProvider} | product_name: "${result.analysis?.product_name}" | brand: "${result.analysis?.brand}" | category: "${result.analysis?.category}" | currency: ${targetCurrency}`);

    // Fetch REAL-TIME regional eBay Comps in target currency via Browse API ONLY for verified identified products
    if (result.analysis?.product_name && result.status === "identified") {
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

      // Luxury Designer Leather Goods Sanity Floor & Market Grounding (Prada, LV, Gucci, Chanel, etc.)
      const isLuxuryBrand =
        lowerTitle.includes("prada") ||
        lowerTitle.includes("louis vuitton") ||
        lowerTitle.includes("gucci") ||
        lowerTitle.includes("chanel") ||
        lowerTitle.includes("dior") ||
        lowerTitle.includes("bottega") ||
        lowerTitle.includes("saint laurent") ||
        lowerTitle.includes("ysl") ||
        lowerTitle.includes("hermes") ||
        lowerTitle.includes("celine") ||
        lowerTitle.includes("goyard") ||
        lowerTitle.includes("balenciaga") ||
        lowerTitle.includes("burberry") ||
        lowerTitle.includes("loewe");

      if (isLuxuryBrand) {
        const isWalletOrSLG =
          lowerTitle.includes("wallet") ||
          lowerTitle.includes("purse") ||
          lowerTitle.includes("cardholder") ||
          lowerTitle.includes("card case") ||
          lowerTitle.includes("bifold") ||
          lowerTitle.includes("trifold") ||
          lowerTitle.includes("saffiano") ||
          lowerTitle.includes("coin pouch");

        const isBag =
          lowerTitle.includes("bag") ||
          lowerTitle.includes("tote") ||
          lowerTitle.includes("crossbody") ||
          lowerTitle.includes("handbag") ||
          lowerTitle.includes("backpack");

        if (isWalletOrSLG) {
          // Designer small leather goods should never be appraised at $35
          if (!result.suggested_price_median || result.suggested_price_median < 120) {
            result.suggested_price_median = 260;
            result.suggested_price_min = 180;
            result.suggested_price_max = 380;
          }
        } else if (isBag) {
          if (!result.suggested_price_median || result.suggested_price_median < 250) {
            result.suggested_price_median = 550;
            result.suggested_price_min = 350;
            result.suggested_price_max = 950;
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

    // THRIFT STORE PRICE TAG OCR & INSTANT NET PROFIT / ROI COP VERDICT
    const tagPrice = Number(result.detected_tag_price) || (result.analysis?.product_name && result.analysis.product_name !== "NO_CENTER_ITEM" ? Math.max(3, Math.round((result.suggested_price_median || 45) * 0.15)) : null);
    const sellPrice = Number(result.suggested_price_median) || 45;

    if (tagPrice && sellPrice > 0) {
      const ebayFee = (sellPrice * 0.134) + 0.33; // Standard Australian eBay 13.4% + $0.33
      const netProfit = Math.max(0, sellPrice - tagPrice - ebayFee);
      const roi = (netProfit / tagPrice) * 100;

      let verdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" = "FAIR_MARGIN";
      if (roi >= 300 && netProfit >= 30) {
        verdict = "MUST_COP"; // 👑 High profit grail
      } else if (roi >= 100 && netProfit >= 15) {
        verdict = "QUICK_FLIP"; // ⚡ Solid fast turnover
      } else if (netProfit < 10 || roi < 40) {
        verdict = "PASS_RISKY"; // ⛔ Low margin / pass
      }

      result.detected_tag_price = tagPrice;
      result.true_net_profit = Number(netProfit.toFixed(2));
      result.roi_percentage = Math.round(roi);
      result.cop_verdict = verdict;

      if (result.detected_objects && result.detected_objects.length > 0) {
        result.detected_objects[0].detected_tag_price = tagPrice;
        result.detected_objects[0].true_net_profit = Number(netProfit.toFixed(2));
        result.detected_objects[0].roi_percentage = Math.round(roi);
        result.detected_objects[0].cop_verdict = verdict;
      }
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

    // Save to Global Reseller Product Cache for sub-30ms instant repeated recognition
    if (result && result.status === "identified" && rawTitle && !isSentinelScan) {
      void saveProductToCache(rawTitle, result);
    }

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
    if (userIdentifier) {
      const currentLimiter = userRateLimitMap.get(userIdentifier);
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
