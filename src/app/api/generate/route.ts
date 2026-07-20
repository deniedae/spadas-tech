import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { product } = await request.json();

  const completion = await openai.responses.create({
    model: "gpt-5",
    input: `
You are an expert eBay and Facebook Marketplace seller.

Return ONLY valid JSON.

Create the best listing possible for:

${product}

The JSON must contain:

{
  "title": "...",
  "price": "...",
  "description": "...",
  "condition": "...",
  "keywords": ["...", "...", "..."]
}
`,
  });

  const listing = JSON.parse(completion.output_text);

  const { error } = await supabase
    .from("listings")
    .insert([listing]);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(listing);
}