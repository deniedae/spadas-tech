import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { recordValuationCorrection } from "@/app/lib/offline/valuation-feedback-store";

export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      scanId,
      rating,
      userCorrectedPrice,
      originalEstimatedPrice,
      brand,
      category,
      reason,
      notes,
    } = body;

    const validRatings = ["up", "down", "corrected", "accurate", "inaccurate"];
    if (!scanId || !rating || !validRatings.includes(String(rating).toLowerCase())) {
      return NextResponse.json({ error: "Invalid scanId or rating parameter" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. If user provided a price correction, immediately feed into automated calibration flywheel
    let calibrationResult: { newMultiplier: number; key: string } | null = null;
    if (
      typeof userCorrectedPrice === "number" &&
      typeof originalEstimatedPrice === "number" &&
      originalEstimatedPrice > 0
    ) {
      calibrationResult = await recordValuationCorrection({
        userId: user?.id || null,
        scanId,
        brand,
        category,
        originalPrice: originalEstimatedPrice,
        correctedPrice: userCorrectedPrice,
        reason: reason || (rating === "down" ? "OVERVALUED" : "PRICE_ADJUSTMENT"),
        notes,
      });
    }

    // 2. Persist scan rating if user is authenticated
    if (user) {
      const { error } = await supabase.from("scan_ratings").upsert(
        {
          user_id: user.id,
          scan_id: scanId,
          rating: String(rating).toLowerCase(),
          rated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,scan_id" }
      );

      if (error) {
        console.warn("[Scan Rating] Upsert warning:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      scanId,
      rating,
      flywheelTuned: !!calibrationResult,
      calibration: calibrationResult,
    });
  } catch (err: any) {
    console.error("[scans/rate] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
