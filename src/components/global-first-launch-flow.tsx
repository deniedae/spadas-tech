"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { FirstLaunchWelcomeModal } from "@/components/first-launch-welcome-modal";
import { performPrimeReset } from "@/lib/prime-reset";

const OnboardingCarousel = dynamic(
  () => import("@/components/onboarding-carousel").then((m) => m.OnboardingCarousel),
  { ssr: false }
);

const SubscriptionPaywallModal = dynamic(
  () => import("@/components/subscription-paywall-modal"),
  { ssr: false }
);

export const FIRST_LAUNCH_WELCOME_KEY = "spadas_first_launch_welcome_v1";

/**
 * GlobalFirstLaunchFlow:
 * Ensures that ANY fresh phone, new install, or new session immediately sees the
 * 3 Free Scans Welcome Screen the second the app is loaded on ANY route.
 *
 * It transparently highlights:
 * - 3 Free Scans Ready & Countdown (3 -> 2 -> 1 -> 0)
 * - Clear explanation that once 3 scans are used, upgrade to Spadas Pro ($10 AUD / $6.99 USD/mo)
 * - 1-tap entry straight into the camera scanner or instant Pro upgrade.
 */
export function GlobalFirstLaunchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWelcome, setShowWelcome] = useState(false);
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
      // Diagnostic & QA query parameter support: ?welcome=1 or ?reset=1
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("reset") === "1") {
        performPrimeReset({ resetWelcomeModal: true });
        setShowWelcome(true);
        return;
      }
      if (searchParams.get("welcome") === "1") {
        setShowWelcome(true);
        return;
      }

      const hasSeenWelcome = localStorage.getItem(FIRST_LAUNCH_WELCOME_KEY) === "true";
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    } catch {
      // Fallback: If localStorage is restricted, show welcome once
      setShowWelcome(true);
    }
  }, [pathname]);

  const handleStartScanning = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem(FIRST_LAUNCH_WELCOME_KEY, "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}

    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  const handleUpgradePro = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem(FIRST_LAUNCH_WELCOME_KEY, "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}

    setShowPaywall(true);
  }, []);

  const handleViewGuide = useCallback(() => {
    setShowWelcome(false);
    setShowOnboarding(true);
  }, []);

  const handleCompleteOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasCompletedOnboarding", "true");
      localStorage.setItem(FIRST_LAUNCH_WELCOME_KEY, "true");
    } catch {}
    setShowPaywall(true);
  }, []);

  const handleSkipOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasCompletedOnboarding", "true");
      localStorage.setItem(FIRST_LAUNCH_WELCOME_KEY, "true");
    } catch {}
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  const handleClosePaywall = useCallback(() => {
    setShowPaywall(false);
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  if (!showWelcome && !showOnboarding && !showPaywall) {
    return null;
  }

  return (
    <>
      {showWelcome && (
        <FirstLaunchWelcomeModal
          isOpen={showWelcome}
          onStartScanning={handleStartScanning}
          onUpgradePro={handleUpgradePro}
          onViewGuide={handleViewGuide}
        />
      )}
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
