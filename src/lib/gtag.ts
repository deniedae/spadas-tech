export const GA_TRACKING_ID = "AW-18430569894";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track custom conversion event for Google Ads (AW-18430569894)
 */
export function trackGoogleConversion(
  conversionLabel?: string,
  params?: {
    value?: number;
    currency?: string;
    transactionId?: string;
  }
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const sendTo = conversionLabel ? `${GA_TRACKING_ID}/${conversionLabel}` : GA_TRACKING_ID;

  window.gtag("event", "conversion", {
    send_to: sendTo,
    value: params?.value,
    currency: params?.currency || "AUD",
    transaction_id: params?.transactionId,
  });
}
