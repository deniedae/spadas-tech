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
  dismissedByUser?: boolean;
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
 * - Inside the Android TWA / app: ONLY Google Play In-App Billing is used.
 *   Stripe checkout and web purchases are 100% hidden and blocked inside the TWA.
 * - On Web / Desktop / iPhone: Uses the standard web checkout session.
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

    const isAndroid =
      isAndroidAppEnvironment() ||
      (typeof window !== "undefined" && /Android/i.test(navigator.userAgent));

    // 1. Android TWA / Digital Goods API native in-app billing
    if (isAndroid) {
      if (!isDigitalGoodsSupported()) {
        return {
          success: false,
          error: "Subscriptions aren't available here — open Spadas from the Play Store app",
        };
      }

      let service: any = null;
      try {
        service = await (window as any).getDigitalGoodsService(
          "https://play.google.com/billing"
        );
      } catch (serviceErr: any) {
        console.warn("[Google Play Billing] Failed to connect to billing service:", serviceErr);
        return {
          success: false,
          error: "Subscriptions aren't available here — open Spadas from the Play Store app",
        };
      }

      if (!service) {
        return {
          success: false,
          error: "Subscriptions aren't available here — open Spadas from the Play Store app",
        };
      }

      let playAmount = "10.00";
      let playCurrency = "AUD";
      let playTitle = "Spadas Pro Monthly";
      let skuFound = false;

      if (typeof service.getDetails === "function") {
        try {
          const detailsList = await service.getDetails([GOOGLE_PLAY_SKU]);
          console.log("[Google Play Billing] SKU details from Play Store:", detailsList);
          if (detailsList && detailsList.length > 0) {
            skuFound = true;
            const item = detailsList[0];
            if (item.title) playTitle = item.title;
            if (item.price?.currency) playCurrency = item.price.currency;
            if (item.price?.value) playAmount = item.price.value;
          } else {
            console.warn("[Google Play Billing] Play Store returned 0 items for SKU:", GOOGLE_PLAY_SKU);
          }
        } catch (detailErr: any) {
          console.warn("[Google Play Billing] getDetails warning:", detailErr);
        }
      }

      // If Play Store does not recognize the SKU, surface actionable error
      if (!skuFound) {
        return {
          success: false,
          error: `Google Play SKU '${GOOGLE_PLAY_SKU}' is not active or available. In Google Play Console under Monetize > Subscriptions > ${GOOGLE_PLAY_SKU}, ensure the Base Plan is Active and your email is in License Testing.`,
        };
      }

      const paymentMethods = [
        {
          supportedMethods: "https://play.google.com/billing",
          data: {
            sku: GOOGLE_PLAY_SKU,
            itemId: GOOGLE_PLAY_SKU,
          },
        },
      ];
      const paymentDetails = {
        total: {
          label: playTitle,
          amount: { currency: playCurrency, value: playAmount },
        },
      };

      // Track whether the native Google Play bottom sheet actually took focus over the browser window
      let hasShownSheet = false;
      const onBlur = () => {
        hasShownSheet = true;
      };
      const onVisibilityChange = () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          hasShownSheet = true;
        }
      };

      window.addEventListener("blur", onBlur);
      document.addEventListener("visibilitychange", onVisibilityChange);

      try {
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
              packageName: GOOGLE_PLAY_PACKAGE,
            }),
          });

          const verifyData = await verifyRes.json().catch(() => ({}));
          if (verifyRes.ok && verifyData.success) {
            await response.complete("success");
            return { success: true, active: true };
          } else {
            await response.complete("fail");
            return {
              success: false,
              error: verifyData.error || "Failed to verify Google Play purchase token.",
            };
          }
        } else {
          await response.complete("fail");
          return {
            success: false,
            error: "Google Play purchase was not completed.",
          };
        }
      } catch (playErr: any) {
        console.warn("[Google Play Billing] PaymentRequest error:", playErr);

        // AbortError can mean either the user dismissed the bottom sheet,
        // OR the native dialog was aborted before ever showing (e.g. signature mismatch, license issue)
        if (playErr?.name === "AbortError") {
          if (hasShownSheet) {
            return {
              success: false,
              canceled: true,
              dismissedByUser: true,
            };
          }
          return {
            success: false,
            canceled: false,
            dismissedByUser: false,
            error:
              "Google Play payment sheet failed to launch. Verify your Google Play tester account is active and registered under License Testing in Google Play Console.",
          };
        }

        return {
          success: false,
          error:
            playErr?.message ||
            "Google Play Billing encountered an error. Please ensure Google Play Services is updated.",
        };
      } finally {
        window.removeEventListener("blur", onBlur);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    }

    // 2. Web / Desktop Only (Mac, Windows, iOS)
    // Never reach this on Android or inside TWA
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

export interface BillingDiagnostics {
  isAndroid: boolean;
  isStandalone: boolean;
  isTWA: boolean;
  hasDigitalGoodsApi: boolean;
  hasPaymentRequest: boolean;
  serviceAvailable: boolean;
  skuFound: boolean;
  skuDetails: {
    title?: string;
    price?: string;
    currency?: string;
  } | null;
  error?: string;
  recommendation?: string;
}

/**
 * Runs a non-destructive runtime health-check on Google Play Billing on the current device.
 * Identifies whether the app has the new billing library, if Google Play recognizes the SKU,
 * and outputs actionable guidance.
 */
export async function checkGooglePlayBillingDiagnostics(): Promise<BillingDiagnostics> {
  const diag: BillingDiagnostics = {
    isAndroid: false,
    isStandalone: false,
    isTWA: false,
    hasDigitalGoodsApi: false,
    hasPaymentRequest: false,
    serviceAvailable: false,
    skuFound: false,
    skuDetails: null,
  };

  if (typeof window === "undefined") return diag;

  diag.isAndroid = /Android/i.test(navigator.userAgent);
  diag.isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  diag.isTWA = document.referrer.includes("android-app://") || diag.isStandalone;
  diag.hasDigitalGoodsApi = "getDigitalGoodsService" in window;
  diag.hasPaymentRequest = typeof (window as any).PaymentRequest !== "undefined";

  if (!diag.hasDigitalGoodsApi) {
    diag.error = "Digital Goods API not detected in this session.";
    diag.recommendation =
      "Subscriptions aren't available here — open Spadas from the Play Store app.";
    return diag;
  }

  let service: any = null;
  try {
    service = await (window as any).getDigitalGoodsService("https://play.google.com/billing");
    if (!service) {
      diag.error = "Play Billing Digital Goods Service returned null.";
      diag.recommendation = "Ensure Google Play Services on your device is updated.";
      return diag;
    }
    diag.serviceAvailable = true;
  } catch (err: any) {
    diag.error = `Service Connection: ${err?.name || "Error"} - ${err?.message || String(err)}`;
    diag.recommendation =
      "Google Play rejected the billing connection. This happens when the current build (versionCode 10) hasn't been uploaded to Google Play Console yet, or when your Google account is not added to License Testing in Play Console.";
    return diag;
  }

  try {
    if (typeof service.getDetails === "function") {
      const detailsList = await service.getDetails([GOOGLE_PLAY_SKU]);
      if (detailsList && detailsList.length > 0) {
        diag.skuFound = true;
        const item = detailsList[0];
        diag.skuDetails = {
          title: item.title,
          price: item.price?.value,
          currency: item.price?.currency,
        };
        diag.recommendation = "Google Play Billing is 100% active, recognized by Play Store, and ready for purchases!";
      } else {
        diag.skuFound = false;
        diag.error = `Play Store returned 0 items for SKU '${GOOGLE_PLAY_SKU}'.`;
        diag.recommendation =
          "In Google Play Console > Monetize > Subscriptions > spadas_pro_monthly, confirm the Base Plan is 'Active' (not Draft) and that your test email is listed under Setup > License testing.";
      }
    }
  } catch (err: any) {
    diag.error = `SKU Query: ${err?.name || "Error"} - ${err?.message || String(err)}`;
    diag.recommendation =
      "Play Store could not query subscription details. Verify the Base Plan is Active and backwards-compatible in Play Console.";
  }

  return diag;
}
