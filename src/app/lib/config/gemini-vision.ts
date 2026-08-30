import type { AiListingResult } from "@/types/ai-listing";

/**
 * Call Google Gemini Vision API directly via HTTP fetch.
 * Provides fast multimodal vision detection, OCR, and valuation.
 */
export async function callGeminiVision(
  imageDataUrl: string,
  geminiApiKey?: string
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
      "gemini-3.5-flash",
      "gemini-2.5-flash-image",
    ];

    const promptText = `You are an expert reseller appraiser and luxury marketplace authentication & valuation specialist for eBay, Depop, and Grailed.

INSTRUCTIONS:
1. IDENTIFY THE PHYSICAL ITEM IN THE IMAGE WITH HIGH FORENSIC ACCURACY:
- LUXURY & DESIGNER GOODS (Prada, Gucci, Louis Vuitton, Chanel, Dior, Bottega Veneta, Saint Laurent, Fendi, Goyard, Hermes, Burberry, Celine, Coach, Vivienne Westwood):
  - Carefully inspect any visible logos, triangular plaques, gold/silver lettering, or signature embossing (e.g. Prada Milan logo triangle, LV monogram, GG pattern, CC lock, YSL emblem).
  - Inspect the material & texture: Saffiano cross-hatch leather, Tessuto nylon, Epi textured leather, monogram coated canvas, Caviar leather, Intrecciato woven leather, patent leather, or smooth calfskin.
  - Identify the exact silhouette: Bifold Wallet, Zip-Around Continental Long Wallet, Flap Coin Purse, Cardholder, Chain Wallet, Crossbody Bag, Tote Bag.
  - Set specific product_name: e.g. "Prada Saffiano Leather Triangle Logo Bifold Wallet", "Prada Saffiano Metal Zip Around Long Wallet", "Louis Vuitton Monogram Sarah Wallet", "Gucci GG Supreme Continental Wallet".
  - Realistic Resale Pricing: Authentic designer wallets in pre-owned good condition typically range $180 - $480 AUD (bags $350 - $1200+ AUD).

- SNEAKERS & STREETWEAR (Nike, Jordan, Yeezy, Adidas, Supreme, Stussy, Bape):
  - Identify the specific silhouette, model, and colorway (e.g. "Nike Dunk Low Retro Panda", "Air Jordan 4 Military Black").

- VINTAGE DIGICAMS & TECH (Sony Cyber-shot, Canon PowerShot, Olympus, Nintendo):
  - Read visible model number badges on the front or top plate (e.g. "Sony Cyber-shot DSC-W350 Digital Camera").

- COMMON HOUSEHOLD / UNBRANDED ITEMS:
  - If it's a generic mug, desk item, or cable, identify it honestly (e.g. "Ceramic Coffee Mug") and price realistically ($5 - $15 AUD).
  - Do NOT hallucinate luxury brands unless clearly visible.

Return valid JSON only matching this exact structure (no markdown formatting, no code block backticks):
{
  "inventory_condition": "used_working",
  "defect_notes": ["Clean pre-owned condition"],
  "as_is_disclaimer": "Item tested and working. Sold as described.",
  "detected_objects": [
    {
      "id": "gemini-obj-1",
      "product_name": "Prada Saffiano Leather Triangle Logo Bifold Wallet",
      "brand": "Prada",
      "category": "Designer & Luxury Goods",
      "condition": "Used - Good",
      "bbox": { "x": 15, "y": 15, "width": 70, "height": 70 },
      "confidence_score": 0.98
    }
  ],
  "analysis": {
    "product_name": "Prada Saffiano Leather Triangle Logo Bifold Wallet",
    "brand": "Prada",
    "model": "Saffiano Triangle Bifold",
    "category": "Designer & Luxury Goods",
    "color": "Black",
    "material": "Saffiano Leather",
    "condition": "Used - Good",
    "accessories_detected": [],
    "confidence": "high",
    "confidence_score": 0.98
  },
  "market_titles": {
    "ebay": "Prada Saffiano Leather Triangle Logo Bifold Wallet Black Authentic",
    "facebook_marketplace": "Prada Saffiano Leather Bifold Wallet - Great Condition",
    "vinted": "Prada Saffiano Leather Triangle Logo Wallet",
    "depop": "prada saffiano leather triangle logo bifold wallet #prada #luxury #designer"
  },
  "seo_description": "Authentic Prada Saffiano leather wallet featuring the signature triangular enamelled logo plate in great condition.",
  "detailed_description": "Authentic Prada Saffiano leather wallet. Features durable textured leather construction with the iconic enamelled metal triangle logo. Interior includes multiple card slots, bill compartments, and coin pocket. Pre-owned in great condition. Fast tracked shipping.",
  "shipping_estimate": {
    "size": "small",
    "estimated_weight_grams": 350,
    "dimensions_cm": { "length": 20, "width": 15, "height": 5 },
    "notes": "Standard trackable parcel dispatch from Australia"
  },
  "item_specifics": {
    "Brand": "Prada",
    "Material": "Saffiano Leather",
    "Type": "Wallet",
    "Condition": "Used - Good"
  },
  "suggested_keywords": ["prada", "saffiano", "wallet", "luxury", "authentic"],
  "suggested_price_min": 180,
  "suggested_price_max": 350,
  "suggested_price_median": 260,
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
