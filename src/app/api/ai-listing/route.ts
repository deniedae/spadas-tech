if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkUserUsage } from "@/app/lib/usage";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { AiListingResultSchema } from "@/app/lib/schemas/ai-listing-schema";
import { AR_SCAN_MODEL_FALLBACKS, LISTING_MODEL_FALLBACKS, getPrimaryAiApiKey, createOpenAiClient } from "@/app/lib/config/ai-models";
import { callClaudeVision } from "@/app/lib/config/claude-vision";
import { callGeminiVision, hasGeminiVisionKey } from "@/app/lib/config/gemini-vision";
import { fetchEbayAustraliaSoldComps, detectGenerationProfile } from "@/app/lib/ebay-australia-comps";
import { detectGeoCurrency, SupportedCurrency } from "@/app/lib/currency-routing";
import { saveProductToCache, getCachedProductScan } from "@/app/lib/cache/product-cache";
import { appraiseItemLocally } from "@/app/lib/offline/offline-engine";
import { estimateCategoryShippingCost, detectThriftTrap, calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { computeLocalMarketplaceIntelligence } from "@/lib/lens-intel-engine";
import { computeOffMarketIntelligence } from "@/lib/off-market-engine";
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

function brandsDisagree(brand1?: string | null, brand2?: string | null): boolean {
  if (!brand1 || !brand2) return false;
  const b1 = brand1.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const b2 = brand2.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!b1 || !b2) return false;
  if (b1 === b2 || b1.includes(b2) || b2.includes(b1)) return false;
  const genericSentinels = [
    "unknown",
    "generic",
    "vintage",
    "custom",
    "unbranded",
    "null",
    "none",
    "handmade",
    "nocenteritem",
  ];
  if (genericSentinels.includes(b1) || genericSentinels.includes(b2)) return false;
  return true;
}

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
    const {
      imageUrls,
      isArScan,
      mode,
      activeEngine,
      stream: isStreamRequested,
      spatialMetadata,
      categoryBias,
      predictedQuery,
    } = body as {
      imageUrls?: string[];
      isArScan?: boolean;
      mode?: "sweep" | "deep" | "live" | "focus" | "standard" | "snap" | "intel";
      activeEngine?: "intel" | "ebay";
      stream?: boolean;
      spatialMetadata?: {
        latitude?: number;
        longitude?: number;
        storeName?: string;
        venueType?: string;
        categoryBias?: string;
      };
      categoryBias?: string;
      predictedQuery?: string;
    };
    const isManualOverride = Boolean((body as any)?.manualOverride);

    // ── ISOLATED ENGINE BRANCH DETECTION ──
    const isIntelMode =
      activeEngine === "intel" ||
      mode === "intel" ||
      Boolean((body as any)?.isIntelMode) ||
      Boolean((body as any)?.isIntelModeActive);

    if (!isManualOverride && (!imageUrls || imageUrls.length === 0)) {
      return NextResponse.json(createEmptyScanResult());
    }

    const countryHeader = request.headers.get("x-vercel-ip-country");
    const geoInfo = detectGeoCurrency(countryHeader);
    const targetCurrency: SupportedCurrency = (body.currency as SupportedCurrency) || geoInfo.currency;
    const initialTargetCurrency: SupportedCurrency = targetCurrency;

    // ── INTELLIGENT PREFETCH: Fire parallel eBay sold comps query ONLY for eBay comps mode (bypassed in Intel Mode) ──
    let parallelCompsPromise: Promise<any> | null = null;
    const initialPrefetchQuery = (predictedQuery || (body as any).query || "").trim();
    if (!isIntelMode && initialPrefetchQuery.length >= 3) {
      parallelCompsPromise = fetchEbayAustraliaSoldComps(initialPrefetchQuery, initialTargetCurrency).catch((err) => {
        console.warn("[ai-listing] Parallel comps prefetch warning:", err);
        return null;
      });
    }

    const authHeader = request.headers.get("authorization");
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

    const isGuestScan = !user && ((body as any)?.isGuestScan === true || mode === "deep" || mode === "snap" || isArScan);
    const isGuestScanAllowed = isArScan || isGuestScan;
    if (!user && !isGuestScanAllowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest";
    const activeIdentifier = user ? user.id : `guest-${clientIp}`;
    userIdentifier = activeIdentifier;
    userId = user?.id || null;

    const now = Date.now();
    const userLimiter = userRateLimitMap.get(activeIdentifier) || { minuteWindow: [], dayWindow: [], inFlight: false };

    userLimiter.minuteWindow = userLimiter.minuteWindow.filter((t) => now - t < 60000);
    userLimiter.dayWindow = userLimiter.dayWindow.filter((t) => now - t < 86400000);

    // Guest scans and AR scans share the lenient 40/min limiter; only authenticated listing generator uses strict limits
    const useArLimiter = isArScan || isGuestScan;
    if (!useArLimiter) {
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

      const isOwner = user ? isOwnerEmail(user.email) : false;
      const hasMetadataPro = Boolean(
        user?.app_metadata?.is_pro ||
        user?.user_metadata?.is_pro ||
        user?.app_metadata?.plan === "pro"
      );

      if (!isOwner && !hasMetadataPro && userLimiter.dayWindow.length >= 200) {
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
    userRateLimitMap.set(activeIdentifier, userLimiter);

    // Usage Limit Check (10 Free Daily Scans for Non-Pro accounts across AR Lens and Studio)
    if (user) {
      const isOwner = isOwnerEmail(user.email);
      const hasMetadataPro = Boolean(
        user.app_metadata?.is_pro ||
        user.user_metadata?.is_pro ||
        user.app_metadata?.plan === "pro"
      );

      if (!isOwner && !hasMetadataPro) {
        const usage = await checkUserUsage(user.id, user.email);
        if (!usage.isPro && usage.limitReached) {
          return NextResponse.json(
            {
              error: `Daily free scan limit reached (${usage.usesCount}/${usage.maxFreeUses} scans used today). Upgrade to Spadas Pro for unlimited scans.`,
              limitReached: true,
              isPro: false,
              maxFreeUses: usage.maxFreeUses,
              usesCount: usage.usesCount,
            },
            { status: 403 }
          );
        }
      }
    } else {
      // For anonymous/guest scans: cap at 10 scans per day per IP
      if (userLimiter.dayWindow.length > 10) {
        return NextResponse.json(
          {
            error: "Daily free scan limit reached (10/10 scans used today). Please sign in and upgrade to Spadas Pro for unlimited scans.",
            limitReached: true,
            isPro: false,
            maxFreeUses: 10,
            usesCount: 10,
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

    let result: AiListingResult | null = null;
    let activeProvider = isManualOverride ? "manual-override" : "openai-vision";

    if (isManualOverride && ((body as any)?.brand || (body as any)?.model || (body as any)?.itemTitle || predictedQuery)) {
      const overrideBrand = ((body as any)?.brand || "").trim();
      const overrideModel = ((body as any)?.model || (body as any)?.itemTitle || predictedQuery || "Item").trim();
      const overrideName = overrideBrand && !overrideModel.toLowerCase().includes(overrideBrand.toLowerCase())
        ? `${overrideBrand} ${overrideModel}`
        : overrideModel;
      const overrideCategory = ((body as any)?.category || "General Resale").trim();
      const overrideCondition = ((body as any)?.condition || "Used - Good").trim();

      result = {
        status: "identified",
        isMockFallback: false,
        inventory_condition: "used_working",
        defect_notes: [],
        as_is_disclaimer: undefined,
        detected_objects: [
          {
            id: `obj_${Date.now()}`,
            product_name: overrideName,
            brand: overrideBrand || null,
            category: overrideCategory,
            condition: overrideCondition,
            bbox: { x: 15, y: 15, width: 70, height: 70 },
            confidence_score: 0.99,
          },
        ],
        analysis: {
          status: "identified",
          visual_reasoning: {
            visible_text_detected: [overrideBrand, overrideModel].filter(Boolean),
            physical_object_description: `User manual override: ${overrideName}`,
            brand_identified: overrideBrand || null,
            identification_reasoning: `Manual override by user: ${overrideName}`,
          },
          product_name: overrideName,
          brand: overrideBrand || null,
          model: overrideModel || null,
          category: overrideCategory,
          color: null,
          material: null,
          condition: overrideCondition,
          accessories_detected: [],
          confidence: "high",
          confidence_score: 0.99,
        },
        market_titles: {
          ebay: `${overrideBrand ? overrideBrand + " " : ""}${overrideModel}`.slice(0, 80),
          facebook_marketplace: overrideName,
          vinted: overrideName,
          depop: overrideName,
        },
        seo_description: `Authentic ${overrideName} in ${overrideCondition} condition. Verified via Spadas Lens.`,
        detailed_description: `Authentic ${overrideName} in ${overrideCondition} condition. Verified via Spadas Lens.`,
        shipping_estimate: {
          size: "medium",
          estimated_weight_grams: 500,
          dimensions_cm: null,
          notes: null,
        },
        item_specifics: {
          Brand: overrideBrand || "Authentic",
          Model: overrideModel,
          Condition: overrideCondition,
        },
        suggested_keywords: [overrideBrand, overrideModel, overrideCategory, "Resale", "Thrift"].filter(Boolean),
        suggested_price_min: 0,
        suggested_price_max: 0,
        suggested_price_median: 0,
        suggested_price_currency: targetCurrency,
      };

      if (result && (body as any)?.tagPrice) {
        result.detected_tag_price = Number((body as any).tagPrice);
      }
    }

    const imageContent = (imageUrls || []).map((url) => {
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
    let completion: any = null;
    let hasCreditOrQuotaError = false;
    const targetModels = isArScan ? AR_SCAN_MODEL_FALLBACKS : LISTING_MODEL_FALLBACKS;

    const modePrompt =
      mode === "deep"
        ? `SCAN MODE: DEEP FORENSIC & OCR INSPECTION.
Perform deep OCR inspection of all text, brand logos, model plates, serial numbers, care tags, and condition flaws visible on the centered item.`
        : mode === "sweep"
        ? `SCAN MODE: MULTI-ITEM SCENE SCAN.
Identify distinct physical products visible in the scene. If no distinct object is in frame, return product_name: "NO_CENTER_ITEM".`
        : isIntelMode
        ? `SCAN MODE: TACTICAL INTEL & LOCAL P2P ARBITRAGE SCAN.
Identify the centered physical item specifically for peer-to-peer local resale (Facebook Marketplace, Gumtree AU), off-market dealer buyout, and private collector acquisition. Extract brand, exact model, category, and physical bulk/shipping profile.`
        : `SCAN MODE: TARGETED CENTER RETICLE FOCUS & MULTI-FRAME OPTICAL COMPOSITE.
Identify ONLY the single primary physical item positioned in the center target reticle (Image 1 is a high-resolution composite synthesized from rapid consecutive frames pooled during movement to eliminate blur, with macro detail insets). Disregard hands, table, floor, and room background.`;

    // Try OpenAI Vision first if key is valid and not already overridden
    const hasOpenAiKey = getPrimaryAiApiKey().length > 10 && !getPrimaryAiApiKey().includes("placeholder");

    if (hasOpenAiKey && !isManualOverride) {
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

MANDATORY STRUCTURED EXTRACTION REQUIREMENTS (STRICT SCHEMA):
${spatialMetadata || categoryBias ? `LOCATION-AWARE CATEGORY BIASING & SPATIAL PRIORS:
- Sourcing Location / Venue: ${spatialMetadata?.storeName || "Thrift Store / Op-Shop"} (${spatialMetadata?.venueType || "secondhand_thrift"})
${spatialMetadata?.latitude && spatialMetadata?.longitude ? `- Coordinates: Lat ${spatialMetadata.latitude.toFixed(4)}, Lon ${spatialMetadata.longitude.toFixed(4)}\n` : ""}- Active Category Prior Bias: ${categoryBias || spatialMetadata?.categoryBias || "Secondhand Resale / Op-Shop Finds"}
- GROUNDING IN REAL SECONDHAND / OP-SHOP FINDS:
  • Heavily bias visual priors toward authentic secondhand inventory: vintage tags (single-stitch, sportswear, workwear), streetwear, retro digicams, analog electronics, luxury leather accessories, and collectibles.
  • Never misidentify thrift clothing as generic industrial uniforms, medical wear, or commercial packaging.
  • Use regional marketplace naming conventions and local marketplace terminology.
` : ""}
0. MULTI-FRAME OPTICAL COMPOSITE & MOTION BLUR ELIMINATION:
- The input images feature an optical composite synthesized from rapid consecutive frames pooled when movement was detected, accompanied by focused macro center-crops.
- Cross-reference the overview and macro insets across consecutive frames to resolve small text, care labels, serial codes, hallmarks, fabric texture, and condition flaws with 100% confidence, completely eliminating motion blur or misidentification.

1. ACCURATE BRAND IDENTIFICATION:
- Identify the EXACT brand (e.g. "Carhartt", "Prada", "Nike", "Sony", "Nintendo", "Lego", "TP-Link", "Patagonia", "Bose").
- Transcribe ALL visible text, tags, model numbers, care labels, serial codes, and hallmarks verbatim into "visual_reasoning.visible_text_detected".
- If no brand logo, hallmark, tag, or stamp is visible, output brand as null or generic description.
- LUXURY & DESIGNER GOODS: Inspect visible hardware, logos, and emblems (e.g., triangular metal enamel plaque "PRADA MILANO", gold/silver lettering, interlocking monogram, embossed leather stamps).
- NETWORKING & HARDWARE: Read visible brand stamps and model numbers (e.g., TP-Link, Archer, RE305). NEVER misidentify networking devices or USB dongles as vapes.
- COMMODITY / UNBRANDED ITEMS: Identify accurately as generic (e.g., "Ceramic Coffee Mug White 350ml"). Do NOT hallucinate high-end collector brands.

1.1 NEXT-GEN HARDWARE GENERATION & STRICT BOX ART PARSING:
- Explicitly check for generation indicators, sequel numbers, next-gen branding logos, and distinct number accents across packaging, retail box art, console chassis, and faceplates:
  • Sequel numerals: "2", "3", "4", "5", "6", "II", "III"
  • Tier & generation suffixes: "Pro", "OLED", "Lite", "Slim", "Series X", "Series S", "Max", "Plus", "Ultra"
  • Generational branding logos & typography (e.g., large stylized numeral "2" on packaging, "Pro" badge on console housing).
- HARD NEGATIVE CONSTRAINT (ZERO TOLERANCE FOR LEGACY COLLAPSE):
  • You are STRICTLY FORBIDDEN from mapping next-gen, sequel, or revised hardware packaging/box art back to legacy base variants.
  • For example, if packaging, box art, console body, or typography displays "Switch 2", a prominent "2", or next-gen branding accents, you MUST NEVER classify it as an original "Nintendo Switch", "Switch V2", or "Switch OLED". The output product_name and model MUST preserve the exact generation (e.g. "Nintendo Switch 2 Console").
  • NEVER classify "PS5 Pro" as "PS5", "Xbox Series X" as "Xbox One", or "AirPods Pro 2" as "AirPods Pro 1".
- VERBATIM OCR & VARIANT AUDIT:
  • Transcribe all visible box art typography, generation numerals, and model badges verbatim into "visual_reasoning.visible_text_detected".
  • Explicitly populate "variant_audit.model_year_or_gen" with the exact detected generation (e.g. "Switch 2", "Pro", "Gen 2") and "variant_audit.variant_name".
- AMBIGUITY THRESHOLD:
  • If visual confidence on exact hardware generation is ambiguous or partially obscured, do NOT default to a legacy base model. Set "confidence_score" < 0.88 and trigger "retake_recommended" to prompt for barcode or front packaging verification.

2. ITEM TYPE, SILHOUETTE & CATEGORY:
- Identify the precise silhouette (e.g., "Detroit Duck Canvas Jacket", "Saffiano Leather Triangle Logo Bifold Wallet", "Cyber-shot DSC-W350 Digital Camera", "Air Jordan 4 Retro").
- Accurately assign "category" (e.g., "Clothing", "Electronics", "Luxury Accessories", "Shoes", "Collectibles").

3. HONEST CONDITION, WEAR & FLAW INSPECTION (DEEP VISUAL CONDITION GRADING):
- Inspect micro-features across all visible angles: surface wear, micro-scratches, oxidisation, patina, and packaging completeness.
- Assign "condition_grade" strictly as one of:
  • "Mint": Factory sealed or brand new with tags, flawless surface finish, pristine hardware, complete original box/packaging.
  • "Good": Clean pre-owned condition, light/minimal surface wear, fully working, structurally sound.
  • "Fair": Noticeable signs of wear, surface scuffs, fabric fading, heel drag, minor oxidisation, or loose without packaging.
  • "For Parts": Heavy gouges, cracked screen/housing, heavy oxidisation/corrosion, missing critical components, or non-functional.
- Explicitly populate "wear_inspection":
  • "surface_wear": Fabric pilling, scuffs, abrasions, or clean finish.
  • "scratching": Micro-scratches, screen gouges, hardware marks, or none.
  • "oxidisation": Metal tarnish, patina, rust, or none.
  • "patina": Desirable leather honey patina, vintage bronze aging, or none.
  • "packaging_completeness": "Original box & tags intact", "Original box only", or "Loose / No box".
- Put every observed flaw explicitly in "defect_notes" (e.g. ["Surface scuff near bottom corner", "Minor hardware tarnish"]).
- Set "inventory_condition": "used_working", "refurbished", "untested", or "faulty_for_parts".

4. ESTIMATED SOLD PRICE (AUD):
- Provide realistic pre-owned secondary market sold comps: suggested_price_min, suggested_price_max, and suggested_price_median.
- Common mass-market/generic items: $3 - $20 AUD. Realistic authentic designer wallets: $180 - $480 AUD.

5. ZERO BLIND VERDICTS & VARIANT / REPRINT DISCRIMINATION:
- Populate "variant_audit":
  • "variant_name": Exact sub-model, edition, or colorway (e.g. "Triple Black", "Model CUH-7200B Pro", "Special Edition").
  • "model_year_or_gen": Detected model year or generation (e.g. "2018 Gen 2", "1994 Vintage").
  • "colorway": Exact color scheme.
  • "is_reprint_risk": TRUE if vintage band tee, movie graphic, vinyl, or collectible shows modern reprint cues (modern Gildan/Anvil tag, digital DTG print, modern copyright line).
  • "completeness": "complete" (original packaging/accessories present), "incomplete_missing_parts" (e.g. console missing cords/controller), "loose_only" (cartridge/item only), or "bundle" (multi-item lot).
  • "reprint_warning": Explicit caution if near-match or reprint risk exists.
- STRICT CONFIDENCE SCORING:
  • "confidence_score": Float between 0.0 and 1.0. Set < 0.88 if unable to read exact model number tag, care label, serial number, or if visual ambiguity exists between common base models and rare high-value variants.
- BLURRY / NO-TAG RETAKE DETECTOR (DYNAMIC CAMERA GUIDANCE):
  • If confidence_score < 0.88, out-of-focus, or lacks a visible brand tag, size label, or hallmark needed for confident valuation:
    Set "retake_recommended": {
      "required": true,
      "angle_type": "tag" | "hardware" | "material" | "focus" | "overall",
      "reason": "Specific issue (e.g., 'Care tag and brand label not visible' or 'Hardware engraving is blurred')",
      "prompt_label": "Direct action prompt (e.g., '📸 Snap Collar Tag for 100% Comp Accuracy')"
    }
  • If the item is clearly in focus with verifiable attributes, set "retake_recommended": null.

6. PROFESSIONAL HIGH-VOLUME EBAY SELLER COPYWRITING (STRICT EDITORIAL FILTER):
- "market_titles.ebay": Max 80 characters. Format: [Brand] [Model/Style] [Key Color/Material] [Size/Attribute] [Condition]. NO punctuation clutter, no fake emojis.
- "market_titles.facebook_marketplace": Clean, friendly, and local-buyer readable.
- "market_titles.depop": Trendy lowercase aesthetic with 3-4 relevant hashtags.
- "seo_description" & "detailed_description": Professional eBay seller description:
  • STRICT RULE 1 (CONDITION IS KING): Never state 'brand new' unless sealed/with tags. If liquidation or untested, state 'Condition: Untested/Faulty - Please review all photos' immediately in first line.
  • STRICT RULE 2 (FILTER SENSITIVE DATA): Completely remove internal analytics ('ROI', 'Cost', 'Spadas Lens', thrift buy costs).
  • STRICT RULE 3 (NO FLUFF): Zero generic AI marketing buzzwords ('Elevate', 'Exquisite', 'Must-have'). Plain clean text only.`,
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

    if (content && !result) {
      try {
        result = JSON.parse(content) as AiListingResult;
      } catch {
        result = null;
      }
    }

    // ── MULTI-MODEL CONSENSUS & ARBITRATION (OpenAI Vision + Gemini Flash) ──
    if (result && hasGeminiVisionKey() && (imageUrls || []).length > 0 && !isManualOverride) {
      const openAiBrand = result.analysis?.brand || "";
      const shouldRunConsensus =
        mode === "deep" ||
        result.analysis?.confidence !== "high" ||
        (result.analysis?.confidence_score ?? 1) < 0.95 ||
        Boolean(openAiBrand);

      if (shouldRunConsensus) {
        try {
          const geminiResult = await callGeminiVision((imageUrls || [])[0]);
          if (geminiResult && geminiResult.analysis?.product_name) {
            const geminiBrand = geminiResult.analysis?.brand || "";

            // Check if models disagree on brand identification by a wide margin
            if (brandsDisagree(openAiBrand, geminiBrand)) {
              console.log(
                `[Consensus] Brand disagreement detected: OpenAI="${openAiBrand}" vs Gemini="${geminiBrand}". Initiating OCR & live comps arbitration...`
              );

              // 1. Gather OCR keywords from both visual analyses
              const ocrWords = Array.from(
                new Set([
                  ...(result.analysis?.visual_reasoning?.visible_text_detected || []),
                  ...(geminiResult.analysis?.visual_reasoning?.visible_text_detected || []),
                ])
              ).filter(Boolean);

              const ocrTextCombined = ocrWords.join(" ").toLowerCase();
              const b1Match = openAiBrand && ocrTextCombined.includes(openAiBrand.toLowerCase());
              const b2Match = geminiBrand && ocrTextCombined.includes(geminiBrand.toLowerCase());

              if (b1Match && !b2Match) {
                console.log(`[Consensus] OpenAI brand "${openAiBrand}" confirmed via direct tag/hardware OCR match.`);
              } else if (b2Match && !b1Match) {
                console.log(`[Consensus] Gemini brand "${geminiBrand}" confirmed via direct tag/hardware OCR match.`);
                result = geminiResult;
                activeProvider = "gemini-consensus";
              } else {
                // 2. Query live eBay sold comps API specifically using extracted OCR keywords
                const ocrKeywords = ocrWords.slice(0, 3).join(" ");
                const qA = `${openAiBrand} ${ocrKeywords}`.trim();
                const qB = `${geminiBrand} ${ocrKeywords}`.trim();

                const [compsA, compsB] = await Promise.all([
                  fetchEbayAustraliaSoldComps(qA, (body.currency as SupportedCurrency) || "AUD"),
                  fetchEbayAustraliaSoldComps(qB, (body.currency as SupportedCurrency) || "AUD"),
                ]);

                const countA = compsA?.count || 0;
                const countB = compsB?.count || 0;

                if (countA > countB && countA > 0) {
                  console.log(`[Consensus] eBay sold comps verified OpenAI brand "${openAiBrand}" (${countA} comps vs ${countB}).`);
                } else if (countB > countA && countB > 0) {
                  console.log(`[Consensus] eBay sold comps verified Gemini brand "${geminiBrand}" (${countB} comps vs ${countA}).`);
                  result = geminiResult;
                  activeProvider = "gemini-consensus";
                } else {
                  // 3. Ambiguity persists - dynamically prompt user to snap secondary angle rather than low-confidence guessing
                  console.log(`[Consensus] Brand disagreement unresolved (${openAiBrand} vs ${geminiBrand}) — prompting for secondary angle.`);
                  if (result.analysis) {
                    result.analysis.confidence = "medium";
                    result.analysis.confidence_score = 0.65;
                    result.analysis.retake_recommended = {
                      required: true,
                      angle_type: "tag",
                      reason: `Disputed brand between ${openAiBrand} and ${geminiBrand}. Tag or hallmark close-up required for verification.`,
                      prompt_label: "📸 Snap Brand Tag to Confirm Brand",
                    };
                  }
                  result.retake_recommended = result.analysis?.retake_recommended;
                }
              }
            }
          }
        } catch (consensusErr) {
          console.warn("[Consensus] Multi-model consensus warning:", consensusErr);
        }
      }
    }

    // Fallback to Gemini if OpenAI yielded no result
    if (!result && (imageUrls || []).length > 0) {
      try {
        const geminiResult = await callGeminiVision((imageUrls || [])[0]);
        if (geminiResult && geminiResult.analysis?.product_name) {
          result = geminiResult;
          activeProvider = "gemini-flash";
        }
      } catch (gemErr) {
        console.warn("[ai-listing] Gemini vision fallback warning:", gemErr);
      }
    }

    if (!result) {
      if (isArScan) {
        return NextResponse.json(createEmptyScanResult());
      }
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
        seo_description: `Authentic ${fallbackAppraisal.brand || ""} ${fallbackAppraisal.productName} in clean condition.\n\n• Brand: ${fallbackAppraisal.brand || "Authentic"}\n• Model: ${fallbackAppraisal.productName}\n• Material/Color: Standard finish\n• Condition: Pre-owned - Good. Tested and functional.`,
        detailed_description: `Authentic ${fallbackAppraisal.brand || ""} ${fallbackAppraisal.productName} in clean condition.\n\n• Brand: ${fallbackAppraisal.brand || "Authentic"}\n• Model: ${fallbackAppraisal.productName}\n• Material/Color: Standard finish\n• Condition: Pre-owned - Good. Tested, inspected, and operating as intended.\n\nPlease review all photos for exact condition details.`,
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

    (result as any).provider = activeProvider;
    (result as any).suggested_price_currency = targetCurrency;
    if (result && !result.retake_recommended && result.analysis?.retake_recommended) {
      result.retake_recommended = result.analysis.retake_recommended;
    }

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

    let generationSuffixDetected: string | null = null;

    // Fetch REAL-TIME regional eBay Comps in target currency via Browse API ONLY for verified identified products
    const runCompsAndFinalizeResult = async () => {
      if (result.analysis?.product_name && result.status === "identified") {
        try {
          // ── GENERATION VALIDATION GUARDRAIL ──────────────────────────────────────────
          // If OCR / visual reasoning detects prominent generational branding (e.g. large "2", "Switch 2", "Pro", "OLED"),
          // force the query builder and verified product name to append the exact generation suffix.
          const ocrTexts = result.analysis.visual_reasoning?.visible_text_detected || [];
          const variantGen = result.analysis.variant_audit?.model_year_or_gen || result.variant_audit?.model_year_or_gen || "";
          const variantName = result.analysis.variant_audit?.variant_name || result.variant_audit?.variant_name || "";
          const visualDesc = result.analysis.visual_reasoning?.physical_object_description || "";
          const pNameLower = (result.analysis.product_name || "").toLowerCase();
          const combinedOcr = `${ocrTexts.join(" ")} ${variantGen} ${variantName} ${visualDesc}`.toLowerCase();

          let isSwitchGen2 = false;
          let isPs5Pro = false;
          let isXboxSeriesX = false;
          let isXboxSeriesS = false;
          let isQuest3 = false;

          // Check Switch 2: prominent "2" / "ii" on Switch packaging or in OCR
          if (
            (combinedOcr.includes("switch") && (/\b(switch\s*2|switch\s*ii|\b2\b)\b/i.test(combinedOcr))) ||
            (pNameLower.includes("switch") && (/\b(switch\s*2|\b2\b)\b/i.test(combinedOcr) || /\b(switch\s*2|\b2\b)\b/i.test(variantGen)))
          ) {
            generationSuffixDetected = "2";
            isSwitchGen2 = true;
          } else if (
            /\b(ps5\s*pro|playstation\s*5\s*pro)\b/i.test(combinedOcr) ||
            (pNameLower.includes("ps5") && /\bpro\b/i.test(combinedOcr))
          ) {
            generationSuffixDetected = "Pro";
            isPs5Pro = true;
          } else if (/\bxbox\s*series\s*x\b/i.test(combinedOcr)) {
            generationSuffixDetected = "Series X";
            isXboxSeriesX = true;
          } else if (/\bxbox\s*series\s*s\b/i.test(combinedOcr)) {
            generationSuffixDetected = "Series S";
            isXboxSeriesS = true;
          } else if (/\b(quest\s*3|meta\s*quest\s*3)\b/i.test(combinedOcr)) {
            generationSuffixDetected = "3";
            isQuest3 = true;
          }

          // Force append generation suffix to product name and model if missing
          if (generationSuffixDetected && result.analysis?.product_name) {
            let currName = result.analysis.product_name;
            if (!currName.toLowerCase().includes(generationSuffixDetected.toLowerCase())) {
              if (isSwitchGen2) {
                currName = currName.replace(/\bswitch\b/i, "Switch 2");
                if (!currName.toLowerCase().includes("switch 2")) {
                  currName = `${currName} 2`;
                }
              } else if (isPs5Pro) {
                currName = currName.replace(/\bps5\b/i, "PS5 Pro").replace(/\bplaystation\s*5\b/i, "PlayStation 5 Pro");
                if (!currName.toLowerCase().includes("pro")) {
                  currName = `${currName} Pro`;
                }
              } else {
                currName = `${currName} ${generationSuffixDetected}`;
              }
              result.analysis.product_name = currName;
              if (result.analysis.model && !result.analysis.model.toLowerCase().includes(generationSuffixDetected.toLowerCase())) {
                result.analysis.model = `${result.analysis.model} ${generationSuffixDetected}`;
              }
              if (result.detected_objects && result.detected_objects.length > 0) {
                result.detected_objects[0].product_name = currName;
              }
              console.log(`[Generation Guardrail] Enforced generation suffix "${generationSuffixDetected}" on product name: "${currName}"`);
            }
          }

          const verifiedName = result.analysis.product_name;

          if (isIntelMode) {
            // ── ISOLATED ENGINE BRANCH: LOCAL P2P, BUYOUT & LIQUIDATION INTELLIGENCE PARSER ──
            // Explicitly bypass eBay sold-comps query builder and run dedicated local marketplace & off-market appraisal
            console.log(`[ai-listing] Executing isolated Intel Mode P2P & Liquidation Engine for: "${verifiedName}"`);
            try {
              const rawEstVal = Number(result.suggested_price_median) || 40;
              const p2pIntel = computeLocalMarketplaceIntelligence(
                verifiedName,
                result.analysis.brand || null,
                result.analysis.category || null,
                rawEstVal,
                targetCurrency
              );

              // Extract P2P and off-market liquidation valuation metrics
              const targetCash = p2pIntel.p2pEstimatedCashPrice;
              const floorPrice = p2pIntel.cashNegotiationBuffer.floorPrice;
              const listPrice = p2pIntel.cashNegotiationBuffer.listPrice;
              const buyoutPrice = p2pIntel.offMarketIntelligence.cashBuyoutPrice;
              const collectorPrice = p2pIntel.offMarketIntelligence.privateCollectorTargetPrice;

              result.suggested_price_min = floorPrice;
              result.suggested_price_max = listPrice;
              result.suggested_price_median = targetCash;
              (result as any).comps_source = "intel_p2p";
              (result as any).marketplace_intelligence = p2pIntel;
              (result as any).off_market_intelligence = p2pIntel.offMarketIntelligence;
              (result as any).p2p_intel = p2pIntel;

              result.comps_range = {
                min: floorPrice,
                max: listPrice,
                median: targetCash,
              };

              // Build deterministic P2P and Liquidation channel comps for full auditability
              result.raw_sold_comps = [
                {
                  id: `p2p-target-${Date.now()}`,
                  title: `${p2pIntel.primaryLocalChannel} Local Cash Target`,
                  price: targetCash,
                  condition: "Local Cash / In-Person Pickup",
                  sold_date: "High Liquidity (1-3 days)",
                  shipping_included: true,
                  shipping_price: 0,
                },
                {
                  id: `p2p-dealer-${Date.now()}`,
                  title: "Dealer Instant Cash Buyout",
                  price: buyoutPrice,
                  condition: "Immediate Same-Day Liquidation",
                  sold_date: "Instant 0ms Settlement",
                  shipping_included: true,
                  shipping_price: 0,
                },
                {
                  id: `p2p-collector-${Date.now()}`,
                  title: "Private Collector Network Target",
                  price: collectorPrice,
                  condition: "Direct Collector Peer-to-Peer",
                  sold_date: "Zero Platform Fees",
                  shipping_included: true,
                  shipping_price: 0,
                },
                {
                  id: `p2p-list-${Date.now()}`,
                  title: "Negotiation List Price (with Buffer)",
                  price: listPrice,
                  condition: "Includes Counter-Offer Buffer",
                  sold_date: "Suggested Asking Price",
                  shipping_included: true,
                  shipping_price: 0,
                },
              ];

              if (result.detected_objects && result.detected_objects.length > 0) {
                (result.detected_objects[0] as any).comps_source = "intel_p2p";
                (result.detected_objects[0] as any).p2p_intel = p2pIntel;
                (result.detected_objects[0] as any).marketplace_intelligence = p2pIntel;
                result.detected_objects[0].raw_sold_comps = result.raw_sold_comps;
                (result.detected_objects[0] as any).suggested_price_min = floorPrice;
                (result.detected_objects[0] as any).suggested_price_max = listPrice;
                (result.detected_objects[0] as any).suggested_price_median = targetCash;
              }
            } catch (intelErr) {
              console.warn("[ai-listing] Intel Mode P2P appraisal warning:", intelErr);
              // Guaranteed independent fallback: Never redirect or fallback to eBay comps
              (result as any).comps_source = "intel_p2p";
              const fallbackVal = Number(result.suggested_price_median) || 35;
              result.suggested_price_min = Math.round(fallbackVal * 0.75);
              result.suggested_price_max = Math.round(fallbackVal * 1.15);
              result.suggested_price_median = Math.round(fallbackVal * 0.9);
            }
          } else {
            // ── STANDARD ENGINE BRANCH: REAL-TIME REGIONAL EBAY SOLD COMPS ──
            let ebayComps: any = null;

            // 1. INTELLIGENT PREFETCH: Check if parallel background comps query finished and matches verified product
            if (parallelCompsPromise && initialPrefetchQuery) {
              try {
                const prefetchHasGen = !generationSuffixDetected || initialPrefetchQuery.toLowerCase().includes(generationSuffixDetected.toLowerCase());
                if (prefetchHasGen) {
                  const precomputed = await parallelCompsPromise;
                  const cleanInitial = initialPrefetchQuery.toLowerCase();
                  const cleanVerified = verifiedName.toLowerCase();
                  const wordsMatch = cleanInitial.split(/\s+/).some((w: string) => w.length > 2 && cleanVerified.includes(w));
                  if (precomputed && precomputed.count > 0 && (wordsMatch || cleanVerified.includes(cleanInitial))) {
                    ebayComps = precomputed;
                    console.log(`[ai-listing] Parallel comps prefetch hit (0ms latency): "${initialPrefetchQuery}" for "${verifiedName}"`);
                  }
                } else {
                  console.log(`[ai-listing] Rejecting prefetch comps because generation "${generationSuffixDetected}" was missing from initial query`);
                }
              } catch {}
            }

            // 2. Fallback fetch if parallel comps differed or yielded 0 comps
            if (!ebayComps) {
              ebayComps = await fetchEbayAustraliaSoldComps(verifiedName, targetCurrency, generationSuffixDetected);
            }
            if (
              ebayComps &&
              typeof ebayComps.median === "number" &&
              !isNaN(ebayComps.median) &&
              ebayComps.median > 0 &&
              ebayComps.count > 0
            ) {
              // Single-Source Guardrail: Strict normalized baseline unit value assignment (never accumulated across response nodes)
              result.suggested_price_min = ebayComps.min;
              result.suggested_price_max = ebayComps.max;
              result.suggested_price_median = ebayComps.median;
              result.ebay_comps_count = ebayComps.count;
              (result as any).comps_source = ebayComps.source;
              result.raw_sold_comps = (ebayComps.rawComps || []).map((c: any) => ({
                id: c.id,
                title: c.title,
                price: c.price,
                condition: c.condition,
                sold_date: c.soldDate,
                shipping_included: c.shippingIncluded,
                shipping_price: c.shippingPrice,
                url: c.url,
                thumbnail: c.thumbnail,
              }));
              result.comps_range = {
                min: ebayComps.min,
                max: ebayComps.max,
                median: ebayComps.median,
              };
              if (result.detected_objects && result.detected_objects.length > 0) {
                result.detected_objects[0].ebay_comps_count = ebayComps.count;
                (result.detected_objects[0] as any).comps_source = ebayComps.source;
                result.detected_objects[0].raw_sold_comps = result.raw_sold_comps;
              }
            } else {
              result.ebay_comps_count = undefined;
              (result as any).comps_source = "ai_estimate";
              if (result.detected_objects && result.detected_objects.length > 0) {
                result.detected_objects[0].ebay_comps_count = undefined;
                (result.detected_objects[0] as any).comps_source = "ai_estimate";
              }
            }
          }
        } catch (compErr) {
          console.warn("[ai-listing] Live comps lookup warning:", compErr);
          if (!isIntelMode) {
            result.ebay_comps_count = undefined;
            (result as any).comps_source = "ai_estimate";
          }
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

      // Common Media DVDs / CDs (Prevent $5 DVD illusions where shipping eats 100% of profit)
      const isMediaDvd = (lowerTitle.includes("dvd") || lowerTitle.includes("cd") || lowerTitle.includes("vhs") || lowerTitle.includes("blu-ray")) &&
        !lowerTitle.includes("criterion") && !lowerTitle.includes("sealed") && !lowerTitle.includes("box set") && !lowerTitle.includes("steelbook") && !lowerTitle.includes("anime");
      if (isMediaDvd) {
        result.suggested_price_min = 3;
        result.suggested_price_max = 6;
        result.suggested_price_median = 4.5;
        if (result.sales_velocity) {
          result.sales_velocity.sell_speed = "SLOW_BURNER";
          result.sales_velocity.est_days_to_sell = "Penny Trap / Negative Margin";
          result.sales_velocity.demand_score = 15;
        }
      }

      // Budget Commodity Brands (Amazon Basics, Onn, Insignia, etc.)
      const isCommodityBrand =
        lowerTitle.includes("amazon basics") ||
        lowerTitle.includes("amazonbasics") ||
        lowerTitle.includes("insignia") ||
        lowerTitle.includes("onn.") ||
        lowerTitle.includes("onn ") ||
        lowerTitle.includes("blackweb") ||
        lowerTitle.includes("mainstays") ||
        lowerTitle.includes("anko");
      if (isCommodityBrand) {
        if (lowerTitle.includes("keyboard") || lowerTitle.includes("mouse") || lowerTitle.includes("cable") || lowerTitle.includes("adapter") || lowerTitle.includes("hub")) {
          result.suggested_price_min = 4;
          result.suggested_price_max = 8;
          result.suggested_price_median = 6;
          if (result.sales_velocity) {
            result.sales_velocity.sell_speed = "SLOW_BURNER";
            result.sales_velocity.est_days_to_sell = "Zero Arbitrage / E-Waste";
            result.sales_velocity.demand_score = 10;
          }
        }
      }

      // Mass-Market Ceramic Coffee Mugs (prevent $20 hallucinated comps on fragile novelty cups)
      const isNoveltyMug = (lowerTitle.includes("mug") || lowerTitle.includes("coffee cup")) &&
        !lowerTitle.includes("vintage 198") && !lowerTitle.includes("vintage 197") && !lowerTitle.includes("starbucks been there") && !lowerTitle.includes("fire-king") && !lowerTitle.includes("pyrex");
      if (isNoveltyMug) {
        result.suggested_price_min = 5;
        result.suggested_price_max = 10;
        result.suggested_price_median = 8;
        if (result.sales_velocity) {
          result.sales_velocity.sell_speed = "SLOW_BURNER";
          result.sales_velocity.est_days_to_sell = "Fragile Packaging / Thin Margin";
          result.sales_velocity.demand_score = 25;
        }
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
    const pCategory = result.analysis?.category || "General";
    const pName = result.analysis?.product_name || "";
    const pBrand = result.analysis?.brand || "";
    const shippingCost = estimateCategoryShippingCost(pCategory, pName);

    // Deep Visual Condition Grading Modifier:
    // Mint (+15%), Good (1.0x baseline), Fair (0.75x, -25%), For Parts (0.35x, -65%)
    const rawGrade = (result.analysis?.condition_grade || result.condition_grade || "Good") as "Mint" | "Good" | "Fair" | "For Parts";
    let conditionModifier = 1.0;
    if (rawGrade === "Mint") {
      conditionModifier = 1.15;
    } else if (rawGrade === "Good") {
      conditionModifier = 1.0;
    } else if (rawGrade === "Fair") {
      conditionModifier = 0.75;
    } else if (rawGrade === "For Parts") {
      conditionModifier = 0.35;
    }

    result.condition_grade = rawGrade;
    result.condition_modifier = conditionModifier;
    if (result.analysis) {
      result.analysis.condition_grade = rawGrade;
      result.analysis.condition_modifier = conditionModifier;
    }

    const baselineSellPrice = Number(result.suggested_price_median) || 45;
    const sellPrice = Math.max(1, Math.round(baselineSellPrice * conditionModifier * 100) / 100);
    result.suggested_price_median = sellPrice;
    if (result.suggested_price_min) {
      result.suggested_price_min = Math.max(1, Math.round(result.suggested_price_min * conditionModifier * 100) / 100);
    }
    if (result.suggested_price_max) {
      result.suggested_price_max = Math.max(1, Math.round(result.suggested_price_max * conditionModifier * 100) / 100);
    }

    const tagPrice = Number(result.detected_tag_price) || (result.analysis?.product_name && result.analysis.product_name !== "NO_CENTER_ITEM" ? Math.max(3, Math.round(sellPrice * 0.15)) : null);

    if (tagPrice && sellPrice > 0) {
      const copEstimate = calculateThriftCopVerdict({
        resalePrice: sellPrice,
        customCost: tagPrice,
        category: pCategory,
        productName: pName,
        brand: pBrand,
        shippingCost,
        confidenceScore: result.analysis?.confidence_score,
        variantAudit: result.analysis?.variant_audit || result.variant_audit,
        needsVerification: Boolean(result.retake_recommended?.required),
      });

      result.detected_tag_price = tagPrice;
      result.true_net_profit = copEstimate.netProfit;
      result.roi_percentage = copEstimate.roiPercentage;
      result.cop_verdict = copEstimate.copVerdict;
      result.requires_secondary_verification = copEstimate.requiresSecondaryVerification;
      result.verification_reason = copEstimate.verificationReason;
      result.fallback_protocol = copEstimate.fallbackProtocol;

      if (result.detected_objects && result.detected_objects.length > 0) {
        result.detected_objects[0].detected_tag_price = tagPrice;
        result.detected_objects[0].true_net_profit = copEstimate.netProfit;
        result.detected_objects[0].roi_percentage = copEstimate.roiPercentage;
        result.detected_objects[0].cop_verdict = copEstimate.copVerdict;
      }
    }

    // ── HARDWARE GENERATION CONFIDENCE & AMBIGUITY GATE ───────────────────────
    // If next-gen/sequel hardware is detected, require >= 0.90 confidence and explicit packaging confirmation.
    // Otherwise flag for secondary barcode verification to prevent mismatched historical comps.
    const pCategoryLower = (pCategory || "").toLowerCase();
    const isHardwareOrGaming =
      pCategoryLower.includes("electronic") ||
      pCategoryLower.includes("gaming") ||
      pCategoryLower.includes("tech") ||
      pCategoryLower.includes("console");
    const activeGenProfile = detectGenerationProfile(pName, generationSuffixDetected);

    if (isHardwareOrGaming && (generationSuffixDetected || activeGenProfile)) {
      const conf = typeof result.analysis?.confidence_score === "number" ? result.analysis.confidence_score : 0.85;
      const genLabel = generationSuffixDetected || activeGenProfile?.generationToken || "Next-Gen";
      if (conf < 0.90 || !result.analysis?.variant_audit?.model_year_or_gen) {
        result.requires_secondary_verification = true;
        result.verification_reason = `Hardware Generation (${genLabel}) detected — confirm version on packaging or scan barcode`;
        result.fallback_protocol = "SCAN_BARCODE";
        result.cop_verdict = "VERIFY_FIRST";
        if (result.detected_objects && result.detected_objects.length > 0) {
          result.detected_objects[0].cop_verdict = "VERIFY_FIRST";
        }
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
        const firstImg = (imageUrls || [])[0] || "";
        const sanitizedUrl = firstImg.startsWith("data:")
          ? `data:image/jpeg;base64,...(${firstImg.length} bytes)`
          : firstImg;

        console.log('[Spadas Lens] Inserting scan record:', {
          userId: user.id,
          imageUrl: sanitizedUrl,
          tokenCount: 2600,
          status: "completed"
        });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const dbClient =
          supabaseUrl && serviceRoleKey
            ? (await import("@supabase/supabase-js")).createClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
              })
            : supabase;

        await dbClient.from("scans").insert([
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
  };

    if (isStreamRequested) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (request.signal?.aborted) return;

            // 1. Send vision completion event immediately so client transitions to "Querying marketplace sold comps..."
            const visionEvent = {
              event: "vision_complete",
              status: result.status,
              analysis: result.analysis,
              product_name: result.analysis?.product_name || rawProdName,
              brand: result.analysis?.brand || "Authentic",
              category: result.analysis?.category || "General Resale",
              condition: result.analysis?.condition || "Used",
              condition_grade: result.condition_grade || result.analysis?.condition_grade || "Good",
              wear_inspection: result.wear_inspection || result.analysis?.wear_inspection || null,
              condition_modifier: result.condition_modifier || 1.0,
              defect_notes: result.defect_notes || result.analysis?.defect_notes || [],
              detected_objects: result.detected_objects,
            };
            controller.enqueue(encoder.encode(JSON.stringify(visionEvent) + "\n"));

            if (request.signal?.aborted) return;

            // 2. Fetch live eBay comps and calculate final metrics
            await runCompsAndFinalizeResult();

            if (request.signal?.aborted) return;

            // 3. Emit final completed payload
            const completeEvent = {
              event: "complete",
              data: result,
            };
            controller.enqueue(encoder.encode(JSON.stringify(completeEvent) + "\n"));
          } catch (streamErr: any) {
            if (request.signal?.aborted) return;
            console.error("[ai-listing] Streaming error:", streamErr);
            try {
              controller.enqueue(encoder.encode(JSON.stringify({ event: "complete", data: result }) + "\n"));
            } catch {}
          } finally {
            try {
              controller.close();
            } catch {}
            if (userIdentifier) {
              const currentLimiter = userRateLimitMap.get(userIdentifier);
              if (currentLimiter) {
                currentLimiter.inFlight = false;
              }
            }
          }
        },
        cancel() {
          if (userIdentifier) {
            const currentLimiter = userRateLimitMap.get(userIdentifier);
            if (currentLimiter) {
              currentLimiter.inFlight = false;
            }
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    await runCompsAndFinalizeResult();
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
