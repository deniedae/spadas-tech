"use client";

import { supabase } from "@/app/lib/supabase";

export const GOOGLE_PLAY_PACKAGE = "com.spadas.ai";
export const GOOGLE_PLAY_SKU = "spadas_pro_monthly";
export const GOOGLE_PLAY_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?sku=${GOOGLE_PLAY_SKU}&package=${GOOGLE_PLAY_PACKAGE}`;
export const GOOGLE_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE}`;

export interface PurchaseResult {
  success: boolean;
  active?: boolean;
  canceled?: boolean;
  isDesktopRedirect?: boolean;
  error?: string;
}

export interface PurchaseOptions {
  planId?: string;
  returnPath?: string;
}

/**
 * Detects whether the user is running inside the Android App (TWA, PWA standalone, or Android WebView).
 */
export function isAndroidAppEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const isAndroidUA = /Android/i.test(navigator.userAgent);
  if (!isAndroidUA) return false;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isAppWebView = /wv|Android.*Version\/[0-9.]+|Silk-Accelerated/i.test(navigator.userAgent);
  const isTWA = document.referrer.includes("android-app://") || isStandalone;
  return isStandalone || isAppWebView || isTWA || Boolean((window as any).AndroidBridge);
}

/**
 * Checks whether the current runtime environment supports W3C Digital Goods API
 * backed by Google Play Billing (typically Chrome on Android inside a TWA).
 */
export function isDigitalGoodsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "getDigitalGoodsService" in window &&
    typeof (window as any).PaymentRequest !== "undefined"
  );
}

/**
 * Initiates the subscription checkout for Spadas Pro ($10 AUD/month).
 *
 * CRITICAL POLICY ENFORCEMENT:
 * - On Android / in the Android app: ONLY Google Play In-App Billing is used.
 *   Stripe checkout is 100% blocked on Android to protect Google Play compliance.
 * - On Web / Desktop / iPhone: Uses the web checkout session.
 */
export async function purchaseGooglePlaySubscription(
  options?: PurchaseOptions
): Promise<PurchaseResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return {
        success: false,
        error: "Please sign in first to link your Spadas Pro subscription.",
      };
    }

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session.access_token) {
      authHeaders["Authorization"] = `Bearer ${session.access_token}`;
    }

    const isAndroid = isAndroidAppEnvironment() || (typeof window !== "undefined" && /Android/i.test(navigator.userAgent));

    // 1. Android TWA / Digital Goods API native in-app billing
    if (typeof window !== "undefined" && "getDigitalGoodsService" in window) {
      try {
        const service = await (window as any).getDigitalGoodsService(
          "https://play.google.com/billing"
        );

        if (service && typeof window.PaymentRequest !== "undefined") {
          let playAmount = "10.00";
          let playCurrency = "AUD";
          let playTitle = "Spadas Pro Monthly";

          if (typeof service.getDetails === "function") {
            try {
              const detailsList = await service.getDetails([GOOGLE_PLAY_SKU]);
              console.log("[Google Play Billing] SKU details from Play Store:", detailsList);
              if (detailsList && detailsList.length > 0) {
                const item = detailsList[0];
                if (item.title) playTitle = item.title;
                if (item.price?.currency) playCurrency = item.price.currency;
                if (item.price?.value) playAmount = item.price.value;
              } else {
                console.warn("[Google Play Billing] No details returned for SKU:", GOOGLE_PLAY_SKU);
              }
            } catch (detailErr) {
              console.warn("[Google Play Billing] getDetails warning:", detailErr);
            }
          }

          const paymentMethods = [
            {
              supportedMethods: "https://play.google.com/billing",
              data: { sku: GOOGLE_PLAY_SKU },
            },
          ];
          const paymentDetails = {
            total: {
              label: playTitle,
              amount: { currency: playCurrency, value: playAmount },
            },
          };

          const request = new PaymentRequest(paymentMethods, paymentDetails);
          const response = await request.show();
          const details = (response.details as any) || {};
          const purchaseToken = details.purchaseToken || details.token;

          if (purchaseToken) {
            const verifyRes = await fetch("/api/billing/google-play/verify", {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({
                purchaseToken,
                sku: GOOGLE_PLAY_SKU,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              await response.complete("success");
              return { success: true, active: true };
            } else {
              await response.complete("fail");
              return {
                success: false,
                error: verifyData.error || "Failed to link Google Play purchase.",
              };
            }
          } else {
            await response.complete("fail");
            return {
              success: false,
              error: "Google Play purchase was not completed.",
            };
          }
        }
      } catch (playErr: any) {
        if (playErr?.name === "AbortError") {
          // User intentionally closed the Google Play bottom sheet
          return { success: false, canceled: true };
        }
        console.warn("[Google Play Billing] In-app billing error:", playErr);
        if (isAndroid) {
          return {
            success: false,
            error: "Google Play Billing: " + (playErr?.message || "Please ensure Google Play Services is updated and you are connected to the Play Store."),
          };
        }
      }
    }

    // If on Android, NEVER EVER open Stripe!
    if (isAndroid) {
      return {
        success: false,
        error: "Google Play Billing is initializing. Please ensure you are running the latest app build from Google Play and that the base plan is active.",
      };
    }

    // 2. Web / Desktop Only (Mac, Windows, iOS)
    const checkoutRes = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        planId: options?.planId || "starter",
        returnPath: options?.returnPath || "settings",
      }),
    });

    const checkoutData = await checkoutRes.json().catch(() => ({}));
    if (checkoutRes.ok && checkoutData?.url) {
      window.location.href = checkoutData.url;
      return { success: true };
    }

    const message =
      checkoutData?.message ||
      "Unable to initiate checkout session. Please check your connection.";
    return {
      success: false,
      error: message,
    };
  } catch (err: any) {
    console.error("[Billing Checkout Error]:", err);
    return {
      success: false,
      error:
        err?.message ||
        "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Opens Google Play Subscription Management page in a new window/tab.
 * This allows subscribers to review renewal date, change payment methods, or cancel anytime.
 */
export function openGooglePlaySubscriptionManager(): void {
  if (typeof window !== "undefined") {
    window.open(GOOGLE_PLAY_SUBSCRIPTIONS_URL, "_blank");
  }
}

/**
 * Opens the public Google Play Store page for Spadas Lens.
 */
export function openGooglePlayStore(): void {
  if (typeof window !== "undefined") {
    window.open(GOOGLE_PLAY_STORE_URL, "_blank");
  }
}
