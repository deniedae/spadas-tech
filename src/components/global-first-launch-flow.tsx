"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const OnboardingCarousel = dynamic(
  () => import("@/components/onboarding-carousel").then((m) => m.OnboardingCarousel),
  { ssr: false }
);

const SubscriptionPaywallModal = dynamic(
  () => import("@/components/subscription-paywall-modal"),
  { ssr: false }
);

/**
 * GlobalFirstLaunchFlow:
 * Ensures that ANY new user opening the app on ANY route (e.g. fresh install from Google Play Store,
 * TWA startUrl, home landing page, dashboard, or direct scanner link) is guaranteed to see the
 * 3-slide onboarding introduction followed by the native Google Play / Pro subscription paywall.
 * 
 * Once completed or skipped, `hasCompletedOnboarding` is stored in localStorage so returning users
 * are never interrupted again.
 */
export function GlobalFirstLaunchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't interrupt explicit legal policy or account deletion flows
    if (
      pathname === "/privacy" ||
      pathname === "/terms" ||
      pathname === "/delete-account" ||
      pathname?.startsWith("/api/")
    ) {
      return;
    }

    try {
      const hasCompleted = localStorage.getItem("hasCompletedOnboarding") === "true";
      if (!hasCompleted) {
        setShowOnboarding(true);
      }
    } catch {
      // Fallback: If localStorage is restricted, show onboarding once
      setShowOnboarding(true);
    }
  }, [pathname]);

  const handleComplete = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
    setShowPaywall(true);
  }, []);

  const handleSkip = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
    // Route new users to the main camera scanner if not already there
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  const handleClosePaywall = useCallback(() => {
    setShowPaywall(false);
    // After paywall dismissal, land user directly into the optical camera scanner
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  if (!showOnboarding && !showPaywall) {
    return null;
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingCarousel
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
      {showPaywall && (
        <SubscriptionPaywallModal
          isOpen={showPaywall}
          onClose={handleClosePaywall}
          fromOnboarding={true}
        />
      )}
    </>
  );
}
