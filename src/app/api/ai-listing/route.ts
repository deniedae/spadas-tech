import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { AiListingResult } from "@/types/ai-listing";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { imageUrls, keyword } = (await request.json()) as { imageUrls?: string[]; keyword?: string };

    if ((!imageUrls || imageUrls.length === 0) && (!keyword || !keyword.trim())) {
      return NextResponse.json(
        { error: "At least one image URL or a keyword is required." },
        { status: 400 }
      );
    }

    // Prepare inputs array
    const inputs: any[] = [];

    if (keyword) {
      inputs.push({
        type: "input_text",
        text: `You are an expert reseller across eBay, Facebook Marketplace, Vinted, and Depop. 

        Analyze the product based on this description: "${keyword.trim()}"

        Respond ONLY with valid JSON matching exactly this shape:
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
        - seo_description: a short, punchy 1-2 sentence summary optimized for search.
        - detailed_description: a full marketplace listing body — 3-5 short paragraphs, plain text, no markdown, no emoji. Cover what it is, condition, key features, and any flaws visible in the description.
        - shipping_estimate.size: classify the parcel size.
        - Return ONLY the raw JSON object. Do NOT wrap it in markdown or add extra text.`
      });
    }

    if (imageUrls && imageUrls.length > 0) {
      inputs.push(
        ...imageUrls.map((url) => ({
          type: "input_image",
          image_url: url,
          detail: "auto",
        }))
      );
    }

    const completion = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: inputs,
        },
      ],
    });

    const text = completion.output_text ?? "";

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const result = JSON.parse(cleaned) as AiListingResult;

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai-listing] failed:", err);
    return NextResponse.json(
      { error: "Failed to generate AI listing." },
      { status: 500 },
    );
  }
}
