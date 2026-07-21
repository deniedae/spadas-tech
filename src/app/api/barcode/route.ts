import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { barcode } = await req.json();

    const response = await fetch(
      `https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=${process.env.BARCODE_LOOKUP_API_KEY}`
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
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
        barcode: product.barcode_number,
        name: product.title,
        brand: product.brand,
        category: product.category,
        image: product.images?.[0] ?? "",
        description: product.description ?? "",
        suggestedPrice: Number(product.stores?.[0]?.price) || 0,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Barcode lookup failed",
      },
      { status: 500 }
    );
  }
}