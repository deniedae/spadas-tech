"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { performPrimeReset } from "@/lib/prime-reset";

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
 * Ensures that ANY fresh phone or new user opening the app immediately sees
 * the 3 display cards showing how the app works (OnboardingCarousel), followed by
 * the 3-day free trial offer and direct entry into the scanner.
 */
export function GlobalFirstLaunchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't interrupt legal policies or explicit auth callbacks
    if (
      pathname === "/privacy" ||
      pathname === "/terms" ||
      pathname === "/delete-account" ||
      pathname?.startsWith("/api/")
    ) {
      return;
    }

    try {
      // Diagnostic & QA query parameter support: ?onboarding=1 or ?welcome=1 or ?reset=1
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("reset") === "1") {
        performPrimeReset({ resetWelcomeModal: true });
        localStorage.removeItem("hasCompletedOnboarding");
        localStorage.removeItem("hasSeenOnboarding");
        setShowOnboarding(true);
        return;
      }
      if (searchParams.get("onboarding") === "1" || searchParams.get("welcome") === "1") {
        setShowOnboarding(true);
        return;
      }

      const hasCompleted =
        localStorage.getItem("hasSeenOnboarding") === "true" ||
        localStorage.getItem("hasCompletedOnboarding") === "true";

      if (!hasCompleted) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch {
      // In restricted or error conditions, never loop onboarding
      setShowOnboarding(false);
    }
  }, [pathname]);

  const handleCompleteOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
    // Completing the 3 cards leads directly into the 3-day free trial paywall
    setShowPaywall(true);
  }, []);

  const handleSkipOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
    // Skip / test 3 free scans takes user straight into the optical camera
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  const handleClosePaywall = useCallback(() => {
    setShowPaywall(false);
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
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
          onComplete={handleCompleteOnboarding}
          onSkip={handleSkipOnboarding}
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
