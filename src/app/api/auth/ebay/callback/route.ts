import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/app/lib/marketplaces/ebay";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("eBay OAuth Callback Error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/settings?ebayError=${encodeURIComponent(errorDescription || error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?ebayError=No code provided", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Upsert tokens in user_marketplace_tokens table
      await supabase.from("user_marketplace_tokens").upsert([
        {
          user_id: user.id,
          platform: "ebay",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + tokens.refresh_token_expires_in * 1000).toISOString(),
          is_connected: true,
          updated_at: new Date().toISOString(),
        },
      ]);
    }

    return NextResponse.redirect(new URL("/settings?ebayConnected=true", req.url));
  } catch (err: any) {
    console.error("eBay Callback Exception:", err);
    return NextResponse.redirect(
      new URL(`/settings?ebayError=${encodeURIComponent(err.message || "OAuth exchange failed")}`, req.url)
    );
  }
}
