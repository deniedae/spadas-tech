import { NextRequest, NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/app/lib/marketplaces/ebay";
import { createClient } from "@/app/lib/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "guest";
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64url");

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

