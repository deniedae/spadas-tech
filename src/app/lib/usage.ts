import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface UsageStatus {
  isPro: boolean;
  usesCount: number;
  usesLeft: number;
  limitReached: boolean;
  maxFreeUses: number;
}

export async function checkUserUsage(userId: string): Promise<UsageStatus> {
  const MAX_FREE_USES = 10;
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

  // 1. Check if user is an active Pro subscriber
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = sub?.status as string | undefined;
  const isPro = status === "active" || status === "trialing" || status === "past_due";

  if (isPro) {
    return {
      isPro: true,
      usesCount: 0,
      usesLeft: Infinity,
      limitReached: false,
      maxFreeUses: MAX_FREE_USES,
    };
  }

  // 2. Count AI generations used on Free Plan
  const { count: aiCount } = await supabase
    .from("ai_listing_analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const usesCount = aiCount ?? 0;
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
