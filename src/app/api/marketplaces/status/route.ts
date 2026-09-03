import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
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

    // Support both header Bearer token and cookie authentication
    const authHeader = req.headers.get("authorization");
    let user: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data } = await supabase.auth.getUser(token);
      user = data?.user;
    }

    if (!user) {
      const { data, error } = await supabase.auth.getUser();
      if (!error) user = data?.user;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Query marketplace connection server-side strictly for the authenticated user ID
    const { data: ebayToken, error: dbError } = await supabase
      .from("user_marketplace_tokens")
      .select("is_connected")
      .eq("user_id", user.id)
      .eq("platform", "ebay")
      .maybeSingle();

    if (dbError && dbError.code !== "PGRST116") {
      console.warn("[Marketplace Status] Database query warning:", dbError.message);
    }

    return NextResponse.json(
      {
        isConnected: Boolean(ebayToken?.is_connected),
        platform: "ebay",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
