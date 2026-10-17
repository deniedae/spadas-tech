import { NextRequest, NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/app/lib/marketplaces/ebay";
import { createClient } from "@/app/lib/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // Check Authorization header or query param token if cookies are not present
    const authHeader = req.headers.get("authorization");
    const queryToken = req.nextUrl?.searchParams?.get("token") || req.nextUrl?.searchParams?.get("access_token");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : queryToken;

    if (!user && token) {
      const { data } = await supabase.auth.getUser(token);
      user = data?.user || null;
    }

    const returnTo = req.nextUrl?.searchParams?.get("returnTo") || "/settings";

    if (!user) {
      return NextResponse.redirect(
        new URL(
          `/login?redirectTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(
            "Please log in to your Spadas account before connecting eBay."
          )}`,
          req.url
        )
      );
    }

    const state = Buffer.from(
      JSON.stringify({ userId: user.id, returnTo, timestamp: Date.now() })
    ).toString("base64url");

    // Default to prompt=login so user is forced to authenticate afresh like a new user
    const promptParam = req.nextUrl?.searchParams?.get("prompt");
    const promptLogin = promptParam !== "none";

    const authUrl = getEbayAuthUrl(state, promptLogin);
    return NextResponse.redirect(authUrl, {
      status: 307,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate eBay OAuth.";
    console.error("eBay connect route error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

