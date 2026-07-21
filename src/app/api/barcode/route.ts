import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { barcode } = await req.json();

    // Placeholder product for now
    const product = {
      barcode,
      name: "Nintendo Switch Pro Controller",
      brand: "Nintendo",
      category: "Gaming Accessories",
      image:
        "https://dummyimage.com/500x500/000/fff&text=Nintendo+Controller",
      suggestedPrice: 69.99,
    };

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to lookup barcode",
      },
      { status: 500 }
    );
  }
}