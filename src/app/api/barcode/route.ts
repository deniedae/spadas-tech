import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveBarcode } from "@/app/lib/barcode/resolver";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Auth check — protect the route
    let supabaseResponse = NextResponse.next({ request: req });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
