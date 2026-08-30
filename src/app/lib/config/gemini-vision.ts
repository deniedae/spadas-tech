import type { AiListingResult } from "@/types/ai-listing";

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

    const promptText = `You are the world's most capable AI reseller research assistant, luxury authenticator, and marketplace appraiser for eBay Australia, Depop, Grailed, and Poshmark.

A reseller has taken a photo of an item in a thrift store, garage sale, or studio and asked you:
"WHAT EXACTLY IS THIS ITEM, HOW MUCH CAN IT RESELL FOR IN AUD, AND GENERATE A COMPLETE RESELLER LISTING FOR IT."

PERFORM THOROUGH VISUAL IDENTIFICATION & SECONDARY MARKET RESEARCH:

1. EXACT PRODUCT IDENTIFICATION (Inspect the image forensically):
- Brand: Identify the exact brand (e.g. Nike, Jordan, Prada, Gucci, Sony, Nintendo, Lego, Carhartt, The North Face, Ralph Lauren, Apple, Bose, Pokemon, Canon, etc.).
- Model / Silhouette: Identify the exact model name, edition, style code, or silhouette (e.g. "Air Jordan 4 Military Black", "Prada Saffiano Triangle Bifold Wallet", "Sony Cyber-shot DSC-W350", "Pokemon HeartGold Version Nintendo DS").
- Material & Colorway: e.g. "Saffiano Leather / Black", "Leather & Suede / Olive", "Canvas / Monogram".
- Era / Vintage Check: Pre-1996 single stitch, Y2K CCD sensor tech, early 2000s streetwear, modern retail.
- Visible Condition: Inspect for scuffs, heel drag, collar fading, screen scratches, or clean pre-owned status.

2. SECONDARY RESALE MARKET VALUATION (AUD):
- Calculate realistic pre-owned market sold comps on eBay Australia & Depop.
- "suggested_price_min": Conservative quick-sale floor price in AUD.
- "suggested_price_max": High-end collector peak price in AUD.
- "suggested_price_median": Fair market target listing price in AUD.
- (If common household grocery/mug/cable, price realistically at $5 - $20 AUD. If luxury/collector, price at true market value).

3. HIGH-CONVERTING RESELLER TITLES & COPYWRITING:
- "market_titles.ebay": Max 80 characters. High-SEO keyword density format: [Brand] [Model/Style] [Key Color/Material] [Size/Edition] [Condition]. NO punctuation clutter, no fake emojis.
- "market_titles.facebook_marketplace": Clean, friendly local title (e.g. "Prada Saffiano Leather Bifold Wallet - Great Condition").
- "market_titles.depop": Trendy lowercase style with 3-4 viral hashtags (e.g. "prada saffiano leather triangle logo bifold wallet #prada #luxury #designer #vintage").
- "seo_description": 1 concise SEO summary paragraph for search engines.
- "detailed_description": 3 professional, human-sounding paragraphs (1: Overview & specs, 2: Honest condition & flaws, 3: Shipping & tracking notice). Plain text only, NO robotic buzzwords.

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
    "product_name": "Exact Brand + Model Name",
    "brand": "Brand",
    "model": "Model",
    "category": "Category",
    "color": "Color",
    "material": "Material",
    "condition": "Used - Good",
    "accessories_detected": [],
    "confidence": "high",
    "confidence_score": 0.98
  },
  "market_titles": {
    "ebay": "Brand Model Colorway Key Attributes Clean SEO Title",
    "facebook_marketplace": "Brand Model - Great Condition",
    "vinted": "Brand Model Style",
    "depop": "brand model colorway #brand #style #vintage #resale"
  },
  "seo_description": "Short SEO summary for search crawlers.",
  "detailed_description": "Paragraph 1: Item overview and specifications.\\n\\nParagraph 2: Honest condition report.\\n\\nParagraph 3: Fast dispatch and secure packaging.",
  "shipping_estimate": {
    "size": "small",
    "estimated_weight_grams": 350,
    "dimensions_cm": { "length": 20, "width": 15, "height": 5 },
    "notes": "Standard trackable parcel dispatch from Australia"
  },
  "item_specifics": {
    "Brand": "Brand",
    "Model": "Model",
    "Type": "Category",
    "Condition": "Used - Good"
  },
  "suggested_keywords": ["keyword1", "keyword2", "keyword3"],
  "suggested_price_min": 50,
  "suggested_price_max": 120,
  "suggested_price_median": 85,
  "suggested_price_currency": "AUD"
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
