import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Resolves the Supabase user_id from a Stripe event payload.
 * Priority:
 * 1. client_reference_id / metadata.user_id — set by our checkout route (most reliable)
 * 2. stripe_customer_id lookup in user_subscriptions table (for renewals)
 * 3. Email lookup as a last resort (only for checkout.session.completed)
 */
async function resolveUserId(
  supabaseAdmin: SupabaseClient,
  opts: {
    clientReferenceId?: string | null;
    metadataUserId?: string | null;
    customerId?: string | null;
    customerEmail?: string | null;
  }
): Promise<string | null> {
  // 1. Our own user_id stored in metadata / client_reference_id
  const directId = opts.clientReferenceId || opts.metadataUserId;
  if (directId) return directId;

  // 2. stripe_customer_id lookup in existing subscription records
  if (opts.customerId) {
    const { data } = await supabaseAdmin
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }

  // 3. Email lookup — only used as fallback for checkout.session.completed
  if (opts.customerEmail) {
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const match = userData?.users?.find(
      (u) => u.email?.toLowerCase() === opts.customerEmail!.toLowerCase()
    );
    if (match) return match.id;
  }

  return null;
}

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "[stripe/webhook] Missing required env vars: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY"
    );
    return NextResponse.json({ message: "Webhook not configured." }, { status: 500 });
  }

  if (!webhookSecret) {
    console.error(
      "[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook signatures. All events will be rejected."
    );
    return NextResponse.json({ message: "Webhook secret not configured." }, { status: 500 });
  }

  const payload = await request.text();
  const sig = (await headers()).get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(payload, sig || "", webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ message: "Invalid signature." }, { status: 400 });
  }

  // Use the service role key to bypass RLS for subscription writes
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`[stripe/webhook] Received event: ${event.type}`);

  try {
    // ── checkout.session.completed ──────────────────────────────────────────
    // Fires when a user successfully completes checkout (new subscription).
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      const userId = await resolveUserId(supabaseAdmin, {
        clientReferenceId: session.client_reference_id,
        metadataUserId: session.metadata?.user_id,
        customerId,
        customerEmail:
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.user_email ||
          null,
      });

      if (!userId) {
        console.warn(
          "[stripe/webhook] checkout.session.completed — could not resolve user_id, skipping."
        );
        return NextResponse.json({ received: true });
      }

      const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "active",
          price_id: session.metadata?.price_id || process.env.STRIPE_PRICE_ID || null,
          current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
      console.log(
        `[stripe/webhook] checkout.session.completed — Pro activated for user ${userId}`
      );
    }

    // ── invoice.payment_succeeded ───────────────────────────────────────────
    // Fires on every successful renewal. In Stripe v22, subscription ID is at
    // invoice.parent.subscription_details.subscription (not invoice.subscription).
    else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;

      // Extract subscription ID from the new v22 parent structure
      const subDetails = invoice.parent?.subscription_details;
      const subscriptionId =
        subDetails && typeof subDetails.subscription === "string"
          ? subDetails.subscription
          : null;

      const userId = await resolveUserId(supabaseAdmin, { customerId });
      if (!userId) {
        console.warn(
          "[stripe/webhook] invoice.payment_succeeded — could not resolve user_id, skipping."
        );
        return NextResponse.json({ received: true });
      }

      // Refresh period end: if we have a subscription ID, fetch the live data
      let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (subscriptionId) {
        try {
          const stripe = new Stripe(stripeSecret);
          // Expand billing_cycle_anchor; current_period_end is on the raw object
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          // `sub` is typed as Response<Subscription> — cast to access raw fields
          const rawSub = sub as unknown as Record<string, unknown>;
          if (typeof rawSub.current_period_end === "number") {
            periodEnd = new Date(rawSub.current_period_end * 1000).toISOString();
          }
        } catch (fetchErr) {
          console.warn(
            "[stripe/webhook] Could not fetch subscription for period_end, using +30d estimate:",
            fetchErr
          );
        }
      }

      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          status: "active",
          current_period_end: periodEnd,
          ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      console.log(`[stripe/webhook] invoice.payment_succeeded — renewed Pro for user ${userId}`);
    }

    // ── customer.subscription.updated ──────────────────────────────────────
    // Fires when subscription status changes: trial ends, payment fails, cancels.
    else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      const userId = await resolveUserId(supabaseAdmin, {
        metadataUserId: sub.metadata?.user_id,
        customerId,
      });

      if (!userId) {
        console.warn(
          "[stripe/webhook] customer.subscription.updated — could not resolve user_id, skipping."
        );
        return NextResponse.json({ received: true });
      }

      // current_period_end exists on the raw object at runtime (Stripe v22 types don't expose it)
      const rawSub = sub as unknown as Record<string, unknown>;
      const periodEnd =
        typeof rawSub.current_period_end === "number"
          ? new Date(rawSub.current_period_end * 1000).toISOString()
          : undefined;

      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          status: sub.status,
          stripe_subscription_id: sub.id,
          ...(periodEnd ? { current_period_end: periodEnd } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      console.log(
        `[stripe/webhook] customer.subscription.updated — user ${userId} → ${sub.status}`
      );
    }

    // ── customer.subscription.deleted ──────────────────────────────────────
    // Fires when a subscription is fully cancelled.
    else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      const userId = await resolveUserId(supabaseAdmin, {
        metadataUserId: sub.metadata?.user_id,
        customerId,
      });

      if (!userId) {
        console.warn(
          "[stripe/webhook] customer.subscription.deleted — could not resolve user_id, skipping."
        );
        return NextResponse.json({ received: true });
      }

      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      console.log(`[stripe/webhook] customer.subscription.deleted — Pro revoked for user ${userId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[stripe/webhook] Handler error for event "${event.type}":`, error);
    // Return 200 to prevent Stripe retry storms — the event was received, handler failed.
    return NextResponse.json({
      received: true,
      error: "Handler failed — check server logs.",
    });
  }
}
