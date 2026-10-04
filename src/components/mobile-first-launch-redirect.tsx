"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * MobileFirstLaunchRedirect:
 * When a mobile user opens the app (e.g. fresh install from Google Play Store or mobile browser),
 * this automatically opens /lens immediately so users get zero-friction instant scanning.
 * 
 * If the user explicitly clicked "Back" from /lens or navigated with ?ref=exit,
 * the redirect is suppressed so the user can freely explore the landing page or dashboard.
 */
export function MobileFirstLaunchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect explicit exit or back button navigation from /lens
    const isExitRef = searchParams.get("ref") === "exit" || searchParams.get("stay") === "true";
    let hasExitedLens = false;
    try {
      hasExitedLens = sessionStorage.getItem("spadas_exited_lens") === "1";
    } catch {}

    if (isExitRef || hasExitedLens) {
      return;
    }

    // Detect mobile touch viewport (<768px width) or mobile user agent
    const isMobileWidth = window.innerWidth < 768;
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");

    if (isMobileWidth || isMobileUA) {
      // First-time mobile visitor -> route straight into the optical scanner (/lens)
      router.replace("/lens");
    }
  }, [router, searchParams]);

  return null;
}
