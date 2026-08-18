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
  if (countryHeader) {
    const country = countryHeader.toUpperCase().trim();
    if (country === "US") return CURRENCY_CONFIGS.USD;
    if (country === "GB" || country === "UK") return CURRENCY_CONFIGS.GBP;
    if (["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "EU"].includes(country)) return CURRENCY_CONFIGS.EUR;
    if (country === "AU" || country === "NZ") return CURRENCY_CONFIGS.AUD;
  }

  // Fallback to client browser timezone detection
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("America/") || tz.includes("US/")) return CURRENCY_CONFIGS.USD;
      if (tz.includes("Europe/London")) return CURRENCY_CONFIGS.GBP;
      if (tz.includes("Europe/")) return CURRENCY_CONFIGS.EUR;
      if (tz.includes("Australia/") || tz.includes("Pacific/Auckland")) return CURRENCY_CONFIGS.AUD;
    } catch {}
  }

  return CURRENCY_CONFIGS.AUD;
}
