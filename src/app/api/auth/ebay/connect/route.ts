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

    const authUrl = getEbayAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("eBay connect route error:", err);
    return NextResponse.json({ error: err.message || "Failed to initiate eBay OAuth." }, { status: 500 });
  }
}
