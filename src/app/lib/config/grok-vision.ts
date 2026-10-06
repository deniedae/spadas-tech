import OpenAI from "openai";
import type { AiListingResult } from "@/types/ai-listing";

export const GROK_VISION_MODEL = "grok-4.20-0309-non-reasoning";
export const GROK_VISION_FALLBACKS = [
  "grok-4.20-0309-non-reasoning",
  "grok-4.5",
  "grok-4.7",
  "grok-4.3",
];

export const GROK_REASONING_MODEL = "grok-4.20-0309-reasoning";
export const GROK_REASONING_FALLBACKS = [
  "grok-4.20-0309-reasoning",
  "grok-4.5",
  "grok-4.20-0309-non-reasoning",
];

/**
 * Checks if an xAI Grok API key is configured.
 */
export function hasGrokApiKey(): boolean {
  const key =
    process.env.XAI_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.X_AI_API_KEY ||
    process.env.NEXT_PUBLIC_XAI_API_KEY;
  return Boolean(key && key.length > 8 && !key.includes("placeholder"));
}

/**
 * Retrieves the active xAI Grok API key.
 */
export function getGrokApiKey(): string {
  return (
    process.env.XAI_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.X_AI_API_KEY ||
    process.env.NEXT_PUBLIC_XAI_API_KEY ||
    ""
  );
}

/**
 * Instantiates an OpenAI-compatible client configured for xAI's official API endpoint.
 */
export function createGrokClient(): OpenAI | null {
  const apiKey = getGrokApiKey();
  if (!apiKey || apiKey.length < 8 || apiKey.includes("placeholder")) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.XAI_BASE_URL || "https://api.x.ai/v1",
  });
}

export interface GrokFastVisionResult {
  product_name: string;
  brand: string | null;
  category: string;
  condition: string;
  condition_grade?: "Mint" | "Good" | "Fair" | "For Parts";
  media_format?: "4K UHD" | "Blu-ray" | "DVD" | "Steelbook" | "VHS" | "Cassette" | "CD" | "Vinyl" | null;
  confidence_score: number;
  estimated_value: number;
  suggested_price_min: number;
  suggested_price_max: number;
  defect_notes: string[];
  visible_text_detected?: string[];
  _model?: string;
  _latency_ms?: number;
  retake_recommended?: {
    required: boolean;
    angle_type: "tag" | "hardware" | "material" | "focus" | "overall";
    reason: string;
    prompt_label: string;
  } | null;
}

/**
 * High-Speed Grok Vision Visual Identification for AR Scanner HUD.
 * Performs optical character recognition on tags, serials, and hallmarks.
 */
export async function callGrokVisionFast(
  imageDataUrl: string,
  options?: {
    categoryHint?: string;
    mode?: string;
    spatialMetadata?: any;
    targetCurrency?: string;
  }
): Promise<GrokFastVisionResult | null> {
  const client = createGrokClient();
  if (!client) return null;

  const targetCurrency = options?.targetCurrency || "AUD";

  const prompt = `You are Spadas AR Lens — a specialized secondary market item identification and valuation engine for eBay, Depop, and local P2P marketplaces.
Analyze this camera viewfinder image with precision:

1. FORENSIC OPTICAL CHARACTER RECOGNITION (OCR):
   - Read every legible word, micro-print, care label, collar tag, RN number, style code, serial number, and hardware hallmark.
   - If a brand stamp or model number is visible, transcribe it verbatim. Never say "electronics" or "jacket" when a brand/model exists.

2. PRODUCT NAME & BRAND:
   - product_name: Brand + Silhouette/Model + Key Attribute (e.g. "Sony Cyber-shot DSC-W350 Silver", "Carhartt Detroit Jacket J97 DKB", "Prada Saffiano Leather Bifold Wallet Black", "Interstellar 4K UHD Blu-ray").
   - brand: Exact brand name, or null if genuinely unbranded.

3. PHYSICAL MEDIA DETECTION (CRITICAL FOR MOVIES & DISCS):
   - Check the top header banner on cases:
     • "Blu-ray" or blue header strip -> media_format = "Blu-ray"
     • "4K Ultra HD" / "4K UHD" or black header -> media_format = "4K UHD"
     • Metal casing -> media_format = "Steelbook"
     • Standard DVD case -> media_format = "DVD"
     • Tapes/Audio -> "VHS", "Cassette", "CD", "Vinyl"
     • Otherwise null.

4. CONDITION & HONEST FLAW AUDIT:
   - condition: "Used - Good", "Brand New", "Fair", or "For Parts".
   - condition_grade: "Mint", "Good", "Fair", or "For Parts".
   - defect_notes: List all visible scratches, scuffs, collar fading, stains, or damage.

5. SECONDARY RESALE VALUATION (in ${targetCurrency}):
   - estimated_value: Realistic fair-market sold median.
   - suggested_price_min: Fast liquidation floor price.
   - suggested_price_max: Patient collector ceiling price.

6. RETAKE GUIDANCE:
   - If confidence < 0.85, out-of-focus, or tag/hallmark is too blurry to reliably verify authenticity, set retake_recommended. Otherwise null.

Output STRICT JSON only:
{
  "product_name": "string",
  "brand": "string or null",
  "category": "Clothing | Electronics | Luxury Accessories | Shoes | Collectibles | Media & Movies | Video Games | General",
  "condition": "string",
  "condition_grade": "Mint | Good | Fair | For Parts",
  "media_format": "4K UHD | Blu-ray | DVD | Steelbook | VHS | Cassette | CD | Vinyl | null",
  "confidence_score": 0.98,
  "estimated_value": 45,
  "suggested_price_min": 35,
  "suggested_price_max": 60,
  "defect_notes": [],
  "visible_text_detected": [],
  "retake_recommended": null
}`;

  try {
    const cleanUrl = imageDataUrl.trim().replace(/[\r\n]/g, "");

    const callStart = Date.now();
    for (const model of GROK_VISION_FALLBACKS) {
      try {
        const response = await client.chat.completions.create({
          model,
          temperature: 0.0,
          max_tokens: 600,
          messages: [
            {
              role: "system",
              content: "You are a professional reseller valuation AI. Respond only with valid, raw JSON matching the user schema.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: cleanUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        });

        const raw = response.choices?.[0]?.message?.content?.trim() || "";
        if (!raw) continue;

        const cleanJson = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleanJson) as GrokFastVisionResult;

        if (parsed.product_name) {
          parsed._model = model;
          parsed._latency_ms = Date.now() - callStart;
          return parsed;
        }
      } catch (err: any) {
        console.warn(`[Grok Vision] Call failed on model ${model}:`, err?.message || err);
      }
    }
  } catch (err: any) {
    console.error("[Grok Vision] Fast vision execution failed:", err?.message || err);
  }

  return null;
}

/**
 * Full Forensic Resale Appraisal & Listing Generation using Grok-2 Vision.
 * Produces full AiListingResult with titles, bulleted descriptions, and comps estimates.
 */
export async function callGrokVisionFull(
  imageUrls: string[],
  options?: {
    categoryHint?: string;
    mode?: string;
    spatialMetadata?: any;
    targetCurrency?: string;
  }
): Promise<AiListingResult | null> {
  const client = createGrokClient();
  if (!client || imageUrls.length === 0) return null;

  const targetCurrency = options?.targetCurrency || "AUD";

  const prompt = `You are Spadas AI powered by xAI Grok — the definitive reseller appraisal and marketplace listing generator for eBay Australia, Depop, and Grailed.

PERFORM DEEP FORENSIC IDENTIFICATION, AUTHENTICATION & LISTING GENERATION:
1. Identify exact Brand, Model Silhouette, Era/Year, Colorway, and Material.
2. Read all text, care tags, serial numbers, and hallmarks via OCR.
3. Inspect for wear, flaws, distress, and defects. Add every flaw to defect_notes.
4. Estimate realistic secondary market sold comps in ${targetCurrency} (min, max, median).
5. Generate punchy, high-converting reseller listing titles:
   - market_titles.ebay: Max 80 chars. [Brand] [Model/Silhouette] [Key Attribute] [Size/Format] [Condition]. No spam words.
   - market_titles.facebook_marketplace: Friendly, clean local title.
   - market_titles.depop: Trendy lowercase with hashtags.
6. Write honest, professional descriptions:
   - Plain text bullet points for Brand, Model, Material, Condition, Flaws.
   - ZERO generic AI fluff (no "elevate your style", "a testament to quality").

Return ONLY a valid JSON object matching this schema:
{
  "inventory_condition": "used_working",
  "defect_notes": ["Clean pre-owned condition"],
  "as_is_disclaimer": "Item inspected and working. Sold as described.",
  "detected_objects": [
    {
      "id": "grok-obj-1",
      "product_name": "Exact Brand + Model Name",
      "brand": "Brand",
      "category": "Category",
      "condition": "Used - Good",
      "confidence_score": 0.98,
      "bbox": { "x": 20, "y": 20, "width": 60, "height": 60 }
    }
  ],
  "analysis": {
    "status": "identified",
    "visual_reasoning": {
      "visible_text_detected": ["ALL OCR TEXT"],
      "logo_hallmark_observed": "Observed logo/stamp",
      "condition_assessment": "Condition summary"
    },
    "product_name": "Exact Brand + Model Name",
    "brand": "Brand",
    "model": "Model Number or Silhouette",
    "category": "Category",
    "color": "Color",
    "material": "Material",
    "condition": "Used - Good",
    "condition_grade": "Good",
    "media_format": "4K UHD | Blu-ray | DVD | Steelbook | VHS | null",
    "accessories_detected": [],
    "confidence": "high",
    "confidence_score": 0.98,
    "retake_recommended": null
  },
  "market_titles": {
    "ebay": "Brand Model Attribute Condition",
    "facebook_marketplace": "Brand Model - Great Condition",
    "vinted": "Brand Model",
    "depop": "brand model #resale"
  },
  "seo_description": "Clean eBay listing description with bullet points",
  "detailed_description": "Comprehensive bulleted listing description",
  "shipping_estimate": {
    "size": "small",
    "estimated_weight_grams": 400,
    "dimensions_cm": null,
    "notes": null
  },
  "item_specifics": {
    "Brand": "Brand",
    "Category": "Category",
    "Condition": "Pre-Owned"
  },
  "suggested_keywords": ["Brand", "Resale", "Pre-Owned"],
  "suggested_price_min": 30,
  "suggested_price_max": 60,
  "suggested_price_median": 45,
  "suggested_price_currency": "${targetCurrency}"
}`;

  try {
    const imagePayloads = imageUrls.slice(0, 3).map((url) => ({
      type: "image_url" as const,
      image_url: {
        url: url.trim().replace(/[\r\n]/g, ""),
        detail: "high" as const,
      },
    }));

    const callStart = Date.now();
    for (const model of GROK_VISION_FALLBACKS) {
      try {
        const response = await client.chat.completions.create({
          model,
          temperature: 0.0,
          max_tokens: 1500,
          messages: [
            {
              role: "system",
              content: "You are an expert secondhand merchandise appraisal AI. Return valid JSON only.",
            },
            {
              role: "user",
              content: [{ type: "text", text: prompt }, ...imagePayloads],
            },
          ],
        });

        const raw = response.choices?.[0]?.message?.content?.trim() || "";
        if (!raw) continue;

        const cleanJson = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleanJson) as AiListingResult;

        if (parsed.analysis?.product_name || (parsed as any).product_name) {
          (parsed as any)._model = model;
          (parsed as any)._latency_ms = Date.now() - callStart;
          return {
            ...parsed,
            isMockFallback: false,
            status: "identified",
          };
        }
      } catch (modelErr: any) {
        console.warn(`[Grok Vision Full] Model ${model} error:`, modelErr?.message || modelErr);
      }
    }
  } catch (err: any) {
    console.error("[Grok Vision Full] Execution error:", err?.message || err);
  }

  return null;
}

/**
 * Grok Multi-Model Supreme Tie-Breaker Arbitrator.
 * When OpenAI and Gemini disagree on a brand or model, Grok 2 Vision inspects the image
 * directly to render an authoritative verdict based on micro-OCR and brand DNA.
 */
export async function callGrokArbitration(
  imageDataUrl: string,
  candidateA: { brand: string; product: string },
  candidateB: { brand: string; product: string }
): Promise<{ winner: "A" | "B" | "DISPUTE"; verifiedBrand: string; verifiedProduct: string; reasoning: string } | null> {
  const client = createGrokClient();
  if (!client) return null;

  const prompt = `Two visual appraisal engines disagree on the brand/identity of this physical secondhand item:
- Candidate A: Brand="${candidateA.brand}", Product="${candidateA.product}"
- Candidate B: Brand="${candidateB.brand}", Product="${candidateB.product}"

Perform forensic OCR and hallmark inspection on the image.
Which candidate is factually correct, or is it a third brand?
Give strict weight to visible tags, emblems, hallmark engravings, or serial numbers.

Return raw JSON only:
{
  "winner": "A" | "B" | "DISPUTE",
  "verifiedBrand": "Exact True Brand",
  "verifiedProduct": "Exact True Product Name",
  "reasoning": "Direct evidence observed in the image"
}`;

  try {
    const cleanUrl = imageDataUrl.trim().replace(/[\r\n]/g, "");
    const response = await client.chat.completions.create({
      model: GROK_VISION_MODEL,
      temperature: 0.0,
      max_tokens: 350,
      messages: [
        { role: "system", content: "You are a forensic brand authentication arbitrator. Return strict JSON only." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: cleanUrl, detail: "high" } },
          ],
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || "";
    if (raw) {
      const cleanJson = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      return JSON.parse(cleanJson);
    }
  } catch (err) {
    console.warn("[Grok Arbitration] Arbitration failed:", err);
  }

  return null;
}

/**
 * Grok Street-Smart Reseller Listing Copywriter.
 * Generates punchy, SEO-dense titles and descriptions with zero generic filler.
 */
export async function callGrokListingCopy(
  product: string,
  details?: {
    condition?: string;
    brand?: string;
    category?: string;
    defects?: string[];
    currency?: string;
  }
): Promise<{
  title: string;
  description: string;
  suggested_price: number;
  tags: string[];
} | null> {
  const client = createGrokClient();
  if (!client) return null;

  const currency = details?.currency || "AUD";

  const prompt = `You are an elite marketplace seller on eBay Australia, Facebook Marketplace, and Depop.
Write an irresistible, high-converting listing for:
Product: "${product}"
Brand: "${details?.brand || "Authentic"}"
Condition: "${details?.condition || "Pre-Owned"}"
Defects: ${JSON.stringify(details?.defects || [])}

Strict Requirements:
1. Title: Under 80 characters. High-intent search terms first: [Brand] [Model] [Key Feature/Color] [Condition]. NO fake buzzwords or emojis.
2. Description: 2-3 short, clear sentences followed by factual bullet points (Brand, Model, Condition, Notes). NO marketing fluff.
3. Realistic pre-owned secondary market sold price in ${currency} (number).
4. 5 high-converting search tags.

Return strict JSON only:
{
  "title": "string",
  "description": "string",
  "suggested_price": 50,
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  try {
    const response = await client.chat.completions.create({
      model: GROK_REASONING_MODEL,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: "system", content: "You are a top 1% eBay power-seller. Return raw JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || "";
    if (raw) {
      const cleanJson = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      return JSON.parse(cleanJson);
    }
  } catch (err) {
    console.warn("[Grok Listing Copy] Failed to generate listing copy:", err);
  }

  return null;
}
