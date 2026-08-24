import { NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/app/lib/marketplaces/ebay";
import { createClient } from "@/app/lib/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "guest";
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64url");

    const authUrl = getEbayAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate eBay OAuth.";
    console.error("eBay connect route error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
