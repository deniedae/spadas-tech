/**
 * Spadas AI — Google AdMob Configuration & Safety Layer
 *
 * Strategy:
 * - Keep the app monetization conservative and user-friendly.
 * - Show a single non-intrusive banner only when a live production banner ID exists.
 * - Use the official Google test ad unit during development so QA can test without harming the account.
 * - Avoid hardcoded, stale ad unit IDs in production.
 */

export const ADMOB_CONFIG = {
  // Production IDs
  publisherId: process.env.NEXT_PUBLIC_ADMOB_PUBLISHER_ID || "pub-1804367864263274",
  appId: process.env.NEXT_PUBLIC_ADMOB_APP_ID || "ca-app-pub-1804367864263274~1584918058",
  // Live production AdMob banner unit for Thrift Scanner
  bannerAdUnitId: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID?.trim() || "ca-app-pub-1804367864263274/9735058162",

  // Google Mobile Ads official test ad unit for Android Banners
  // (Safe for local dev, preview deployments, and internal testing)
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
  if (!ADMOB_CONFIG.bannerAdUnitId.includes("/")) {
    return "";
  }
  return ADMOB_CONFIG.bannerAdUnitId.split("/")[1];
}

/**
 * Returns the appropriate ad unit ID based on environment.
 * In production, no banner is shown until a live production unit is configured.
 */
export function getActiveBannerAdUnitId(forceProduction: boolean = false): string {
  const hasProductionBanner = hasLiveBannerAdUnit();

  if (!hasProductionBanner) {
    return forceProduction ? "" : ADMOB_CONFIG.testBannerAdUnitId;
  }

  if (forceProduction) {
    return ADMOB_CONFIG.bannerAdUnitId;
  }

  const isDev = process.env.NODE_ENV !== "production";
  return isDev ? ADMOB_CONFIG.testBannerAdUnitId : ADMOB_CONFIG.bannerAdUnitId;
}
