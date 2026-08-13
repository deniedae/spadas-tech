import type { AiListingResult } from "@/types/ai-listing";

/**
 * Call Anthropic Claude 3.5 Sonnet Vision API directly via HTTP fetch.
 * Provides instant high-precision OCR and item identification if OpenAI is unavailable or rate-limited.
 */
export async function callClaudeVision(
  imageDataUrl: string,
  anthropicApiKey?: string
): Promise<AiListingResult | null> {
  const apiKey = anthropicApiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return null;
  }

  try {
    // Extract base64 and media type from data URL
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    const mediaType = match[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const base64Data = match[2];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `You are an expert reseller app valuation engine for eBay Australia, Depop, and FB Marketplace.
Analyse the item in this image with high precision.
Return valid JSON only matching this exact structure:
{
  "inventory_condition": "used_working",
  "defect_notes": ["Minor pre-owned surface wear"],
  "as_is_disclaimer": "Tested and working. Sold pre-owned as shown.",
  "detected_objects": [
    {
      "id": "claude-obj-1",
      "product_name": "Identified Item Name",
      "brand": "Identified Brand Name",
      "category": "Electronics or Streetwear or Gaming",
      "condition": "Used - Good",
      "bbox": { "x": 20, "y": 15, "width": 60, "height": 70 },
      "confidence_score": 0.98
    }
  ],
  "analysis": {
    "product_name": "Identified Item Name",
    "brand": "Identified Brand Name",
    "model": "Model Number if visible",
    "category": "Category",
    "condition": "Used - Good",
    "price_suggestions": { "min": 65, "max": 110, "median": 85 },
    "confidence": "high",
    "confidence_score": 0.98,
    "seo_title": "SEO Optimized Listing Title",
    "seo_description": "Short summary",
    "detailed_description": "Detailed marketplace description",
    "keywords": ["tag1", "tag2"],
    "cross_platform": {
      "ebay_title": "eBay Title",
      "fb_marketplace_title": "FB Title",
      "depop_title": "Depop Title"
    }
  },
  "suggested_price_min": 65,
  "suggested_price_max": 110,
  "suggested_price_median": 85
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("[Claude Vision] API response not ok:", response.status);
      return null;
    }

    const resData = await response.json();
    const textContent = resData?.content?.[0]?.text;
    if (!textContent) return null;

    const parsed = JSON.parse(textContent);
    return parsed as AiListingResult;
  } catch (err) {
    console.warn("[Claude Vision] API call error:", err);
    return null;
  }
}
