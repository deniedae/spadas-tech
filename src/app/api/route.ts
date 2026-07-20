import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { product } = await request.json();

    if (!product) {
      return NextResponse.json(
        { error: "No product provided" },
        { status: 400 }
      );
    }

    const listing = {
      title: `${product} Tested Working - Great Condition`,
      price: "$50 - $100 AUD",
      description: `Great condition ${product}. Fully tested and ready for sale. Perfect for collectors, gamers, or anyone looking for quality tech.`,
      marketplace: {
        ebay: `${product} Tested Working`,
        facebook: `${product} - Available Now`,
        vinted: `${product} Vintage Tech Item`
      }
    };

    return NextResponse.json(listing);

  } catch (error) {
    console.error("Generator error:", error);

    return NextResponse.json(
      { error: "Failed to generate listing" },
      { status: 500 }
    );
  }
}