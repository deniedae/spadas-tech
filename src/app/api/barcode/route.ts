import { NextResponse } from "next/server";
import { getCachedBarcode } from "../../lib/barcode/cache";
import { lookupGoogleBooks } from "../../lib/barcode/google-books";
import { saveBarcode } from "../../lib/barcode/cache";

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
    const cached = await getCachedBarcode(barcode);

    if (cached) {
      console.log("Found in barcode cache");

      return NextResponse.json({
        success: true,
        product: cached,
      });
    }

    // Nothing found yet
    // Check Google Books
const googleBook = await lookupGoogleBooks(barcode);

if (googleBook) {
  await saveBarcode(googleBook);

  return NextResponse.json({
    success: true,
    product: googleBook,
  });
}

// Nothing found
return NextResponse.json({
  success: false,
  message: "Product not found",
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