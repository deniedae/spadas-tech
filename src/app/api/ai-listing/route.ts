import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { AiListingResult } from "@/types/ai-listing";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { imageUrls } = (await request.json()) as { imageUrls?: string[] };

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required." },
        { status: 400 },
      );
    }

    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert reseller across eBay, Facebook Marketplace, Vinted and Depop.
Analyse the product in the provided image(s) and respond ONLY with valid JSON matching exactly this shape:
{
  "analysis": {
    "product_name": string,
    "brand": string | null,
    "model": string | null,
    "category": string,
    "color": string | null,
    "material": string | null,
    "condition": string,
    "accessories_detected": string[],
    "confidence": "high" | "medium" | "low",
    "confidence_score": number
  },
  "market_titles": {
    "ebay": string,
    "facebook_marketplace": string,
    "vinted": string,
    "depop": string
  },
  "seo_description": string,
  "detailed_description": string,
  "shipping_estimate": {
    "size": "small" | "medium" | "large" | "extra-large",
    "estimated_weight_grams": number,
    "dimensions_cm": { "length": number, "width": number, "height": number } | null,
    "notes": string | null
  },
  "item_specifics": { "key": "value" },
  "suggested_keywords": string[],
  "suggested_price_min": number,
  "suggested_price_max": number,
  "suggested_price_currency": "AUD"
}
Rules:
- Use realistic Australian resale prices in AUD.
- Titles must be SEO-friendly and within 80 characters.
- confidence_score is a number between 0 and 1.
- seo_description: a short, punchy 1-2 sentence summary optimised for search.
- detailed_description: a full marketplace listing body — 3-5 short paragraphs, plain text, no markdown, no emoji. Cover what it is, condition, key features, and any flaws visible in the photo.
- shipping_estimate.size: classify the parcel as small (satchel), medium (small box), large (medium box), or extra-large (bulky). If dimensions can't be inferred from the image, set dimensions_cm to null and put your reasoning in notes.
- Do not include any text outside the JSON object.`
            },
            ...imageContent,
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const result = JSON.parse(text) as AiListingResult;

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai-listing] failed:", err);
    return NextResponse.json(
      { error: "Failed to generate AI listing." },
      { status: 500 },
    );
  }
}
