/**
 * Spadas AI — Google AdMob Configuration & Safety Layer
 * 
 * Complies with Google AdMob Policies:
 * - Automatically falls back to Google's official Test Ad Unit in development / non-production
 *   to prevent accidental invalid clicks and account suspension.
 * - Ad Unit IDs are sourced from environment variables with production fallbacks.
 */

export const ADMOB_CONFIG = {
  // Production IDs
  publisherId: process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID || "pub-1804367864263274",
  appId: process.env.NEXT_PUBLIC_ADMOB_APP_ID || "ca-app-pub-1804367864263274~1584918058",
  bannerAdUnitId: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID || "ca-app-pub-1804367864263274/1361556776",

  // Google Mobile Ads official test ad unit for Android Banners
  // (Safe for local dev, preview deployments, and internal testing)
  testBannerAdUnitId: "ca-app-pub-3940256099942544/6300978111",

  // Ad Dimensions (standard adaptive banner format)
  bannerWidth: 320,
  bannerHeight: 50,
};

/**
 * Returns the appropriate ad unit ID based on environment.
 * Prevents invalid impressions / self-clicking during local development.
 */
export function getActiveBannerAdUnitId(forceProduction: boolean = false): string {
  if (forceProduction) {
    return ADMOB_CONFIG.bannerAdUnitId;
  }
  const isDev = process.env.NODE_ENV !== "production";
  return isDev ? ADMOB_CONFIG.testBannerAdUnitId : ADMOB_CONFIG.bannerAdUnitId;
}
