import { NextResponse, type NextRequest } from "next/server";
import { resolveBarcode } from "@/app/lib/barcode/resolver";
import { getCachedBarcode } from "@/app/lib/barcode/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BarcodeLookupProduct {
  title: string;
  brand: string;
  category: string;
  model: string;
  upc: string | null;
  ean: string | null;
  image?: string | null;
  suggestedPrice?: number;
  source?: string;
}

/**
 * GET /api/lookup/barcode?code={code}
 * High-speed deterministic barcode resolver:
 * 1. Checks internal / database cache for <50ms lookup.
 * 2. Cascades through multi-provider catalog (UPCItemDB, Books, OpenFoodFacts, eBay, BarcodeLookup).
 * 3. Returns structured product payload without invoking heavy vision AI models.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code =
      url.searchParams.get("code") ||
      url.searchParams.get("barcode") ||
      url.searchParams.get("upc") ||
      url.searchParams.get("ean") ||
      "";

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 4) {
      return NextResponse.json(
        { success: false, error: "A valid barcode string (minimum 4 characters) is required" },
        { status: 400 }
      );
    }

    // 1. Check local / database cache first for ultra-fast response
    const cached = await getCachedBarcode(cleanCode);
    if (
      cached &&
      cached.name &&
      cached.name.trim() !== "" &&
      !cached.name.toLowerCase().includes("unknown")
    ) {
      const isEan = cleanCode.length === 13;
      const isUpc = cleanCode.length === 12;

      return NextResponse.json({
        success: true,
        cached: true,
        product: {
          title: cached.name,
          brand: cached.brand || "Unbranded",
          category: cached.category || "General",
          model: "",
          upc: isUpc ? cleanCode : cleanCode.length < 13 ? cleanCode : null,
          ean: isEan ? cleanCode : cleanCode.length >= 13 ? cleanCode : null,
          image: cached.image || null,
          suggestedPrice: cached.suggestedPrice || 0,
          source: cached.source || "Cache",
        },
      });
    }

    // 2. Multi-provider resolution cascade
    const product = await resolveBarcode(cleanCode);

    if (!product || !product.name || product.name.toLowerCase().includes("unknown")) {
      return NextResponse.json(
        { success: false, error: "Product not found for provided barcode" },
        { status: 404 }
      );
    }

    const isEan = cleanCode.length === 13;
    const isUpc = cleanCode.length === 12;

    const payload: BarcodeLookupProduct = {
      title: product.name,
      brand: product.brand || "Unbranded",
      category: product.category || "General",
      model: "",
      upc: isUpc ? cleanCode : cleanCode.length < 13 ? cleanCode : null,
      ean: isEan ? cleanCode : cleanCode.length >= 13 ? cleanCode : null,
      image: product.image || null,
      suggestedPrice: product.suggestedPrice || 0,
      source: product.source || "Catalog",
    };

    return NextResponse.json({
      success: true,
      cached: false,
      product: payload,
    });
  } catch (error: any) {
    console.error("[api/lookup/barcode] Lookup error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
