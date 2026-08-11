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

    if (!process.env.EBAY_CLIENT_ID || process.env.EBAY_CLIENT_ID.startsWith("DEMO_")) {
      return NextResponse.json(
        {
          error: "eBay Developer Credentials (EBAY_CLIENT_ID & EBAY_RU_NAME) are missing in environment variables. Please add your official App ID from developer.ebay.com to .env.local and Vercel.",
        },
        { status: 400 }
      );
    }

    const authUrl = getEbayAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("eBay connect route error:", err);
    return NextResponse.json({ error: err.message || "Failed to initiate eBay OAuth." }, { status: 500 });
  }
}
