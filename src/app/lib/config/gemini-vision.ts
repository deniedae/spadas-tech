import type { AiListingResult } from "@/types/ai-listing";

export function hasGeminiVisionKey(): boolean {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.length > 10 && !apiKey.includes("placeholder"));
}

/**
 * Google Gemini Multimodal Vision & Resale Research Engine
 * Directly performs deep visual identification, eBay/Depop resale pricing research,
 * and high-converting listing copywriting from camera images.
 */
export async function callGeminiVision(
  imageDataUrl: string,
  geminiApiKey?: string,
  options?: {
    categoryHint?: string;
    mode?: "snap" | "sweep" | "barcode" | "deep" | "studio";
    customPrompt?: string;
  }
): Promise<AiListingResult | null> {
  const apiKey =
    geminiApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("placeholder")) {
    return null;
  }

  try {
    // Extract base64 and mime type from data URL
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = match[2];

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    const promptText = `You are an expert reseller appraiser, luxury authenticator, and marketplace copywriter for eBay Australia, Depop, and Grailed.

PERFORM THOROUGH VISUAL IDENTIFICATION & SECONDARY MARKET RESEARCH:

1. EXACT PRODUCT & BRAND IDENTIFICATION (FORENSIC OCR & LOGO INSPECTION):
- Read every visible word, brand stamp, care label, serial number, or typography via OCR.
- Brand: Identify the exact brand (e.g., Nike, Jordan, Prada, Gucci, Sony, Nintendo, Carhartt, The North Face, Ralph Lauren, Apple, Bose, TP-Link, Canon).
- Model / Silhouette: Identify the exact model name, edition, style code, or silhouette (e.g. "Air Jordan 4 Military Black", "Prada Saffiano Triangle Bifold Wallet", "Sony Cyber-shot DSC-W350").
- Material & Colorway: e.g. "Saffiano Leather / Black", "Duck Canvas / Carhartt Brown", "Monogram Coated Canvas".

2. CONDITION, WEAR & HONEST FLAW INSPECTION:
- Inspect visible condition: collar fading, moth holes, distress, heel drag, screen scratches, or clean pre-owned status.
- Put every observed flaw in "defect_notes".
- Set "inventory_condition": "used_working", "refurbished", "untested", or "faulty_for_parts".

3. SECONDARY RESALE MARKET VALUATION (AUD):
- Calculate realistic pre-owned market sold comps on eBay Australia & Depop.
- "suggested_price_min": Conservative quick-sale floor price in AUD.
- "suggested_price_max": High-end collector peak price in AUD.
- "suggested_price_median": Fair market target listing price in AUD.
- Generic household items: $3 - $20 AUD. Do NOT hallucinate luxury comps on unbranded items.

4. RETAKE RECOMMENDATION (BLURRY / NO-TAG DETECTOR):
- If the image is blurry, out of focus, or tags/hallmarks are obscured/missing preventing high-confidence valuation:
  Set "retake_recommended": {
    "required": true,
    "angle_type": "tag" | "hardware" | "material" | "focus" | "overall",
    "reason": "Clear explanation of what is missing",
    "prompt_label": "User-facing prompt (e.g. '📸 Snap Collar Tag for 100% Accuracy')"
  }
- If clear and confident, set "retake_recommended": null.

5. HIGH-CONVERTING RESELLER TITLES & COPYWRITING:
- "market_titles.ebay": Max 80 characters. Format: [Brand] [Model/Style] [Key Color/Material] [Size/Edition] [Condition]. NO emojis.
- "market_titles.facebook_marketplace": Clean, friendly local title.
- "market_titles.depop": Trendy lowercase style with 3-4 hashtags.
- "seo_description" & "detailed_description": Professional eBay seller description: brief intro sentence + bullet points for Brand, Model, Material/Color, and Condition. No fluff buzzwords.

Return ONLY a valid JSON object matching this structure (no markdown formatting, no code block backticks):
{
  "inventory_condition": "used_working",
  "defect_notes": ["Clean pre-owned condition"],
  "as_is_disclaimer": "Item inspected and working. Sold as described.",
  "detected_objects": [
    {
      "id": "gemini-obj-1",
      "product_name": "Exact Brand + Model Name",
      "brand": "Brand",
      "category": "Category",
      "condition": "Used - Good",
      "bbox": { "x": 15, "y": 15, "width": 70, "height": 70 },
      "confidence_score": 0.98
    }
  ],
  "analysis": {
    "status": "identified",
    "visual_reasoning": {
      "visible_text_detected": ["OCR_WORD_1", "OCR_WORD_2"],
      "physical_object_description": "Physical description of item",
      "brand_identified": "Brand",
      "identification_reasoning": "Reasoning based on visual features"
    },
    "product_name": "Exact Brand + Model Name",
    "brand": "Brand",
    "model": "Model",
    "category": "Category",
    "color": "Color",
    "material": "Material",
    "condition": "Used - Good",
    "accessories_detected": [],
    "confidence": "high",
    "confidence_score": 0.98,
    "retake_recommended": null
  },
  "market_titles": {
    "ebay": "Brand Model Colorway Key Attributes Clean SEO Title",
    "facebook_marketplace": "Brand Model - Great Condition",
    "vinted": "Brand Model Style",
    "depop": "brand model colorway #brand #style #vintage #resale"
  },
  "seo_description": "Short SEO summary for search crawlers.",
  "detailed_description": "Authentic item overview.\\n\\n• Brand: Brand\\n• Model: Model\\n• Material/Color: Material\\n• Condition: Honest condition report.",
  "shipping_estimate": {
    "size": "small",
    "estimated_weight_grams": 350,
    "dimensions_cm": { "length": 20, "width": 15, "height": 5 },
    "notes": "Standard trackable parcel dispatch from Australia"
  },
  "item_specifics": [
    { "name": "Brand", "value": "Brand" },
    { "name": "Model", "value": "Model" },
    { "name": "Type", "value": "Category" },
    { "name": "Condition", "value": "Used - Good" }
  ],
  "suggested_keywords": ["keyword1", "keyword2", "keyword3"],
  "suggested_price_min": 50,
  "suggested_price_max": 120,
  "suggested_price_median": 85,
  "suggested_price_currency": "AUD",
  "retake_recommended": null
}`;

    for (const modelName of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.0,
              response_mime_type: "application/json",
            },
          }),
        });

        if (!response.ok) {
          console.warn(`[Gemini Vision] ${modelName} returned status:`, response.status);
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);
        return parsed as AiListingResult;
      } catch (err) {
        console.warn(`[Gemini Vision] ${modelName} error:`, err);
      }
    }

    return null;
  } catch (err) {
    console.warn("[Gemini Vision] API call error:", err);
    return null;
  }
}
