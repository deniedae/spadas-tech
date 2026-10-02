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
 * 1. If running inside an Android TWA with Google Play Billing enabled:
 *    Triggers the native Google Play purchase bottom sheet via the Digital Goods API.
 * 2. If running on Desktop, Web Browser, iOS, or outside the TWA container:
 *    Launches the real checkout session supporting Google Pay and Card payments,
 *    giving the user an immediate, working payment sheet instead of an empty store page.
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

    // 1. Android TWA / Digital Goods API native in-app billing
    if (isDigitalGoodsSupported()) {
      try {
        const service = await (window as any).getDigitalGoodsService(
          "https://play.google.com/billing"
        );

        if (service && typeof window.PaymentRequest !== "undefined") {
          const paymentMethods = [
            {
              supportedMethods: "https://play.google.com/billing",
              data: { sku: GOOGLE_PLAY_SKU },
            },
          ];
          const paymentDetails = {
            total: {
              label: "Spadas Pro Monthly",
              amount: { currency: "AUD", value: "10.00" },
            },
          };

          const request = new PaymentRequest(paymentMethods, paymentDetails);
          const response = await request.show();
          const { purchaseToken } = (response.details as any) || {};

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
          }
        }
      } catch (playErr: any) {
        if (playErr?.name === "AbortError") {
          // User intentionally closed the Google Play bottom sheet
          return { success: false, canceled: true };
        }
        console.warn("[Google Play Billing] In-app billing unavailable or errored:", playErr);
      }
    }

    // 2. Web / Desktop / Browser Checkout Flow (Supports Google Pay + Cards)
    // Seamlessly generates a real checkout session so the user can actually pay.
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
      "Unable to initiate payment session. Please check your connection.";
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
        "An unexpected error occurred during checkout. Please try again.",
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
