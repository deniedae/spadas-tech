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

    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: {
        app: "spadas-ai",
        price_id: priceId,
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
