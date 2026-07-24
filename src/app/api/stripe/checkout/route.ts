import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [
    {
      price: process.env.STRIPE_PRICE_ID!,
      quantity: 1,
    },
  ],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
});

    return NextResponse.json({
      url: session.url,
    });
} catch (error: any) {
  console.error("Stripe Error:", error);

  return NextResponse.json(
    {
      message: error.message,
      code: error.code,
      type: error.type,
      param: error.param,
      raw: error.raw,
    },
    { status: 500 }
  );
}}