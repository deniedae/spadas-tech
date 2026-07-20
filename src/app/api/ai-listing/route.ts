import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { product } = await req.json();

    const completion = await openai.responses.create({
      model: "gpt-5",
      input: `
You are an expert eBay and Facebook Marketplace seller.

Create a listing for:

${product}

Return only the listing description.
`,
    });

    return NextResponse.json({
      result: completion.output_text,
    });
  } catch (err) {
    console.error("OpenAI Error:", err);

    // Fallback so the app still works without AI
    return NextResponse.json({
      result: "",
    });
  }
}