import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isOwnerEmail } from "@/app/lib/auth-admin";

export interface UsageStatus {
  isPro: boolean;
  usesCount: number;
  usesLeft: number;
  limitReached: boolean;
  maxFreeUses: number;
}

export const MAX_FREE_USES = 10;

export async function checkUserUsage(userId: string, userEmail?: string): Promise<UsageStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let dbClient: any;
  if (supabaseUrl && serviceRoleKey) {
    dbClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    const cookieStore = await cookies();
    dbClient = createServerClient(
      supabaseUrl,
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
  }

  // Admin & Owner Account Lifetime Pro Grant
  let isOwner = isOwnerEmail(userEmail);
  if (!isOwner) {
    try {
      const { data: authUserData } = await dbClient.auth.admin.getUserById(userId);
      if (isOwnerEmail(authUserData?.user?.email)) {
        isOwner = true;
      }
    } catch {}
  }

  // 1. Check if user is an active Pro subscriber in Stripe / Supabase
  const { data: sub, error: subError } = await dbClient
    .from("user_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (subError && subError.code !== "PGRST116") {
    console.warn("[Usage] Subscription lookup warning:", subError.message);
  }

  const status = sub?.status as string | undefined;
  const isPro = isOwner || status === "active" || status === "trialing" || status === "past_due";

  if (isPro) {
    // Upsert subscription record if owner
    if (isOwner && status !== "active") {
      await dbClient.from("user_subscriptions").upsert(
        [
          {
            user_id: userId,
            status: "active",
            price_id: "pro_owner_grant",
            current_period_end: "2099-12-31T23:59:59Z",
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "user_id" }
      );
    }

    return {
      isPro: true,
      usesCount: 0,
      usesLeft: Infinity,
      limitReached: false,
      maxFreeUses: MAX_FREE_USES,
    };
  }

  // 2. Count scans used TODAY on Free Plan (since UTC midnight)
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();

  const { count: scanCount, error: countErr } = await dbClient
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startIso);

  if (countErr) {
    console.warn("[Usage] Daily scans count query warning:", countErr.message);
  }

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
