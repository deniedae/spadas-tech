import { describe, it, expect } from "vitest";
import {
  isUSGeo,
  isAUGeo,
  isUKGeo,
  detectGeoCurrency,
  resolveEffectiveCurrency,
  getEbayMarketplaceLabel,
  getEbaySellerHubUrl,
  CURRENCY_CONFIGS,
} from "@/app/lib/currency-routing";
import { buildMarketplaceCompUrl } from "@/lib/omni-marketplaces";
import { generateEbayPrefillUrl } from "@/app/lib/marketplaces/ebay-prefill";

describe("US Market Geolocation & US Catering", () => {
  describe("isUSGeo Detection", () => {
    it("identifies United States & North America headers", () => {
      expect(isUSGeo("US")).toBe(true);
      expect(isUSGeo("USA")).toBe(true);
      expect(isUSGeo("CA")).toBe(true);
      expect(isUSGeo("CAN")).toBe(true);
      expect(isUSGeo("PR")).toBe(true);
      expect(isUSGeo("VI")).toBe(true);
      expect(isUSGeo("GU")).toBe(true);
    });

    it("rejects non-US regions", () => {
      expect(isUSGeo("AU")).toBe(false);
      expect(isUSGeo("NZ")).toBe(false);
      expect(isUSGeo("GB")).toBe(false);
      expect(isUSGeo("UK")).toBe(false);
      expect(isUSGeo("DE")).toBe(false);
    });
  });

  describe("Strict US Mode - US Users Never In AU", () => {
    it("forces USD currency for US visitors even if client requested AUD", () => {
      // Prevents stale client cache from locking US user into AU
      expect(resolveEffectiveCurrency("AUD", "US")).toBe("USD");
      expect(resolveEffectiveCurrency("aud", "US")).toBe("USD");
      expect(resolveEffectiveCurrency(null, "US")).toBe("USD");
      expect(resolveEffectiveCurrency(undefined, "US")).toBe("USD");
    });

    it("resolves strict US marketplace configuration", () => {
      const usGeo = detectGeoCurrency("US");
      expect(usGeo.currency).toBe("USD");
      expect(usGeo.symbol).toBe("$");
      expect(usGeo.ebaySite).toBe("ebay.com");
      expect(CURRENCY_CONFIGS.USD.ebaySite).toBe("ebay.com");
    });

    it("defaults unresolvable visitors outside AU/UK/EU to US mainly", () => {
      const globalGeo = detectGeoCurrency("GLOBAL");
      expect(globalGeo.currency).toBe("USD");
      expect(globalGeo.ebaySite).toBe("ebay.com");

      // When timezone is neutral (e.g. UTC or unresolvable)
      if (typeof localStorage !== "undefined") {
        localStorage.clear();
      }
      const origDtf = Intl.DateTimeFormat;
      const origNav = (globalThis as any).navigator;
      try {
        Intl.DateTimeFormat = (() => ({
          resolvedOptions: () => ({ timeZone: "Etc/UTC" }),
        })) as any;
        try {
          Object.defineProperty(globalThis, "navigator", {
            value: { language: "und", languages: ["und"] },
            configurable: true,
          });
        } catch {}
        const neutralGeo = detectGeoCurrency(null);
        expect(neutralGeo.currency).toBe("USD");
      } finally {
        Intl.DateTimeFormat = origDtf;
        try {
          Object.defineProperty(globalThis, "navigator", {
            value: origNav,
            configurable: true,
          });
        } catch {}
      }
    });

    it("defaults marketplace label and seller hub to US", () => {
      expect(getEbayMarketplaceLabel("USD")).toBe("eBay US");
      expect(getEbayMarketplaceLabel()).toBe("eBay US");
      expect(getEbaySellerHubUrl()).toBe("https://www.ebay.com/sh/ovw");
      expect(getEbaySellerHubUrl("USD")).toBe("https://www.ebay.com/sh/ovw");
    });
  });

  describe("Marketplace Routing for US", () => {
    it("routes omni-marketplace eBay search to ebay.com for USD", () => {
      const url = buildMarketplaceCompUrl("ebay", "vintage jacket", "USD");
      expect(url).toContain("www.ebay.com");
      expect(url).not.toContain("ebay.com.au");
    });

    it("routes Mercari search for US market", () => {
      const mercariUrl = `https://www.mercari.com/search/?keyword=${encodeURIComponent("carhartt jacket")}`;
      expect(mercariUrl).toContain("mercari.com/search");
    });

    it("defaults ebay prefill domain to www.ebay.com", () => {
      const prefill = generateEbayPrefillUrl({
        title: "Nike Air Max 90",
        priceAud: 120,
        currency: "USD",
      });
      expect(prefill).toContain("www.ebay.com");
      expect(prefill).not.toContain("www.ebay.com.au");
    });
  });
});
