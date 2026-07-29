import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { product } = await req.json();

    if (!product || typeof product !== "string" || !product.trim()) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    const completion = await openai.responses.create({
      model: "gpt-5",
      input: `
You are an expert eBay, Facebook Marketplace and Vinted seller.

A user is selling:

${product}

Respond ONLY with valid JSON in exactly this shape:

{
  "title": "",
  "description": "",
  "price": 0
}

Rules:
- The title must be SEO-friendly and under 80 characters.
- The description must be professional, 2-3 short sentences, plain text, no markdown, no emoji.
- The price must be a realistic Australian resale price in AUD, as a number (not a string).
- Do not include any text outside the JSON object.
`,
    });

    const text = completion.output_text ?? "";
    const listing = JSON.parse(text);

    return NextResponse.json(listing);
  } catch (err) {
    console.error("[generate] failed:", err);
    return NextResponse.json(
      { error: "Failed to generate listing." },
      { status: 500 }
    );
  }
}
