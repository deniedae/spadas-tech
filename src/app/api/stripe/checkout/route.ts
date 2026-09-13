import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/server";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
    const appUrl = rawAppUrl.replace(/\/+$/, "");

    if (!secretKey || !priceId) {
      return NextResponse.json(
        {
          message: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to your environment.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const planId = typeof body?.planId === "string" ? body.planId : "starter";

    // Determine target price ID based on selected plan tier
    let targetPriceId = priceId;
    if (planId === "starter" && process.env.STRIPE_STARTER_PRICE_ID) {
      targetPriceId = process.env.STRIPE_STARTER_PRICE_ID;
    } else if (planId === "pro" && process.env.STRIPE_PRO_PRICE_ID) {
      targetPriceId = process.env.STRIPE_PRO_PRICE_ID;
    } else if (planId === "enterprise" && process.env.STRIPE_ENTERPRISE_PRICE_ID) {
      targetPriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;
    }

    // Get authenticated user server-side so we can pass user_id to the webhook
    const supabase = await createClient();
    const authHeader = request.headers.get("authorization");
    let user: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data } = await supabase.auth.getUser(token);
      user = data?.user;
    }

    if (!user) {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      user = sessionUser;
    }

    const stripe = new Stripe(secretKey);

    const rawReturnPath = typeof body?.returnPath === "string" ? body.returnPath.replace(/^\/+/, "") : "settings";
    const targetReturnPath = rawReturnPath ? `/${rawReturnPath}` : "/settings";

    const customerEmail = user?.email || (typeof body?.email === "string" && body.email.trim() ? body.email.trim() : undefined);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: customerEmail,
      // client_reference_id is Stripe's first-class field for associating a checkout with your own user ID.
      // The webhook reads this to reliably look up the user — no email-matching fragility.
      client_reference_id: user?.id || undefined,
      line_items: [
        {
          price: targetPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}${targetReturnPath}?checkout=success`,
      cancel_url: `${appUrl}${targetReturnPath}?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: {
        app: "spadas-ai",
        plan_id: planId,
        price_id: targetPriceId,
        user_id: user?.id || "",
        user_email: user?.email || customerEmail || "",
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const stripeError = error instanceof Error ? error : new Error("Stripe checkout failed.");
    console.error("Stripe Error:", stripeError);

    return NextResponse.json(
      {
        message: stripeError.message,
      },
      { status: 500 }
    );
  }
}
