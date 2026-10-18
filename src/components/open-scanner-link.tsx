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
 * Keep the marketing landing page visible for most mobile web visitors, and only
 * force the scanner for installed app containers or users who explicitly intend
 * to open the scanner. This reduces premature camera-permission drop-off.
 */
export function MobileFirstLaunchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isExitRef = searchParams.get("ref") === "exit" || searchParams.get("stay") === "true";
    if (isExitRef) return;

    let hasExitedLens = false;
    try {
      hasExitedLens = sessionStorage.getItem("spadas_exited_lens") === "1";
    } catch {}
    if (hasExitedLens) return;

    const isAppContainer =
      isAndroidAppEnvironment() ||
      window.matchMedia("(display-mode: standalone)").matches ||
      document.referrer.includes("android-app://") ||
      Boolean((window as any).AndroidBridge);

    if (isAppContainer) {
      router.replace("/lens");
      return;
    }

    const isMobileWidth = window.innerWidth < 768;
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent || "",
      );

    if ((isMobileWidth || isMobileUA) && hasMobileScannerIntent()) {
      router.replace("/lens");
    }
  }, [router, searchParams]);

  return null;
}
