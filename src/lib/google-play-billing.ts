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
 * Initiates the Google Play subscription flow for Spadas Pro ($10 AUD/month).
 * On Android TWA, triggers the native bottom sheet via Digital Goods / Payment Request API.
 * Outside Android TWA, redirects/opens the Google Play Store listing so users can subscribe on Android.
 */
export async function purchaseGooglePlaySubscription(): Promise<PurchaseResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return {
        success: false,
        error: "Please sign in to link your Google Play subscription.",
      };
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
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
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
              error: "Google Play purchase token was not received.",
            };
          }
        }
      } catch (playErr: any) {
        if (playErr?.name === "AbortError") {
          // User dismissed or closed the Google Play payment sheet
          return { success: false, canceled: true };
        }
        console.warn("[Google Play Billing] PaymentRequest error:", playErr);
      }
    }

    // 2. Desktop or external browser fallback:
    // Open Google Play Store app listing directly
    if (typeof window !== "undefined") {
      window.open(GOOGLE_PLAY_STORE_URL, "_blank");
      return {
        success: true,
        isDesktopRedirect: true,
        error: "Opening Spadas Lens on Google Play. Subscribe directly in Google Play on your Android device.",
      };
    }

    return {
      success: false,
      error: "Google Play Billing is not supported on this browser.",
    };
  } catch (err: any) {
    console.error("[Google Play Billing] Unexpected error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during Google Play checkout.",
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
