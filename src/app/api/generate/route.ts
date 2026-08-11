if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { GenerateListingSchema } from "@/app/lib/schemas/ai-listing-schema";
import { LISTING_MODEL_FALLBACKS, getPrimaryAiApiKey } from "@/app/lib/config/ai-models";

export async function POST(req: Request) {
  try {
    const openai = new OpenAI({
      apiKey: getPrimaryAiApiKey(),
    });
    const { product } = await req.json();

    if (!product || typeof product !== "string" || !product.trim()) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    let completion: any = null;
    for (const modelName of LISTING_MODEL_FALLBACKS) {
      try {
        const reqParams: any = {
          model: modelName,
          response_format: zodResponseFormat(GenerateListingSchema, "generate_listing"),
          messages: [
            {
              role: "user",
              content: `You are an expert eBay, Facebook Marketplace and Vinted seller.

A user is selling:

${product}

Rules:
- The title must be SEO-friendly and under 80 characters.
- The description must be professional, 2-3 short sentences, plain text, no markdown, no emoji.
- The price must be a realistic Australian resale price in AUD, as a number.`,
            },
          ],
        };

        if (modelName.startsWith("gpt-5")) {
          reqParams.reasoning = { effort: "medium" };
        }

        completion = await openai.chat.completions.create(reqParams);
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err: any) {
        console.warn(`[generate] Model ${modelName} call warning:`, err);
      }
    }

    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to parse listing from response.");
    }

    const listing = JSON.parse(content);
    return NextResponse.json(listing);
  } catch (err) {
    console.error("[generate] failed:", err);
    return NextResponse.json(
      { error: "Failed to generate listing." },
      { status: 500 }
    );
  }
}
