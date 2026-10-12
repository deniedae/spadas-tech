"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAndroidAppEnvironment } from "@/lib/google-play-billing";

/**
 * MobileFirstLaunchRedirect:
 * Inside the mobile container (TWA, Standalone PWA, APK) or mobile devices,
 * route directly to the scanner view (/lens) instead of showing the web marketing landing page.
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

    // 2. Mobile web viewport/UA: route directly into scanner as a guest or authenticated user
    const isMobileWidth = window.innerWidth < 768;
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");

    if (isMobileWidth || isMobileUA) {
      router.replace("/lens");
    }
  }, [router, searchParams]);

  return null;
}
