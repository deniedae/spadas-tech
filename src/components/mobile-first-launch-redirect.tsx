"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

/**
 * MobileFirstLaunchRedirect:
 * First-time visitors should see the homepage pitch.
 * Only redirect signed-in returning mobile users back into /lens.
 * 
 * If the user explicitly clicked "Back" from /lens or navigated with ?ref=exit,
 * the redirect is suppressed so the user can freely explore the landing page or dashboard.
 */
export function MobileFirstLaunchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    // Respect explicit exit or back button navigation from /lens
    const isExitRef = searchParams.get("ref") === "exit" || searchParams.get("stay") === "true";
    let hasExitedLens = false;
    let hasSeenHomepage = false;
    try {
      hasExitedLens = sessionStorage.getItem("spadas_exited_lens") === "1";
      hasSeenHomepage = localStorage.getItem("spadas_seen_home") === "1";
    } catch {}

    if (isExitRef || hasExitedLens) {
      return;
    }

    // Detect mobile touch viewport (<768px width) or mobile user agent
    const isMobileWidth = window.innerWidth < 768;
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");

    if (!(isMobileWidth || isMobileUA)) return;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled && hasSeenHomepage && session?.user) {
        router.replace("/lens");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return null;
}
