import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stripe checkout has been replaced with Google Play Billing.
 * Legacy requests are safely routed to the Google Play Store app listing.
 */
export async function POST() {
  return NextResponse.json({
    url: "https://play.google.com/store/apps/details?id=com.spadas.ai",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=com.spadas.ai",
    message: "Spadas Pro subscriptions are now powered exclusively through Google Play Billing.",
  });
}
