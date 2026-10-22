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
 * Extracts client country code from available edge reverse-proxy headers
 */
export function extractCountryHeader(req: Request): string | null {
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code") ||
    req.headers.get("x-client-geo-country") ||
    req.headers.get("x-real-ip-country") ||
    null
  );
}

/**
 * Detects whether the user is located in the United States / North America (USD zone)
 */
export function isUSGeo(countryHeader?: string | null): boolean {
  if (countryHeader) {
    const country = countryHeader.toUpperCase().trim();
    return ["US", "USA", "CA", "CAN", "PR", "VI", "GU", "AS", "MP", "UM"].includes(country);
  }

  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (
        tz.includes("America/") ||
        tz.includes("US/") ||
        tz.includes("Pacific/Honolulu") ||
        tz.includes("Canada/") ||
        tz.includes("Indiana/") ||
        tz.includes("Kentucky/") ||
        tz.includes("North_Dakota/") ||
        tz === "EST" ||
        tz === "EDT" ||
        tz === "CST" ||
        tz === "CDT" ||
        tz === "MST" ||
        tz === "MDT" ||
        tz === "PST" ||
        tz === "PDT" ||
        tz === "AKST" ||
        tz === "AKDT" ||
        tz === "HST" ||
        tz === "HAST" ||
        tz === "HADT"
      ) {
        return true;
      }
      if (
        tz.includes("Australia/") ||
        tz.includes("Pacific/Auckland") ||
        tz.includes("Lord_Howe") ||
        tz.includes("Europe/")
      ) {
        return false;
      }
    } catch {}
  }

  // Check client timezone offset: US timezones are UTC-4 to UTC-10 (+240 to +600 minutes)
  if (typeof Date !== "undefined") {
    try {
      const offset = new Date().getTimezoneOffset();
      if (offset >= 240 && offset <= 660) {
        return true;
      }
    } catch {}
  }

  // Check browser navigator languages list
  if (typeof navigator !== "undefined") {
    try {
      const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
      for (const rawLang of languages) {
        if (typeof rawLang === "string") {
          const lang = rawLang.toLowerCase();
          if (lang === "en-us" || lang.startsWith("es-us") || lang.endsWith("-us")) return true;
          if (lang === "en-au" || lang === "en-nz" || lang === "en-gb") return false;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Detects whether the user is located in the United Kingdom (GBP zone)
 */
export function isUKGeo(countryHeader?: string | null): boolean {
  if (countryHeader) {
    const country = countryHeader.toUpperCase().trim();
    return country === "GB" || country === "UK";
  }

  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Europe/London") || tz === "GMT" || tz === "BST") {
        return true;
      }
      if (tz.includes("America/") || tz.includes("Australia/") || tz.includes("Pacific/")) {
        return false;
      }
    } catch {}
  }

  if (typeof navigator !== "undefined") {
    try {
      const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
      for (const rawLang of languages) {
        if (typeof rawLang === "string") {
          const lang = rawLang.toLowerCase();
          if (lang === "en-gb") return true;
          if (lang === "en-us" || lang === "en-au") return false;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Detects whether the user is strictly located in Australia / New Zealand (AUD zone)
 */
export function isAUGeo(countryHeader?: string | null): boolean {
  if (countryHeader) {
    const country = countryHeader.toUpperCase().trim();
    return country === "AU" || country === "NZ";
  }

  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Australia/") || tz.includes("Pacific/Auckland") || tz.includes("Lord_Howe")) {
        return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Detect currency from IP country code or Browser Timezone.
 * US users are locked to US/USD; unresolvable defaults cater to US (USD) mainly.
 */
export function detectGeoCurrency(countryHeader?: string | null): GeoCurrencyInfo {
  // When an explicit countryHeader is provided from server/edge headers:
  if (countryHeader) {
    const country = countryHeader.toUpperCase().trim();
    if (["US", "USA", "CA", "CAN", "PR", "VI", "GU", "AS", "MP", "UM"].includes(country)) {
      if (typeof window !== "undefined") {
        try { localStorage.setItem("spadas_selected_currency", "USD"); } catch {}
      }
      return CURRENCY_CONFIGS.USD;
    }
    if (country === "GB" || country === "UK") {
      if (typeof window !== "undefined") {
        try { localStorage.setItem("spadas_selected_currency", "GBP"); } catch {}
      }
      return CURRENCY_CONFIGS.GBP;
    }
    if (country === "AU" || country === "NZ") {
      if (typeof window !== "undefined") {
        try { localStorage.setItem("spadas_selected_currency", "AUD"); } catch {}
      }
      return CURRENCY_CONFIGS.AUD;
    }
    if (["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "EU", "CH", "SE", "NO", "DK"].includes(country)) {
      if (typeof window !== "undefined") {
        try { localStorage.setItem("spadas_selected_currency", "EUR"); } catch {}
      }
      return CURRENCY_CONFIGS.EUR;
    }
    // Any other country outside AU/NZ/Europe defaults to global standard USD (catering to US)
    return CURRENCY_CONFIGS.USD;
  }

  // 1. STRICT US GEO-LOCK: US users lock strictly to US MODE (USD). US users are NEVER AU.
  if (isUSGeo()) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_selected_currency", "USD");
      } catch {}
    }
    return CURRENCY_CONFIGS.USD;
  }

  // 2. STRICT UK GEO-LOCK: UK users lock strictly to UK MODE (GBP)
  if (isUKGeo()) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_selected_currency", "GBP");
      } catch {}
    }
    return CURRENCY_CONFIGS.GBP;
  }

  // 3. STRICT AU GEO-LOCK: Only explicitly confirmed AU/NZ users get AU MODE (AUD)
  if (isAUGeo()) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_selected_currency", "AUD");
      } catch {}
    }
    return CURRENCY_CONFIGS.AUD;
  }

  // Check local storage selection if on client (and not US)
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("spadas_selected_currency");
      if (saved && (saved === "USD" || saved === "AUD" || saved === "EUR" || saved === "GBP")) {
        return CURRENCY_CONFIGS[saved as SupportedCurrency];
      }
    } catch {}
  }

  // Fallback to client browser timezone & locale detection
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Europe/London")) return CURRENCY_CONFIGS.GBP;
      if (tz.includes("Australia/") || tz.includes("Pacific/Auckland") || tz.includes("Lord_Howe")) return CURRENCY_CONFIGS.AUD;
      if (tz.includes("America/") || tz.includes("US/") || tz.includes("Pacific/Honolulu") || tz.includes("Canada/")) return CURRENCY_CONFIGS.USD;
      if (tz.includes("Europe/")) return CURRENCY_CONFIGS.EUR;
    } catch {}
  }

  // Check browser navigator language
  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang === "en-gb") return CURRENCY_CONFIGS.GBP;
    if (lang === "en-au") return CURRENCY_CONFIGS.AUD;
    if (lang === "en-us" || lang.startsWith("es-us")) return CURRENCY_CONFIGS.USD;
  }

  // Default to USD (US-first market catering)
  return CURRENCY_CONFIGS.USD;
}

/**
 * Resolves effective currency for a server route or client task.
 * CRITICAL RULE: If the request comes from the US, ALWAYS enforce USD.
 * Prevents stale client caches or old query params from sticking a US user into AU.
 */
export function resolveEffectiveCurrency(
  requestedCurrency?: string | null,
  countryHeader?: string | null
): SupportedCurrency {
  // If request originates from US, STRICTLY enforce USD
  if (isUSGeo(countryHeader)) {
    return "USD";
  }
  if (isUKGeo(countryHeader)) {
    return "GBP";
  }

  const reqCurr = (requestedCurrency || "").toUpperCase().trim() as SupportedCurrency;
  if (reqCurr === "USD" || reqCurr === "GBP" || reqCurr === "EUR" || reqCurr === "AUD") {
    return reqCurr;
  }

  return detectGeoCurrency(countryHeader).currency;
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
  from: SupportedCurrency | string = "USD",
  to: SupportedCurrency | string = "USD"
): number {
  const fromCurr = (from || "USD").toUpperCase() as SupportedCurrency;
  const toCurr = (to || "USD").toUpperCase() as SupportedCurrency;
  if (fromCurr === toCurr || !amount) return amount;

  const fromRate = CURRENCY_CONFIGS[fromCurr]?.conversionFromAud || 0.66;
  const toRate = CURRENCY_CONFIGS[toCurr]?.conversionFromAud || 0.66;

  const amountAud = amount / fromRate;
  const converted = amountAud * toRate;

  return Math.max(1, Math.round(converted * 100) / 100);
}

function normalizeCurrencyCode(currency?: SupportedCurrency | string): SupportedCurrency {
  const normalized = (currency || "USD").toUpperCase();
  if (normalized === "AUD" || normalized === "GBP" || normalized === "EUR") {
    return normalized as SupportedCurrency;
  }
  return "USD";
}

export function getEbayMarketplaceLabel(currency?: SupportedCurrency | string): string {
  switch (normalizeCurrencyCode(currency)) {
    case "AUD":
      return "eBay AU";
    case "GBP":
      return "eBay UK";
    case "EUR":
      return "eBay DE";
    case "USD":
    default:
      return "eBay US";
  }
}

export function getEbaySellerHubUrl(currency?: SupportedCurrency | string): string {
  const ebaySite = CURRENCY_CONFIGS[normalizeCurrencyCode(currency)].ebaySite;
  return `https://www.${ebaySite}/sh/ovw`;
}

