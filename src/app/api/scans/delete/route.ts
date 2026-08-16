import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId, clearAll } = await request.json().catch(() => ({}));
    console.log('[Scans Delete] Processing deletion request:', { scanId, clearAll, userId: user.id });

    if (clearAll) {
      const { error } = await supabase
        .from("scans")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error('[Scans Delete] Clear all failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log('[Scans Delete] Successfully cleared all history for user:', user.id);
      return NextResponse.json({ success: true, message: "All scan history cleared" });
    }

    if (!scanId) {
      return NextResponse.json({ error: "Missing scanId parameter" }, { status: 400 });
    }

    const { error } = await supabase
      .from("scans")
      .delete()
      .eq("id", scanId)
      .eq("user_id", user.id);

    if (error) {
      console.error('[Scans Delete] Single record delete failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log('[Scans Delete] Successfully deleted scanId:', scanId, 'for user:', user.id);

    return NextResponse.json({ success: true, scanId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
