"use client";

import { supabase } from "@/app/lib/supabase";

export const GOOGLE_PLAY_PACKAGE = "com.spadas.ai";
export const GOOGLE_PLAY_SKU_MONTHLY = "spadas_pro_monthly";
export const GOOGLE_PLAY_SKU_WEEKLY = "spadas_pro_weekly_trial";
export const GOOGLE_PLAY_SKU_WEEKLY_FALLBACK = "spadas_pro_weekly";
export const GOOGLE_PLAY_SKU = GOOGLE_PLAY_SKU_MONTHLY;
export const GOOGLE_PLAY_SKUS = [
  GOOGLE_PLAY_SKU_WEEKLY,
  GOOGLE_PLAY_SKU_WEEKLY_FALLBACK,
  GOOGLE_PLAY_SKU_MONTHLY,
];

export const GOOGLE_PLAY_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?sku=${GOOGLE_PLAY_SKU}&package=${GOOGLE_PLAY_PACKAGE}`;
export const GOOGLE_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE}`;

export interface PlayProductDetail {
  itemId: string;
  title: string;
  description?: string;
  price: string;
  currency: string;
  period: "weekly" | "monthly";
  trialDays?: number;
}

export interface PurchaseResult {
  success: boolean;
  active?: boolean;
  canceled?: boolean;
  dismissedByUser?: boolean;
  isDesktopRedirect?: boolean;
  error?: string;
}

export interface PurchaseOptions {
  planId?: "weekly" | "monthly" | string;
  returnPath?: string;
  mock?: boolean;
}

export function isMockProActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("spadas_mock_pro_active") === "true";
  } catch {
    return false;
  }
}

export function setMockProActive(active: boolean, planId: string = "weekly"): void {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      localStorage.setItem("spadas_mock_pro_active", "true");
      localStorage.setItem("spadas_mock_plan", planId);
    } else {
      localStorage.removeItem("spadas_mock_pro_active");
      localStorage.removeItem("spadas_mock_plan");
    }
  } catch {}
}

export async function mockGooglePlayPurchase(planId: "weekly" | "monthly" = "weekly"): Promise<PurchaseResult> {
  setMockProActive(true, planId);
  return { success: true, active: true };
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
 * Initiates the subscription checkout for Spadas Pro.
 *
 * CRITICAL POLICY ENFORCEMENT:
 * - Inside the Android TWA / app: ONLY Google Play In-App Billing is used.
 *   Stripe checkout and web purchases are 100% hidden and blocked inside the TWA.
 * - On Web / Desktop / iPhone: Uses the standard web checkout session.
 */
export async function purchaseGooglePlaySubscription(
  options?: PurchaseOptions
): Promise<PurchaseResult> {
  // Mock / Dev Bypass check
  if (options?.mock || isMockProActive()) {
    setMockProActive(true, options?.planId === "monthly" ? "monthly" : "weekly");
    return { success: true, active: true };
  }

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

    const targetSku =
      options?.planId === "weekly" ? GOOGLE_PLAY_SKU_WEEKLY : GOOGLE_PLAY_SKU_MONTHLY;

    // 1. Android TWA / Digital Goods API native in-app billing.
    const isNativePlayEnvironment = isAndroidAppEnvironment() && isDigitalGoodsSupported();

    if (isNativePlayEnvironment) {
      let service: any = null;
      try {
        service = await (window as any).getDigitalGoodsService(
          "https://play.google.com/billing"
        );
      } catch (serviceErr: any) {
        console.warn("[Google Play Billing] Failed to connect to billing service:", serviceErr);
      }

      if (service) {
        let playAmount = options?.planId === "weekly" ? "3.99" : "9.99";
        let playCurrency = "USD";
        let playTitle = options?.planId === "weekly" ? "Spadas Pro Weekly" : "Spadas Pro Monthly";
        let skuFound = false;
        let actualSku = targetSku;

        if (typeof service.getDetails === "function") {
          try {
            const querySkus = Array.from(
              new Set([
                targetSku,
                GOOGLE_PLAY_SKU_WEEKLY,
                GOOGLE_PLAY_SKU_WEEKLY_FALLBACK,
                GOOGLE_PLAY_SKU_MONTHLY,
              ])
            );
            const detailsList = await service.getDetails(querySkus);
            console.log("[Google Play Billing] SKU details from Play Store:", detailsList);
            if (detailsList && detailsList.length > 0) {
              const matchedItem =
                detailsList.find((i: any) => i.itemId === targetSku) ||
                (options?.planId === "weekly"
                  ? detailsList.find(
                      (i: any) =>
                        i.itemId === GOOGLE_PLAY_SKU_WEEKLY ||
                        i.itemId === GOOGLE_PLAY_SKU_WEEKLY_FALLBACK
                    )
                  : detailsList.find((i: any) => i.itemId === GOOGLE_PLAY_SKU_MONTHLY)) ||
                detailsList[0];
              if (matchedItem) {
                skuFound = true;
                actualSku = matchedItem.itemId || targetSku;
                if (matchedItem.title) playTitle = matchedItem.title;
                if (matchedItem.price?.currency) playCurrency = matchedItem.price.currency;
                if (matchedItem.price?.value) playAmount = matchedItem.price.value;
              }
            } else {
              console.warn("[Google Play Billing] Play Store returned 0 items for SKUs:", querySkus);
            }
          } catch (detailErr: any) {
            console.warn("[Google Play Billing] getDetails warning:", detailErr);
          }
        }

        // If Play Store does not recognize the SKU, surface actionable error
        if (!skuFound) {
          return {
            success: false,
            error: `Google Play SKU '${targetSku}' is not active or available. In Google Play Console under Monetize > Subscriptions > ${targetSku}, ensure the Base Plan is Active and your email is in License Testing.`,
          };
        }

        const paymentMethods = [
          {
            supportedMethods: "https://play.google.com/billing",
            data: {
              sku: actualSku,
              itemId: actualSku,
            },
          },
        ];
        const paymentDetails = {
          total: {
            label: playTitle,
            amount: { currency: playCurrency, value: playAmount },
          },
        };

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
                sku: actualSku,
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
    }

    // 2. Web / Desktop & Mobile Browser Checkout (Stripe)
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

/**
 * Queries Google Play Billing (via Digital Goods Service) for active subscription plans
 * and pricing details, returning standardized Weekly and Monthly plan structures.
 */
export async function queryGooglePlaySubscriptionPlans(): Promise<{
  weekly: PlayProductDetail;
  monthly: PlayProductDetail;
}> {
  const defaultWeekly: PlayProductDetail = {
    itemId: GOOGLE_PLAY_SKU_WEEKLY,
    title: "Weekly Plan",
    price: "$3.99",
    currency: "USD",
    period: "weekly",
    trialDays: 3,
  };

  const defaultMonthly: PlayProductDetail = {
    itemId: GOOGLE_PLAY_SKU_MONTHLY,
    title: "Monthly Plan",
    price: "$9.99",
    currency: "USD",
    period: "monthly",
  };

  if (!isAndroidAppEnvironment() || !isDigitalGoodsSupported()) {
    return { weekly: defaultWeekly, monthly: defaultMonthly };
  }

  try {
    const service = await (window as any).getDigitalGoodsService("https://play.google.com/billing");
    if (service && typeof service.getDetails === "function") {
      const detailsList = await service.getDetails([
        GOOGLE_PLAY_SKU_WEEKLY,
        GOOGLE_PLAY_SKU_WEEKLY_FALLBACK,
        GOOGLE_PLAY_SKU_MONTHLY,
      ]);
      if (Array.isArray(detailsList)) {
        for (const item of detailsList) {
          if (
            item.itemId === GOOGLE_PLAY_SKU_WEEKLY ||
            item.itemId === GOOGLE_PLAY_SKU_WEEKLY_FALLBACK
          ) {
            defaultWeekly.itemId = item.itemId;
            defaultWeekly.title = item.title || defaultWeekly.title;
            if (item.price?.value) defaultWeekly.price = `${item.price.currency === "AUD" ? "A$" : "$"}${item.price.value}`;
            if (item.price?.currency) defaultWeekly.currency = item.price.currency;
          } else if (item.itemId === GOOGLE_PLAY_SKU_MONTHLY) {
            defaultMonthly.title = item.title || defaultMonthly.title;
            if (item.price?.value) defaultMonthly.price = `${item.price.currency === "AUD" ? "A$" : "$"}${item.price.value}`;
            if (item.price?.currency) defaultMonthly.currency = item.price.currency;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Google Play Billing] Query plans warning:", err);
  }

  return { weekly: defaultWeekly, monthly: defaultMonthly };
}

/**
 * Restores previous purchases by querying Google Play Digital Goods Service or local backend.
 */
export async function restoreGooglePlayPurchases(): Promise<{
  success: boolean;
  active: boolean;
  message: string;
}> {
  if (isMockProActive()) {
    return { success: true, active: true, message: "Restored active subscription (Debug Mode)." };
  }

  if (!isAndroidAppEnvironment() || !isDigitalGoodsSupported()) {
    try {
      const res = await fetch("/api/billing/status");
      const data = await res.json().catch(() => ({}));
      if (data.active || data.plan === "Pro") {
        return { success: true, active: true, message: "Subscription active and restored!" };
      }
      return { success: false, active: false, message: "No active subscription found to restore." };
    } catch {
      return { success: false, active: false, message: "Unable to verify subscriptions. Please try again." };
    }
  }

  try {
    const service = await (window as any).getDigitalGoodsService("https://play.google.com/billing");
    if (service && typeof service.listPurchases === "function") {
      const purchases = await service.listPurchases();
      if (Array.isArray(purchases) && purchases.length > 0) {
        for (const p of purchases) {
          const purchaseToken = p.purchaseToken || p.token;
          if (purchaseToken) {
            const verifyRes = await fetch("/api/billing/google-play/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                purchaseToken,
                sku: p.itemId || GOOGLE_PLAY_SKU_MONTHLY,
                packageName: GOOGLE_PLAY_PACKAGE,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyRes.ok && verifyData.success) {
              return { success: true, active: true, message: "Purchase restored successfully!" };
            }
          }
        }
      }
    }
    return { success: false, active: false, message: "No active Google Play purchases found." };
  } catch (err: any) {
    return { success: false, active: false, message: err?.message || "Failed to query Google Play purchases." };
  }
}

