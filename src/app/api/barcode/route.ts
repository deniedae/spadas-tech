import { NextResponse } from "next/server";
import { resolveBarcode } from "@/app/lib/barcode/resolver";

export async function POST(req: Request) {
  try {
    const { barcode } = await req.json();

    if (!barcode) {
      return NextResponse.json(
        {
          success: false,
          message: "No barcode supplied",
        },
        { status: 400 }
      );
    }

    console.log("Scanning:", barcode);

    // Check Supabase cache first
    const product = await resolveBarcode(barcode);

if (!product) {
  return NextResponse.json({
    success: false,
    message: "Product not found",
  });
}

return NextResponse.json({
  success: true,
  product,
});
  } catch (error) {
    console.error("Barcode Route Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}