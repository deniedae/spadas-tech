/**
 * Spadas AI — Google AdSense & AdMob Configuration & Safety Layer
 *
 * Strategy:
 * - Keep the app monetization conservative and user-friendly.
 * - Show a single non-intrusive banner only when a live production banner ID exists.
 * - Avoid hardcoded, stale ad unit IDs in production.
 */

export const ADMOB_CONFIG = {
  // Production IDs
  publisherId: process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID || "pub-5362745474137454",
  appId: process.env.NEXT_PUBLIC_ADMOB_APP_ID || "ca-app-pub-1804367864263274~1584918058",
  // Live production AdSense Web Banner unit for Spadas
  bannerAdUnitId: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID?.trim() || "7949256639",

  // Google Mobile Ads official test ad unit for Android Banners
  testBannerAdUnitId: "ca-app-pub-3940256099942544/6300978111",

  // Ad Dimensions (standard adaptive banner format)
  bannerWidth: 320,
  bannerHeight: 50,
};

export function hasLiveBannerAdUnit(): boolean {
  return Boolean(ADMOB_CONFIG.bannerAdUnitId);
}

export function getAdClientId(): string {
  return ADMOB_CONFIG.publisherId ? `ca-pub-${ADMOB_CONFIG.publisherId.replace("pub-", "")}` : "";
}

export function getBannerSlotId(): string {
  if (!ADMOB_CONFIG.bannerAdUnitId) {
    return "";
  }
  if (!ADMOB_CONFIG.bannerAdUnitId.includes("/")) {
    return ADMOB_CONFIG.bannerAdUnitId;
  }
  return ADMOB_CONFIG.bannerAdUnitId.split("/")[1];
}

/**
 * Returns the active ad unit slot ID for serving ads.
 */
export function getActiveBannerAdUnitId(forceProduction: boolean = false): string {
  return ADMOB_CONFIG.bannerAdUnitId;
}
