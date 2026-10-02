import { POST as stripePost } from "@/app/api/stripe/checkout/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return stripePost(request);
}
