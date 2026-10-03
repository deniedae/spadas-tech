import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifySubscriptionTokenWithGoogle,
  acknowledgeSubscriptionWithGoogle,
  GOOGLE_PLAY_PACKAGE_NAME,
  GOOGLE_PLAY_PRODUCT_ID,
} from "@/lib/google-play-publisher";

export const dynamic = "force-dynamic";

/**
 * Google Play Real-time Developer Notifications (RTDN) Endpoint.
 *
 * Configured as a Cloud Pub/Sub Push Subscription target.
 * Receives subscription lifecycle events (renewal, cancellation, expiration, refund/revocation)
 * and updates Supabase user_subscriptions and auth.users accordingly.
 *
 * Cloud Pub/Sub expects an HTTP 200/204 response. If non-200 is returned, Pub/Sub
 * retries delivering the message with exponential backoff.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[google-play/notifications] Missing Supabase server credentials.");
      return NextResponse.json({ error: "Missing DB configuration" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body || !body.message || !body.message.data) {
      console.warn("[google-play/notifications] Received empty or malformed Pub/Sub envelope");
      return NextResponse.json({ error: "Invalid Pub/Sub envelope" }, { status: 400 });
    }

    // Decode base64 Pub/Sub payload
    let decodedString: string;
    try {
      decodedString = Buffer.from(body.message.data, "base64").toString("utf-8");
    } catch (e: any) {
      console.error("[google-play/notifications] Failed to decode base64 data:", e);
      return NextResponse.json({ error: "Base64 decode error" }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(decodedString);
    } catch (e: any) {
      console.error("[google-play/notifications] Failed to parse payload JSON:", e);
      return NextResponse.json({ error: "Invalid JSON in message data" }, { status: 400 });
    }

    console.log(
      `[google-play/notifications] Received notification for package: ${payload.packageName}, version: ${payload.version}`
    );

    // 1. Handle Test Notification from Google Play Console
    if (payload.testNotification) {
      console.log("[google-play/notifications] Received Test Notification from Play Console. Verified!");
      return NextResponse.json({ success: true, test: true }, { status: 200 });
    }

    // 2. Handle Subscription Notification
    const subNotice = payload.subscriptionNotification;
    if (!subNotice) {
      console.log("[google-play/notifications] Non-subscription event received (e.g. one-time product). Skipping.");
      return NextResponse.json({ success: true, skipped: true }, { status: 200 });
    }

    const {
      notificationType,
      purchaseToken,
      subscriptionId = GOOGLE_PLAY_PRODUCT_ID,
    } = subNotice;
    const packageName = payload.packageName || GOOGLE_PLAY_PACKAGE_NAME;

    if (!purchaseToken) {
      console.warn("[google-play/notifications] Missing purchaseToken in subscriptionNotification");
      return NextResponse.json({ error: "Missing purchaseToken" }, { status: 400 });
    }

    console.log(
      `[google-play/notifications] Processing notificationType=${notificationType} for SKU=${subscriptionId}`
    );

    // 3. Verify latest status with Google Play AndroidPublisher API
    let verification: any = null;
    try {
      verification = await verifySubscriptionTokenWithGoogle(
        purchaseToken,
        subscriptionId,
        packageName
      );
    } catch (apiErr: any) {
      console.error("[google-play/notifications] AndroidPublisher query failed:", apiErr);
      // Return 200 so Pub/Sub doesn't loop if credentials or token are permanently broken
      return NextResponse.json(
        { received: true, error: apiErr?.message || "Google Play API error" },
        { status: 200 }
      );
    }

    // 4. Locate subscriber in Supabase user_subscriptions
    const subIdMatch = `gplay_sub_${purchaseToken}`;
    const custIdMatch = `gplay_${purchaseToken.slice(0, 24)}`;

    const { data: rows, error: selectErr } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .or(`stripe_subscription_id.eq.${subIdMatch},stripe_customer_id.eq.${custIdMatch}`)
      .limit(1);

    if (selectErr) {
      console.error("[google-play/notifications] DB lookup error:", selectErr);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const existingSub = rows?.[0];
    if (!existingSub) {
      console.warn(
        `[google-play/notifications] No matching user_subscription found for token: ${purchaseToken.slice(0, 16)}...`
      );
      return NextResponse.json({ received: true, unmatched: true }, { status: 200 });
    }

    const userId = existingSub.user_id;
    const realExpiryIso = verification.expiryTime
      ? new Date(verification.expiryTime).toISOString()
      : existingSub.current_period_end;
    const isExpiryInFuture = verification.expiryTime
      ? new Date(verification.expiryTime).getTime() > Date.now()
      : false;

    // Notification Type Mapping:
    // 1: SUBSCRIPTION_RECOVERED
    // 2: SUBSCRIPTION_RENEWED
    // 3: SUBSCRIPTION_CANCELED
    // 4: SUBSCRIPTION_PURCHASED
    // 5: SUBSCRIPTION_ON_HOLD
    // 6: SUBSCRIPTION_IN_GRACE_PERIOD
    // 7: SUBSCRIPTION_RESTARTED
    // 10: SUBSCRIPTION_PAUSED
    // 12: SUBSCRIPTION_REVOKED (refunded / chargeback)
    // 13: SUBSCRIPTION_EXPIRED
    let newStatus = "active";
    let isProUser = false;

    switch (notificationType) {
      case 1: // RECOVERED
      case 2: // RENEWED
      case 4: // PURCHASED
      case 7: // RESTARTED
        newStatus = "active";
        isProUser = isExpiryInFuture && verification.isValid;
        // Auto-acknowledge if pending
        if (!verification.isAcknowledged) {
          try {
            await acknowledgeSubscriptionWithGoogle(purchaseToken, subscriptionId, packageName);
          } catch (e) {
            console.warn("[google-play/notifications] Auto-acknowledgement warning:", e);
          }
        }
        break;

      case 6: // IN_GRACE_PERIOD
        newStatus = "in_grace_period";
        isProUser = true; // Google recommends keeping service active during grace period
        break;

      case 3: // CANCELED (User turned off recurring billing, access remains until period ends)
        newStatus = "canceled";
        isProUser = isExpiryInFuture;
        break;

      case 5: // ON_HOLD (Payment failed)
        newStatus = "past_due";
        isProUser = false;
        break;

      case 10: // PAUSED
        newStatus = "paused";
        isProUser = false;
        break;

      case 12: // REVOKED (Immediate refund or revoked by Google)
        newStatus = "revoked";
        isProUser = false;
        break;

      case 13: // EXPIRED
        newStatus = "expired";
        isProUser = false;
        break;

      default:
        newStatus = isExpiryInFuture && verification.isValid ? "active" : "canceled";
        isProUser = isExpiryInFuture && verification.isValid;
        break;
    }

    // 5. Update user_subscriptions
    const updateRecord = {
      status: newStatus,
      price_id: verification.productId || existingSub.price_id,
      current_period_end: realExpiryIso,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabaseAdmin
      .from("user_subscriptions")
      .update(updateRecord)
      .eq("id", existingSub.id);

    if (updateErr) {
      console.error("[google-play/notifications] Update user_subscriptions error:", updateErr);
    } else {
      console.log(
        `[google-play/notifications] Updated subscription for user ${userId}: status=${newStatus}, isPro=${isProUser}, expiry=${realExpiryIso}`
      );
    }

    // 6. Sync user metadata in Supabase Auth
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { is_pro: isProUser, plan: isProUser ? "pro" : "free" },
        user_metadata: { is_pro: isProUser, plan: isProUser ? "pro" : "free" },
      });
      console.log(`[google-play/notifications] Synced auth metadata for user ${userId} (is_pro=${isProUser})`);
    } catch (authErr) {
      console.warn("[google-play/notifications] User metadata sync warning:", authErr);
    }

    return NextResponse.json(
      {
        received: true,
        notificationType,
        status: newStatus,
        isPro: isProUser,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[google-play/notifications] Unhandled error in RTDN handler:", error);
    // Always return 200 to acknowledge Pub/Sub push
    return NextResponse.json({ received: true, error: error?.message }, { status: 200 });
  }
}
