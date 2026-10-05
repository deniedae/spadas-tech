export type SupportedCurrency = "AUD" | "USD" | "EUR" | "GBP";

export interface GeoCurrencyInfo {
  currency: SupportedCurrency;
  symbol: string;
  flag: string;
  ebaySite: string;
  conversionFromAud: number;
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, GeoCurrencyInfo> = {
  AUD: {
    currency: "AUD",
    symbol: "$",
    flag: "🇦🇺",
    ebaySite: "ebay.com.au",
    conversionFromAud: 1.0,
  },
  USD: {
    currency: "USD",
    symbol: "$",
    flag: "🇺🇸",
    ebaySite: "ebay.com",
    conversionFromAud: 0.66,
  },
  EUR: {
    currency: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    ebaySite: "ebay.de",
    conversionFromAud: 0.60,
  },
  GBP: {
    currency: "GBP",
    symbol: "£",
    flag: "🇬🇧",
    ebaySite: "ebay.co.uk",
    conversionFromAud: 0.52,
  },
};

/**
 * Detect currency from IP country code or Browser Timezone
 */
export function detectGeoCurrency(countryHeader?: string | null): GeoCurrencyInfo {
  // Check local storage selection if on client
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("spadas_selected_currency");
      if (saved && (saved === "USD" || saved === "AUD" || saved === "EUR" || saved === "GBP")) {
        return CURRENCY_CONFIGS[saved as SupportedCurrency];
      }
    } catch {}
  }

  if (countryHeader) {
    const country = countryHeader.toUpperCase().trim();
    if (country === "US" || country === "CA" || country === "PR") return CURRENCY_CONFIGS.USD;
    if (country === "AU" || country === "NZ") return CURRENCY_CONFIGS.AUD;
    if (country === "GB" || country === "UK") return CURRENCY_CONFIGS.GBP;
    if (["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "EU", "CH", "SE", "NO", "DK"].includes(country)) return CURRENCY_CONFIGS.EUR;
    // Any other country outside AU/NZ/Europe defaults to global standard USD
    return CURRENCY_CONFIGS.USD;
  }

  // Fallback to client browser timezone & locale detection
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Australia/") || tz.includes("Pacific/Auckland") || tz.includes("Lord_Howe")) return CURRENCY_CONFIGS.AUD;
      if (tz.includes("America/") || tz.includes("US/") || tz.includes("Pacific/Honolulu") || tz.includes("Canada/")) return CURRENCY_CONFIGS.USD;
      if (tz.includes("Europe/London")) return CURRENCY_CONFIGS.GBP;
      if (tz.includes("Europe/")) return CURRENCY_CONFIGS.EUR;
    } catch {}
  }

  // Check browser navigator language
  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang === "en-au") return CURRENCY_CONFIGS.AUD;
    if (lang === "en-us" || lang.startsWith("es-us")) return CURRENCY_CONFIGS.USD;
    if (lang === "en-gb") return CURRENCY_CONFIGS.GBP;
  }

  // Default to USD for global traction from Google Play Store
  return CURRENCY_CONFIGS.USD;
}

/**
 * Detects user geographic region ("AU" | "US" | "GB" | "EUR").
 */
export function detectUserRegion(countryHeader?: string | null): "AU" | "US" | "GB" | "EUR" {
  const geoInfo = detectGeoCurrency(countryHeader);
  if (geoInfo.currency === "AUD") return "AU";
  if (geoInfo.currency === "USD") return "US";
  if (geoInfo.currency === "GBP") return "GB";
  if (geoInfo.currency === "EUR") return "EUR";
  return "US";
}

/**
 * Converts currency amounts between supported currencies (AUD, USD, EUR, GBP)
 */
export function convertCurrency(
  amount: number,
  from: SupportedCurrency | string = "AUD",
  to: SupportedCurrency | string = "AUD"
): number {
  const fromCurr = (from || "AUD").toUpperCase() as SupportedCurrency;
  const toCurr = (to || "AUD").toUpperCase() as SupportedCurrency;
  if (fromCurr === toCurr || !amount) return amount;

  const fromRate = CURRENCY_CONFIGS[fromCurr]?.conversionFromAud || 1.0;
  const toRate = CURRENCY_CONFIGS[toCurr]?.conversionFromAud || 1.0;

  const amountAud = amount / fromRate;
  const converted = amountAud * toRate;

  return Math.max(1, Math.round(converted * 100) / 100);
}

