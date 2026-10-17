"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { performPrimeReset } from "@/lib/prime-reset";

const FirstLaunchWelcomeModal = dynamic(
  () => import("@/components/first-launch-welcome-modal").then((m) => m.FirstLaunchWelcomeModal),
  { ssr: false }
);

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
       pathname === "/press" ||
       pathname === "/creators" ||
       pathname === "/login" ||
       pathname === "/signup" ||
        pathname?.startsWith("/api/")
     ) {
       return;
    }

    try {
      // Diagnostic & QA query parameter support: ?onboarding=1 or ?welcome=1 or ?reset=1
      const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("reset") === "1") {
          performPrimeReset({ resetWelcomeModal: true });
          localStorage.removeItem("spadas_first_launch_welcome_v1");
          localStorage.removeItem("hasCompletedOnboarding");
          localStorage.removeItem("hasSeenOnboarding");
          setShowWelcome(true);
          setShowOnboarding(false);
          setShowPaywall(false);
          return;
        }
        if (searchParams.get("onboarding") === "1" || searchParams.get("welcome") === "1") {
          setShowWelcome(false);
          setShowOnboarding(true);
          return;
        }

        const hasSeenWelcome = localStorage.getItem("spadas_first_launch_welcome_v1") === "true";
        const hasCompleted =
          localStorage.getItem("hasSeenOnboarding") === "true" ||
          localStorage.getItem("hasCompletedOnboarding") === "true";

        if (!hasSeenWelcome && !hasCompleted) {
          setShowWelcome(true);
          setShowOnboarding(false);
        } else {
          setShowWelcome(false);
          setShowOnboarding(false);
        }
      } catch {
        // In restricted or error conditions, never loop onboarding
        setShowWelcome(false);
        setShowOnboarding(false);
      }
  }, [pathname]);

  const routeToScanner = useCallback(() => {
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  const markFirstLaunchSeen = useCallback(() => {
    try {
      localStorage.setItem("spadas_first_launch_welcome_v1", "true");
      localStorage.setItem("hasSeenOnboarding", "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
  }, []);

  const handleStartScanning = useCallback(() => {
    setShowWelcome(false);
    setShowOnboarding(false);
    setShowPaywall(false);
    markFirstLaunchSeen();
    routeToScanner();
  }, [markFirstLaunchSeen, routeToScanner]);

  const handleOpenGuide = useCallback(() => {
    setShowWelcome(false);
    setShowOnboarding(true);
  }, []);

  const handleUpgradeFromWelcome = useCallback(() => {
    setShowWelcome(false);
    setShowPaywall(true);
  }, []);

  const handleCompleteOnboarding = useCallback(() => {
    setShowOnboarding(false);
    markFirstLaunchSeen();
    routeToScanner();
  }, [markFirstLaunchSeen, routeToScanner]);

  const handleSkipOnboarding = useCallback(() => {
    setShowOnboarding(false);
    markFirstLaunchSeen();
    routeToScanner();
  }, [markFirstLaunchSeen, routeToScanner]);

  const handleClosePaywall = useCallback(() => {
    setShowPaywall(false);
    markFirstLaunchSeen();
    routeToScanner();
  }, [markFirstLaunchSeen, routeToScanner]);

  if (!showWelcome && !showOnboarding && !showPaywall) {
    return null;
  }

  return (
    <>
      {showWelcome && (
        <FirstLaunchWelcomeModal
          isOpen={showWelcome}
          onStartScanning={handleStartScanning}
          onUpgradePro={handleUpgradeFromWelcome}
          onViewGuide={handleOpenGuide}
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
