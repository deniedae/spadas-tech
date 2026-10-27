import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkUserUsage } from "@/app/lib/usage";
import { createOpenAiClient, getPrimaryAiApiKey, LISTING_MODEL } from "@/app/lib/config/ai-models";
import { hasGrokApiKey, createGrokClient, GROK_VISION_MODEL } from "@/app/lib/config/grok-vision";
import { checkNeedsVerification } from "@/lib/forensic-knowledge";
import { estimateAustralianMarketValue } from "@/lib/valuation-heuristics";
import { estimateCategoryShippingCost, detectThriftTrap, calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { calculateMarketplaceFees } from "@/lib/fee-engine";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import { fetchEbayAustraliaSoldComps } from "@/app/lib/ebay-australia-comps";
import { detectGeoCurrency, extractCountryHeader, resolveEffectiveCurrency } from "@/app/lib/currency-routing";
import { crossCheckScanAccuracy, type ScanAccuracyVerificationResult } from "@/lib/multi-ai-verifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const preferredRegion = "syd1";

interface RapidThriftResponse {
  product_name: string;
  brand: string;
  category: string;
  condition: string;
  estimated_value: number;
  thrift_cost: number;
  true_net_profit: number;
  roi_percentage: number;
  cop_verdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" | "VERIFY_FIRST";
  is_grail: boolean;
  needs_verification: boolean;
  notes: string;
  consensus_verification?: ScanAccuracyVerificationResult;
  sales_velocity?: {
    sell_speed: "FAST_FLIP" | "MODERATE" | "SLOW_BURNER";
    est_days_to_sell: string;
    demand_score: number;
    sell_through_rate: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { image } = body;
    const countryHeader = extractCountryHeader(req);
    const currency = resolveEffectiveCurrency(body.currency, countryHeader);

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image data URL or URL is required." },
        { status: 400 }
      );
    }

    // Authenticate user via Bearer header or cookies
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
      const { data, error } = await supabase.auth.getUser();
      if (!error) user = data?.user;
    }

    // Daily Scan Limit Check
    if (user) {
      const usage = await checkUserUsage(user.id, user.email);
      if (!usage.isPro && usage.limitReached) {
        return NextResponse.json(
          {
            error: `Free scan limit reached (${usage.usesCount}/${usage.maxFreeUses} scans used). Upgrade to Spadas Pro for unlimited scans.`,
            limitReached: true,
            isPro: false,
            maxFreeUses: usage.maxFreeUses,
            usesCount: usage.usesCount,
          },
          { status: 402 }
        );
      }
    }

    const hasGrok = hasGrokApiKey();
    const apiKey = getPrimaryAiApiKey();
    if (!hasGrok && !apiKey) {
      console.warn("[Rapid Thrift API] No AI API Key configured on server.");
      return NextResponse.json(
        {
          error: "AI Vision API key is not configured on the server",
          code: "MISSING_API_KEY",
          recoverable: false,
        },
        { status: 503 }
      );
    }

    const systemPrompt = `<role>
You are an expert secondary market resale appraiser and eBay comps sourcing specialist.
Analyze the item photo to extract exact identification attributes and calculate net cleared profit.
</role>

<search_query_protocol>
- Query Format: [Brand] [Model/Number] [Key Specific] (e.g., "TP-Link RE305", "Carhartt J130 Duck Jacket", "Tous H2O 100ml").
- Strip subjective qualifiers ("nice", "rare", "clean", "authentic", "vintage" unless part of model name).
- Prioritize visible brand badges, model numbers, serial tags, care labels, and barcode/UPC text.
- Inspect logos and badges (e.g. TP-Link, Netgear, Linksys, Cisco, Belkin, Anker, Sony, Nintendo, Apple, Logitech, Carhartt, Nike, Patagonia, Ralph Lauren).
- For unbranded or generic items, do not guess high-end niche brands.
</search_query_protocol>

<resale_profit_math>
Currency: ${currency}
Net Profit = Resale Value - Thrift Cost - Platform Fees (13.4% + $0.33) - Tracked Postage ($4.20 - $11.00).

Trap Identification:
- Mass-Market Media (standard DVDs, CDs): Value $3-$5 gross -> PASS_RISKY (postage exceeds value).
- Budget Commodity Electronics (Amazon Basics, Insignia, Onn): PASS_RISKY (postage exceeds resale value).
- Bulky Low-Value Ceramics & Glassware: PASS_RISKY (fragile shipping cost exceeds margin).
</resale_profit_math>

<verdict_thresholds>
- MUST_COP: Net profit >= $40 after fees and shipping.
- QUICK_FLIP: Net profit >= $15 with rapid inventory turnover.
- PASS_RISKY: Net profit < $8 or low demand/high shipping liability.
</verdict_thresholds>

<output_format>
Output ONLY valid JSON adhering strictly to:
{
  "product_name": string,
  "brand": string,
  "category": string,
  "condition": string,
  "estimated_value": number,
  "thrift_cost": number,
  "true_net_profit": number,
  "roi_percentage": number,
  "cop_verdict": "MUST_COP" | "QUICK_FLIP" | "PASS_RISKY",
  "is_grail": boolean,
  "needs_verification": boolean,
  "notes": string
}
</output_format>`;

    const cleanImage = image.trim().replace(/[\r\n]/g, "");

    const promptMessages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: `Appraise the item in the image for resale in ${currency}.` },
          {
            type: "image_url",
            image_url: {
              url: cleanImage,
              detail: "high",
            },
          },
        ],
      },
    ];

    let rawContent: string | null = null;

    // 1. High-Performance Tier: xAI Grok-2 Vision (Super-fast visual recognition & OCR)
    if (hasGrok) {
      try {
        const grok = createGrokClient();
        if (grok) {
          const completion = await grok.chat.completions.create({
            model: GROK_VISION_MODEL,
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 600,
            messages: promptMessages,
          });
          rawContent = completion.choices?.[0]?.message?.content || null;
        }
      } catch (grokErr: any) {
        console.warn("[Rapid Thrift API] Grok-2 Vision failed, falling back to OpenAI:", grokErr?.message || grokErr);
      }
    }

    // 2. Core Tier: OpenAI Vision (Latest GPT-4o)
    if (!rawContent && apiKey) {
      try {
        const openai = createOpenAiClient();
        const completion = await openai.chat.completions.create({
          model: LISTING_MODEL,
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 600,
          messages: promptMessages,
        });
        rawContent = completion.choices?.[0]?.message?.content || null;
      } catch (openaiErr: any) {
        console.error(
          `[Rapid Thrift API] OpenAI fallback call failed (${openaiErr?.status || 500}):`,
          openaiErr?.message || openaiErr
        );
      }
    }

    if (!rawContent) {
      console.warn("[Rapid Thrift API] Vision appraisal model produced an empty response");
      return NextResponse.json(
        {
          error: "Upstream AI vision model call failed. Please check connection and retry.",
          code: "UPSTREAM_AI_ERROR",
          status: 500,
        },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(rawContent);

    let pName = parsed.product_name || "Thrift Item";
    let pBrand = parsed.brand || "Authentic";
    let pCategory = parsed.category || "General";

    // Continuous Multi-AI Accuracy Cross-Check:
    // Secondary AI auditor inspects brand, model, and OCR integrity to verify accuracy before comps
    const consensusVerification = await crossCheckScanAccuracy(image, {
      productName: pName,
      brand: pBrand === "Authentic" ? null : pBrand,
      category: pCategory,
      confidenceScore: typeof parsed.confidence_score === "number" ? parsed.confidence_score : 0.88,
      primaryProvider: hasGrok ? "xAI-Grok" : "OpenAI",
      ocrWords: Array.isArray(parsed.ocr_text) ? parsed.ocr_text : [],
    }).catch((err) => {
      console.warn("[Rapid Thrift API] Continuous cross-check non-blocking warning:", err);
      return null;
    });

    if (consensusVerification) {
      if (consensusVerification.status === "corrected" || consensusVerification.status === "verified_consensus") {
        pName = consensusVerification.verifiedProductName || pName;
        pBrand = consensusVerification.verifiedBrand || pBrand;
        pCategory = consensusVerification.verifiedCategory || pCategory;
      } else if (consensusVerification.status === "disputed_brand") {
        // Disputed brand: neutralize brand so comps query doesn't hallucinate fake value
        pBrand = "Unbranded";
      }
    }

    // Query real eBay sold comps to ground rapid-thrift in verified market data
    const compsData = await fetchEbayAustraliaSoldComps(pName, currency as any, pBrand, pCategory).catch((cErr: any) => {
      console.warn("[Rapid Thrift API] Comps lookup error:", cErr?.message || cErr);
      return null;
    });

    const hasRealComps = Boolean(compsData && !compsData.noMarketData && compsData.median > 0);
    const catEst = estimateAustralianMarketValue({
      title: pName,
      brand: pBrand,
      category: pCategory,
      condition: parsed.condition,
    });

    const isRegionUS = (currency || "").toUpperCase() === "USD";
    const isRegionUK = (currency || "").toUpperCase() === "GBP";
    const estVal = hasRealComps ? compsData!.median : (compsData?.noMarketData ? 0 : catEst.estimatedMedian);
    const estCost = Number(parsed.thrift_cost) || (isRegionUK ? Math.round(catEst.typicalOpShopCost * 0.55 * 100) / 100 : isRegionUS ? Math.round(catEst.typicalOpShopCost * 0.7 * 100) / 100 : catEst.typicalOpShopCost);
    const ebayFee = estVal > 0 ? calculateMarketplaceFees(estVal, currency) : 0;

    // Deduct realistic category parcel shipping (Royal Mail for GBP, USPS for USD, AusPost for AUD)
    const shippingCost = estimateCategoryShippingCost(pCategory, pName, currency);
    const calculatedNetProfit = estVal > 0 ? Math.max(0, Math.round((estVal - estCost - ebayFee - shippingCost) * 100) / 100) : 0;
    const netProfit = typeof parsed.true_net_profit === "number" && parsed.true_net_profit < calculatedNetProfit
      ? parsed.true_net_profit
      : calculatedNetProfit;
    const roi = estCost > 0 ? Math.round((netProfit / estCost) * 100) : 0;

    // Check for thrift traps (Common DVDs, Amazon Basics, Novelty Mugs)
    const trap = detectThriftTrap(pName, estVal, pBrand);

    // Calculate Empirical Sell-Through Rate (STR) and Turnover Speed
    const velocity = calculateSalesVelocity({
      productName: pName,
      category: pCategory,
      brand: pBrand,
    });

    const verificationCheck = checkNeedsVerification({
      name: pName,
      brand: pBrand,
      category: pCategory,
      estimatedValue: estVal,
    });

    const copEstimate = calculateThriftCopVerdict({
      resalePrice: estVal,
      customCost: estCost,
      category: pCategory,
      productName: pName,
      brand: pBrand,
      shippingCost,
      confidenceScore: parsed.confidence_score,
      needsVerification: Boolean(parsed.needs_verification || verificationCheck.needsVerification),
    });

    const copVerdict = copEstimate.copVerdict;
    let notes = parsed.notes || "";
    if (copVerdict === "VERIFY_FIRST") {
      notes = copEstimate.verificationReason || notes || "Secondary verification required before buy recommendation.";
    } else if (copEstimate.verdictDescription) {
      notes = notes || copEstimate.verdictDescription;
    }

    const result: RapidThriftResponse = {
      product_name: pName,
      brand: pBrand,
      category: pCategory,
      condition: parsed.condition || "Used - Good",
      estimated_value: estVal,
      thrift_cost: estCost,
      true_net_profit: netProfit,
      roi_percentage: roi,
      cop_verdict: copVerdict,
      is_grail: copVerdict === "MUST_COP",
      needs_verification: Boolean(parsed.needs_verification || verificationCheck.needsVerification),
      notes,
      consensus_verification: consensusVerification || undefined,
      sales_velocity: {
        sell_speed:
          velocity.turnoverTier === "RAPID_FIRE"
            ? "FAST_FLIP"
            : velocity.turnoverTier === "STEADY_TURN"
            ? "MODERATE"
            : "SLOW_BURNER",
        est_days_to_sell: velocity.estDaysToSell,
        demand_score: velocity.demandScore,
        sell_through_rate: `${velocity.sellThroughRate}%`,
      },
    };

    if (user) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const dbClient =
          supabaseUrl && serviceRoleKey
            ? (await import("@supabase/supabase-js")).createClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
              })
            : supabase;

        let finalImageUrl = image;
        if (image.startsWith("data:")) {
          try {
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, "base64");
              const ext = mimeType.split("/")[1] || "jpeg";
              const filename = `scans/${user.id}-${Date.now()}.${ext}`;

              const { data: uploadData, error: uploadErr } = await dbClient.storage
                .from("listing-images")
                .upload(filename, buffer, {
                  contentType: mimeType,
                  upsert: true,
                });

              if (!uploadErr && uploadData) {
                const { data: publicUrlData } = dbClient.storage
                  .from("listing-images")
                  .getPublicUrl(filename);
                if (publicUrlData?.publicUrl) {
                  finalImageUrl = publicUrlData.publicUrl;
                }
              }
            }
          } catch {
            // Keep full image data URL if storage upload not available
          }
        }

        await dbClient.from("scans").insert([
          {
            user_id: user.id,
            image_url: finalImageUrl,
            result_json: result,
            token_count: 500,
            status: "completed",
          },
        ]);
      } catch (logErr) {
        console.warn("[rapid-thrift] Failed to log scan record:", logErr);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Rapid Thrift API] Appraisal processing failed:", err?.message || err);
    return NextResponse.json(
      {
        error: err?.message || "Vision appraisal failed",
        code: "SERVICE_UNAVAILABLE",
        recoverable: true,
      },
      { status: 503 }
    );
  }
}

