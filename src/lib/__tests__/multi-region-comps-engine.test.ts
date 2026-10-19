import { describe, it, expect } from "vitest";
import {
  EBAY_MARKETPLACE,
  ACTIVE_FALLBACK_MARKDOWN_PERCENT,
  buildRegionalFallbackLinks,
  computeLiquidityScore,
  calcMedian,
} from "@/app/lib/ebay-australia-comps";

describe("Multi-Region Comps Engine & Safeguards", () => {
  describe("Geographic Isolation & Marketplace Configurations", () => {
    it("strictly isolates Australia (EBAY-AU) with AUD currency and site 15", () => {
      const au = EBAY_MARKETPLACE.AUD;
      expect(au.globalId).toBe("EBAY-AU");
      expect(au.country).toBe("AU");
      expect(au.currency).toBe("AUD");
      expect(au.currencySymbol).toBe("$");
      expect(au.siteId).toBe("15");
      expect(au.domain).toBe("www.ebay.com.au");
      expect(au.id).toBe("EBAY_AU");
    });

    it("strictly isolates United States (EBAY-US) with USD currency and site 0", () => {
      const us = EBAY_MARKETPLACE.USD;
      expect(us.globalId).toBe("EBAY-US");
      expect(us.country).toBe("US");
      expect(us.currency).toBe("USD");
      expect(us.currencySymbol).toBe("$");
      expect(us.siteId).toBe("0");
      expect(us.domain).toBe("www.ebay.com");
      expect(us.id).toBe("EBAY_US");
    });

    it("strictly isolates United Kingdom (EBAY-GB) with GBP currency and site 3", () => {
      const uk = EBAY_MARKETPLACE.GBP;
      expect(uk.globalId).toBe("EBAY-GB");
      expect(uk.country).toBe("GB");
      expect(uk.currency).toBe("GBP");
      expect(uk.currencySymbol).toBe("£");
      expect(uk.siteId).toBe("3");
      expect(uk.domain).toBe("www.ebay.co.uk");
      expect(uk.id).toBe("EBAY_GB");
    });
  });

  describe("Regional Fallback Safeguards & Target Links", () => {
    it("ensures uniform 18% active listing markdown safeguard across all regions", () => {
      expect(ACTIVE_FALLBACK_MARKDOWN_PERCENT).toBe(0.18);

      const activeMedianAud = 100;
      const quickSaleAud = Math.round(activeMedianAud * (1 - ACTIVE_FALLBACK_MARKDOWN_PERCENT) * 100) / 100;
      expect(quickSaleAud).toBe(82);

      const activeMedianUsd = 250;
      const quickSaleUsd = Math.round(activeMedianUsd * (1 - ACTIVE_FALLBACK_MARKDOWN_PERCENT) * 100) / 100;
      expect(quickSaleUsd).toBe(205);

      const activeMedianGbp = 75;
      const quickSaleGbp = Math.round(activeMedianGbp * (1 - ACTIVE_FALLBACK_MARKDOWN_PERCENT) * 100) / 100;
      expect(quickSaleGbp).toBe(61.5);
    });

    it("generates regional fallback links with target='_blank' and rel='noopener noreferrer'", () => {
      const auLinks = buildRegionalFallbackLinks("Sony WH-1000XM4", EBAY_MARKETPLACE.AUD, 220);
      expect(auLinks.length).toBeGreaterThanOrEqual(2);
      for (const link of auLinks) {
        expect(link.target).toBe("_blank");
        expect(link.rel).toBe("noopener noreferrer");
        expect(link.url).toBeTruthy();
      }

      const ukLinks = buildRegionalFallbackLinks("Dyson V10", EBAY_MARKETPLACE.GBP, 180);
      expect(ukLinks.some((l) => l.channel === "gumtree_uk")).toBe(true);
      expect(ukLinks.some((l) => l.channel === "google_shopping_uk")).toBe(true);
      for (const link of ukLinks) {
        expect(link.target).toBe("_blank");
        expect(link.rel).toBe("noopener noreferrer");
      }

      const usLinks = buildRegionalFallbackLinks("Nintendo Switch OLED", EBAY_MARKETPLACE.USD, 280);
      expect(usLinks.some((l) => l.channel === "google_shopping_us")).toBe(true);
      for (const link of usLinks) {
        expect(link.target).toBe("_blank");
        expect(link.rel).toBe("noopener noreferrer");
      }
    });
  });

  describe("Liquidity Score & Easy To Sell Metrics", () => {
    it("computes high liquidity when sold count is high and spread is tight", () => {
      const { liquidityScore, isEasyToSell } = computeLiquidityScore(6, 4, 0.25);
      expect(liquidityScore).toBeGreaterThanOrEqual(65);
      expect(isEasyToSell).toBe(true);
    });

    it("flags low liquidity when 0 sold comps exist", () => {
      const { liquidityScore, isEasyToSell } = computeLiquidityScore(0, 3, 0.5);
      expect(liquidityScore).toBeLessThan(65);
      expect(isEasyToSell).toBe(false);
    });
  });

  describe("Median Calculation Utility", () => {
    it("calculates median correctly for odd and even count arrays", () => {
      expect(calcMedian([10, 20, 30])).toBe(20);
      expect(calcMedian([10, 20, 30, 40])).toBe(25);
      expect(calcMedian([])).toBe(0);
    });
  });
});
