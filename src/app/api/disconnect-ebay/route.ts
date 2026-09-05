import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
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

    // Support both Bearer token header and cookie authentication
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const dbClient =
      supabaseUrl && serviceRoleKey
        ? createAdminClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : supabase;

    // 1. Query the database for the current user's user_marketplace_tokens row
    const { data: existingRow, error: queryError } = await dbClient
      .from("user_marketplace_tokens")
      .select("id, platform, is_connected")
      .eq("user_id", user.id)
      .eq("platform", "ebay")
      .maybeSingle();

    if (queryError && queryError.code !== "PGRST116") {
      console.warn("[Disconnect eBay] Query warning:", queryError.message);
    }

    // 2. Delete or clear the eBay token row/fields for this user
    const { error: deleteError } = await dbClient
      .from("user_marketplace_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", "ebay");

    if (deleteError) {
      console.error("[Disconnect eBay] Failed to delete marketplace tokens:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to disconnect eBay account" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "eBay account disconnected successfully.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[Disconnect eBay] Unhandled error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
