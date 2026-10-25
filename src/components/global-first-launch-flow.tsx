"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { performPrimeReset } from "@/lib/prime-reset";
import { supabase } from "@/app/lib/supabase";
import { trackFunnel } from "@/lib/funnel-analytics";

// UI hint only (not an entitlement): the paywall is owed once the user finishes signing in.
const PENDING_PAYWALL_KEY = "spadas_pending_paywall_v1";
const PAYWALL_SKIP_PATHS = ["/privacy", "/terms", "/delete-account", "/press", "/creators", "/login", "/signup"];

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
        setShowOnboarding(true);
        setShowPaywall(false);
        return;
      }

      if (searchParams.get("onboarding") === "1" || searchParams.get("welcome") === "1") {
        setShowOnboarding(true);
        setShowPaywall(false);
        return;
      }

      const hasCompleted =
        localStorage.getItem("hasSeenOnboarding") === "true" ||
        localStorage.getItem("hasCompletedOnboarding") === "true";

      if (!hasCompleted) {
        setShowOnboarding(true);
        setShowPaywall(false);
      } else {
        setShowOnboarding(false);
        setShowPaywall(false);
      }
    } catch {
      // In restricted or error conditions, never loop onboarding
      setShowOnboarding(false);
      setShowPaywall(false);
    }
  }, [pathname]);

  // After sign-in, reopen the paywall that was deferred when the user finished onboarding.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname || PAYWALL_SKIP_PATHS.includes(pathname) || pathname.startsWith("/api/")) return;

    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_PAYWALL_KEY) === "1";
    } catch {}
    if (!pending) return;

    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user) {
        setShowOnboarding(false);
        setShowPaywall(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const routeToScanner = useCallback(() => {
    if (pathname !== "/lens") {
      router.push("/lens");
    }
  }, [pathname, router]);

  const markOnboardingSeen = useCallback(() => {
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch {}
  }, []);

  // Sequence: carousel -> sign in -> paywall -> scanner.
  // Signed-in users see the paywall straight away; signed-out users are sent to login first
  // and the paywall reopens on return, so the trial button never sends anyone away.
  const continueToPaywall = useCallback(async () => {
    setShowOnboarding(false);
    markOnboardingSeen();

    let signedIn = false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      signedIn = Boolean(session?.user);
    } catch {}

    if (signedIn) {
      setShowPaywall(true);
      return;
    }

    try {
      localStorage.setItem(PENDING_PAYWALL_KEY, "1");
    } catch {}
    trackFunnel("signin_required", { from: "onboarding" });
    router.push(`/login?redirect=${encodeURIComponent("/lens")}`);
  }, [markOnboardingSeen, router]);

  const handleCompleteOnboarding = useCallback(() => {
    trackFunnel("onboarding_completed");
    void continueToPaywall();
  }, [continueToPaywall]);

  const handleSkipOnboarding = useCallback(() => {
    trackFunnel("onboarding_skipped");
    void continueToPaywall();
  }, [continueToPaywall]);

  const handleClosePaywall = useCallback(() => {
    setShowPaywall(false);
    markOnboardingSeen();
    try {
      localStorage.removeItem(PENDING_PAYWALL_KEY);
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spadas:onboarding-complete"));
    }
    routeToScanner();
  }, [markOnboardingSeen, routeToScanner]);

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
          onSuccess={handleClosePaywall}
          fromOnboarding={true}
        />
      )}
    </>
  );
}
