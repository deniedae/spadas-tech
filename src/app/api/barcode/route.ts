import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveBarcode } from "@/app/lib/barcode/resolver";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { barcode } = await req.json();

    if (!barcode || typeof barcode !== "string" || barcode.length < 4) {
      return NextResponse.json(
        { success: false, message: "A valid barcode is required" },
        { status: 400 }
      );
    }

    const product = await resolveBarcode(barcode.trim());

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Barcode Route Error:", error);

    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
