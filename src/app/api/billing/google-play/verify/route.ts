import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifySubscriptionTokenWithGoogle,
  acknowledgeSubscriptionWithGoogle,
  GOOGLE_PLAY_PACKAGE_NAME,
  GOOGLE_PLAY_PRODUCT_ID,
} from "@/lib/google-play-publisher";

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

    // 1. Authenticate user from Bearer token
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

    const body = await req.json().catch(() => ({}));
    const {
      purchaseToken,
      sku = GOOGLE_PLAY_PRODUCT_ID,
      packageName = GOOGLE_PLAY_PACKAGE_NAME,
    } = body;

    if (!purchaseToken) {
      return NextResponse.json(
        { error: "Missing purchaseToken from Google Play purchase response." },
        { status: 400 }
      );
    }

    if (packageName !== GOOGLE_PLAY_PACKAGE_NAME) {
      return NextResponse.json(
        {
          error: `Package name mismatch. Expected ${GOOGLE_PLAY_PACKAGE_NAME}, received ${packageName}`,
        },
        { status: 400 }
      );
    }

    // 2. Verify subscription token with Google Play AndroidPublisher API
    let verification;
    try {
      verification = await verifySubscriptionTokenWithGoogle(
        purchaseToken,
        sku,
        packageName
      );
    } catch (apiErr: any) {
      console.error("[google-play/verify] Google Play verification error:", apiErr);
      if (apiErr?.message?.includes("Missing Google Play service account credentials")) {
        return NextResponse.json(
          {
            error:
              "Server configuration error: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON credentials are missing.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          error: `Google Play purchase verification failed: ${apiErr?.message || "Invalid token"}`,
        },
        { status: 400 }
      );
    }

    // 3. Only set Pro if Google says active and productId/packageName match
    if (!verification.isValid || verification.productId !== sku) {
      console.warn(
        `[google-play/verify] Rejected token: valid=${verification.isValid}, state=${verification.state}, sku=${verification.productId}, expectedSku=${sku}`
      );
      return NextResponse.json(
        {
          error: "Subscription is not active or product does not match.",
          state: verification.state,
          productId: verification.productId,
          isValid: false,
        },
        { status: 400 }
      );
    }

    // 4. Acknowledge subscription with Google Play if not already acknowledged
    if (!verification.isAcknowledged) {
      try {
        await acknowledgeSubscriptionWithGoogle(purchaseToken, sku, packageName);
        console.log(`[google-play/verify] Successfully acknowledged subscription with Google Play`);
      } catch (ackErr: any) {
        console.error("[google-play/verify] Failed to acknowledge subscription:", ackErr);
        return NextResponse.json(
          {
            error: `Failed to acknowledge subscription with Google Play: ${ackErr?.message || ackErr}`,
          },
          { status: 500 }
        );
      }
    }

    // 5. Store the real expiry from Google, not a calculated one
    const realExpiryIso = new Date(verification.expiryTime).toISOString();

    const subscriptionRecord = {
      user_id: user.id,
      stripe_customer_id: `gplay_${purchaseToken.slice(0, 24)}`,
      stripe_subscription_id: `gplay_sub_${purchaseToken}`,
      status: "active",
      price_id: verification.productId,
      current_period_end: realExpiryIso,
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

    // Also update user metadata in Supabase Auth
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { is_pro: true, plan: "pro" },
        user_metadata: { is_pro: true, plan: "pro" },
      });
    } catch (e) {
      console.warn("[google-play/verify] User metadata update warning:", e);
    }

    console.log(
      `[google-play/verify] Successfully activated Spadas Pro for user ${user.id} (${user.email}) via Google Play. Expiry: ${realExpiryIso}`
    );

    return NextResponse.json({
      success: true,
      active: true,
      isPro: true,
      plan: "Pro",
      productId: verification.productId,
      currentPeriodEnd: realExpiryIso,
      message: "Spadas Pro successfully verified and activated via Google Play!",
    });
  } catch (error: any) {
    console.error("[google-play/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
