/**
 * Canonical production domain & deployment protection configuration.
 *
 * CRITICAL RULE: Never derive canonical origin from VERCEL_URL.
 * VERCEL_URL produces dynamic preview domains that search engines
 * can inadvertently index, fracturing domain trust.
 */
export const PRODUCTION_SITE_URL = "https://spadas-tech.vercel.app";

function resolveCanonicalSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!envUrl) return PRODUCTION_SITE_URL;

  try {
    const parsed = new URL(envUrl);
    // Ignore dynamic preview vercel hostnames (e.g. spadas-tech-git-*.vercel.app)
    if (parsed.hostname.endsWith(".vercel.app") && parsed.hostname !== "spadas-tech.vercel.app") {
      return PRODUCTION_SITE_URL;
    }
    return parsed.origin;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export const SITE_URL = resolveCanonicalSiteUrl();

/**
 * Indicates if the current build or runtime environment is a preview deployment.
 * Preview deployments must NEVER be indexed by search engines.
 */
export const IS_PREVIEW_DEPLOYMENT =
  process.env.VERCEL_ENV === "preview" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

/**
 * Returns an absolute URL based strictly on the production canonical domain.
 */
export function getAbsoluteUrl(path: string = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath === "/" ? "" : cleanPath}`;
}

/**
 * Unified brand, legal, and contact configuration across all public and legal pages.
 */
export const BRAND_CONFIG = {
  name: "Spadas",
  productName: "Spadas Resale Scanner",
  legalEntity: "Spadas Technology",
  contactEmail: "deniedae@gmail.com",
  packageId: "com.spadas.ai",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.spadas.ai",
  canonicalOrigin: PRODUCTION_SITE_URL,
} as const;
