import { NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/app/lib/marketplaces/ebay";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "guest";
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64url");

    const clientId = process.env.EBAY_CLIENT_ID;
    const ruName = process.env.EBAY_RU_NAME;

    if (!clientId || !ruName || clientId.startsWith("DEMO_") || ruName.startsWith("DEMO_")) {
      return NextResponse.json(
        {
          error: "eBay Developer Credentials (EBAY_CLIENT_ID & EBAY_RU_NAME) are missing or set to placeholder values.",
          message: "Please ensure EBAY_CLIENT_ID and EBAY_RU_NAME are set in your environment variables (.env.local & Vercel). Note: EBAY_RU_NAME must be your official eBay RuName identifier (e.g. Denie_Dae-Spadas-SBX-123456), not a standard web URL.",
          setupGuide: "https://developer.ebay.com/my/keys",
        },
        { status: 400 }
      );
    }

    const authUrl = getEbayAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("eBay connect route error:", err);
    return NextResponse.json({ error: err.message || "Failed to initiate eBay OAuth." }, { status: 400 });
  }
}
