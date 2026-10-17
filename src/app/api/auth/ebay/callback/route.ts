import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/app/lib/marketplaces/ebay";
import { createClient } from "@/app/lib/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
    return NextResponse.redirect(new URL("/settings?ebayError=No authorization code provided", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Try resolving user from SSR cookies first
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let resolvedUserId = user?.id;
    let returnTo = "/settings";

    // Fallback: decode userId and returnTo from state if cookies were not passed across redirects
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
        if (decoded.userId && decoded.userId !== "guest") {
          resolvedUserId = resolvedUserId || decoded.userId;
        }
        if (decoded.returnTo && typeof decoded.returnTo === "string" && decoded.returnTo.startsWith("/")) {
          returnTo = decoded.returnTo;
        }
      } catch (parseErr) {
        console.warn("Could not parse OAuth state:", parseErr);
      }
    }

    if (!resolvedUserId) {
      const destUrl = new URL(returnTo, req.url);
      destUrl.searchParams.set("ebayError", "Could not identify your Spadas account. Please log in and retry.");
      return NextResponse.redirect(destUrl);
    }

    // Save tokens using service role key to ensure permission
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const dbClient =
      supabaseUrl && serviceRoleKey
        ? createAdminClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : supabase;

    const { error: upsertError } = await dbClient.from("user_marketplace_tokens").upsert(
      [
        {
          user_id: resolvedUserId,
          platform: "ebay",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + tokens.refresh_token_expires_in * 1000).toISOString(),
          is_connected: true,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,platform" }
    );

    if (upsertError) {
      console.error("Failed to save eBay marketplace tokens:", upsertError);
      const destUrl = new URL(returnTo, req.url);
      destUrl.searchParams.set("ebayError", upsertError.message);
      return NextResponse.redirect(destUrl);
    }

    const destUrl = new URL(returnTo, req.url);
    destUrl.searchParams.set("ebayConnected", "true");
    return NextResponse.redirect(destUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OAuth exchange failed";
    console.error("eBay Callback Exception:", err);
    return NextResponse.redirect(
      new URL(`/settings?ebayError=${encodeURIComponent(message)}`, req.url)
    );
  }
}
