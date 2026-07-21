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
You are an expert eBay, Facebook Marketplace and Vinted seller.

A user is selling:

${product}

Respond ONLY in valid JSON.

{
  "title": "",
  "description": "",
  "price": 0
}

The title should be SEO friendly.

The description should be professional.

The price should be a realistic Australian resale price.
`,
    });

    const text = completion.output_text;

    const listing = JSON.parse(text);

    return NextResponse.json(listing);

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        title: "",
        description: "",
        price: ""
      },
      { status: 200 }
    );
  }
}