import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ active: false, plan: "Free Beta", status: "inactive" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("status, current_period_end, price_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const isOwner = user.email?.toLowerCase() === "deniedae@gmail.com";
    const status = (data?.status as string | undefined) || "inactive";
    const isActive = isOwner || status === "active" || status === "trialing" || status === "past_due";

    return NextResponse.json({
      active: isActive,
      plan: isActive ? "Pro" : "Free Beta",
      status: isActive ? "active" : status,
    });
  } catch (error) {
    console.error("Stripe status error:", error);
    return NextResponse.json(
      {
        active: false,
        plan: "Free Beta",
        status: "inactive",
      },
      { status: 500 }
    );
  }
}
