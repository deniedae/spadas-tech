import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface UsageStatus {
  isPro: boolean;
  usesCount: number;
  usesLeft: number;
  limitReached: boolean;
  maxFreeUses: number;
}

export const MAX_FREE_USES = 5;

export async function checkUserUsage(userId: string): Promise<UsageStatus> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin & Owner Account Lifetime Pro Grant
  const isOwner = user?.email?.toLowerCase() === "deniedae@gmail.com";

  // 1. Check if user is an active Pro subscriber in Stripe / Supabase
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = sub?.status as string | undefined;
  const isPro = isOwner || status === "active" || status === "trialing" || status === "past_due";

  if (isPro) {
    // Upsert subscription record if owner
    if (isOwner && status !== "active") {
      await supabase.from("user_subscriptions").upsert([
        {
          user_id: userId,
          status: "active",
          price_id: "pro_owner_grant",
          current_period_end: "2099-12-31T23:59:59Z",
        },
      ]);
    }

    return {
      isPro: true,
      usesCount: 0,
      usesLeft: Infinity,
      limitReached: false,
      maxFreeUses: MAX_FREE_USES,
    };
  }

  // 2. Count scans used on Free Plan from scans and analyses tables
  const { count: scanCount } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const usesCount = scanCount ?? 0;
  const usesLeft = Math.max(0, MAX_FREE_USES - usesCount);
  const limitReached = usesCount >= MAX_FREE_USES;

  return {
    isPro: false,
    usesCount,
    usesLeft,
    limitReached,
    maxFreeUses: MAX_FREE_USES,
  };
}
