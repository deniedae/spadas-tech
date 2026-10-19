"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAndroidAppEnvironment } from "@/lib/google-play-billing";

const MOBILE_SCANNER_INTENT_KEY = "spadas_mobile_intent";

function hasMobileScannerIntent(): boolean {
  try {
    return localStorage.getItem(MOBILE_SCANNER_INTENT_KEY) === "scanner";
  } catch {
    return false;
  }
}

/**
 * MobileFirstLaunchRedirect:
 * Keep the marketing landing page visible for mobile web visitors, and only
 * route to the scanner for installed app containers (APK, TWA, PWA standalone) or users
 * who explicitly intended to open the scanner. This prevents bounce rate spikes and
 * premature camera-permission drop-off.
 *
 * If the user explicitly clicked "Back" from /lens or navigated with ?ref=exit,
 * the redirect is suppressed so the user can explore the landing page if desired.
 */
export function MobileFirstLaunchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect explicit exit or back button navigation from /lens
    const isExitRef = searchParams.get("ref") === "exit" || searchParams.get("stay") === "true";
    if (isExitRef) return;

    let hasExitedLens = false;
    try {
      hasExitedLens = sessionStorage.getItem("spadas_exited_lens") === "1";
    } catch {}
    if (hasExitedLens) return;

    // 1. Android APK / TWA / Standalone App Container: ALWAYS route directly to scanner view
    const isAppContainer =
      isAndroidAppEnvironment() ||
      window.matchMedia("(display-mode: standalone)").matches ||
      document.referrer.includes("android-app://") ||
      Boolean((window as any).AndroidBridge);

    if (isAppContainer) {
      router.replace("/lens");
      return;
    }

    // 2. Mobile web viewport/UA: only route directly into scanner if explicit intent exists
    const isMobileWidth = window.innerWidth < 768;
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");

    if ((isMobileWidth || isMobileUA) && hasMobileScannerIntent()) {
      router.replace("/lens");
    }
  }, [router, searchParams]);

  return null;
}
