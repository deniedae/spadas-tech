import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { barcode } = await req.json();

    if (!process.env.BARCODE_LOOKUP_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "BARCODE_LOOKUP_API_KEY is missing",
        },
        { status: 500 }
      );
    }

    console.log("API Key exists:", !!process.env.BARCODE_LOOKUP_API_KEY);
    console.log("Barcode:", barcode);

    const response = await fetch(
      `https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=${process.env.BARCODE_LOOKUP_API_KEY}`
    );

    const text = await response.text();

    console.log("Status:", response.status);
    console.log("Raw Response:", text);

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Barcode Lookup returned invalid JSON",
          raw: text,
        },
        { status: 500 }
      );
    }

    console.log("Parsed Response:", data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Barcode Lookup API Error",
          status: response.status,
          error: data,
        },
        { status: response.status }
      );
    }

    if (!data.products || data.products.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Product not found",
      });
    }

    const product = data.products[0];

    return NextResponse.json({
      success: true,
      product: {
        barcode: product.barcode_number ?? "",
        name: product.title ?? "",
        brand: product.brand ?? "Unknown",
        category: product.category ?? "Unknown",
        image: product.images?.[0] ?? "",
        description: product.description ?? "",
        suggestedPrice: Number(product.stores?.[0]?.price) || 0,
      },
    });
  } catch (error: any) {
    console.error("Barcode Lookup Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}