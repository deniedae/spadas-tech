import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-role client — only used server-side, never exposed to browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the JWT and get the user
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 2. Best-effort data wipe: Firestore / Supabase tables.
    //    Errors here are non-fatal — the account deletion itself is the critical step.
    const tables = [
      "listings",
      "scan_history",
      "haul_items",
      "support_tickets",
      "ebay_connections",
      "user_preferences",
    ];

    await Promise.allSettled(
      tables.map((table) =>
        supabaseAdmin.from(table).delete().eq("user_id", userId)
      )
    );

    // 3. Delete the Supabase auth user (cascades storage + RLS)
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("[delete-account] Failed to delete user:", deleteErr.message);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[delete-account] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
