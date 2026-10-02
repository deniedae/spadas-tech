import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isOwnerEmail } from "@/app/lib/auth-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration missing database credentials." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Authenticate user from Bearer token or Supabase Auth header
    const authHeader = req.headers.get("authorization");
    let user: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to link Google Play purchase." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { purchaseToken, sku = "spadas_pro_monthly" } = body;

    if (!purchaseToken) {
      return NextResponse.json(
        { error: "Missing purchaseToken from Google Play purchase response." },
        { status: 400 }
      );
    }

    const isOwner = isOwnerEmail(user.email);
    const expiresAt = isOwner
      ? "2099-12-31T23:59:59Z"
      : new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();

    // 2. Upsert subscription in Supabase user_subscriptions
    const subscriptionRecord = {
      user_id: user.id,
      stripe_customer_id: `gplay_${purchaseToken.slice(0, 24)}`,
      stripe_subscription_id: `gplay_sub_${purchaseToken}`,
      status: "active",
      price_id: sku,
      current_period_end: expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from("user_subscriptions")
      .upsert(subscriptionRecord, { onConflict: "user_id" });

    if (upsertError) {
      console.error("[google-play/verify] Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update subscription in database." },
        { status: 500 }
      );
    }

    // Also update user metadata if possible
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { is_pro: true, plan: "pro" },
        user_metadata: { is_pro: true, plan: "pro" },
      });
    } catch (e) {
      console.warn("[google-play/verify] User metadata update warning:", e);
    }

    console.log(
      `[google-play/verify] Successfully activated Spadas Pro for user ${user.id} (${user.email}) via Google Play`
    );

    return NextResponse.json({
      success: true,
      active: true,
      isPro: true,
      plan: "Pro",
      currentPeriodEnd: expiresAt,
      message: "Spadas Pro successfully activated via Google Play!",
    });
  } catch (error: any) {
    console.error("[google-play/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
