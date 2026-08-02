import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: "Stripe webhook not configured." }, { status: 500 });
    }

    const payload = await request.text();
    const signature = (await headers()).get("stripe-signature");

    const event = Stripe.webhooks.constructEvent(payload, signature || "", webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.customer_details?.email || session.metadata?.user_email || session.customer_email || "";
      const customerId = typeof session.customer === "string" ? session.customer : null;

      if (!userEmail) {
        return NextResponse.json({ received: true });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) {
        throw userError;
      }

      const match = userData.users.find((user) => user.email?.toLowerCase() === userEmail.toLowerCase());
      if (!match) {
        return NextResponse.json({ received: true });
      }

      const { error: upsertError } = await supabaseAdmin.from("user_subscriptions").upsert(
        {
          user_id: match.id,
          stripe_customer_id: customerId,
          status: "active",
          price_id: session.metadata?.price_id || process.env.STRIPE_PRICE_ID || null,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertError) {
        throw upsertError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ message: "Webhook failed." }, { status: 400 });
  }
}
