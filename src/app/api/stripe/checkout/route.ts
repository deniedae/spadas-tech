import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

    if (!secretKey || !priceId) {
      return NextResponse.json(
        {
          message: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to your environment.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
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

    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email || undefined,
      line_items: [
        {
          price: targetPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: {
        app: "spadas-ai",
        plan_id: planId,
        price_id: targetPriceId,
        user_email: email,
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
