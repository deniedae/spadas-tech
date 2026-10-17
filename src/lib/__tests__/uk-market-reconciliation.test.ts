import { describe, it, expect } from "vitest";
import {
  isUKGeo,
  detectGeoCurrency,
  CURRENCY_CONFIGS,
} from "@/app/lib/currency-routing";
import {
  calculateMarketplaceFees,
  getDomesticShippingRate,
  EBAY_UK_FEE_RATE,
  EBAY_UK_FIXED_FEE,
  ROYAL_MAIL_PARCEL_RATES,
} from "@/lib/fee-engine";
import { calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { calculateOmniMarketplaceComps } from "@/lib/omni-marketplaces";

describe("UK Domestic Market Reconciliation", () => {
  describe("Geo Routing & Currency Detection", () => {
    it("identifies United Kingdom via country headers (GB / UK)", () => {
      expect(isUKGeo("GB")).toBe(true);
      expect(isUKGeo("UK")).toBe(true);
      expect(isUKGeo("gb")).toBe(true);
      expect(isUKGeo("US")).toBe(false);
      expect(isUKGeo("AU")).toBe(false);
    });

    it("resolves strict UK currency info and eBay UK marketplace domain", () => {
      const gbGeo = detectGeoCurrency("GB");
      expect(gbGeo.currency).toBe("GBP");
      expect(gbGeo.symbol).toBe("£");
      expect(gbGeo.ebaySite).toBe("ebay.co.uk");
      expect(CURRENCY_CONFIGS.GBP.ebaySite).toBe("ebay.co.uk");
    });
  });

  describe("Official eBay UK Fee Engine (12.8% + £0.30)", () => {
    it("calculates exact eBay UK standard final value fees", () => {
      // £20 item sale: (20 * 0.128) + 0.30 = 2.56 + 0.30 = £2.86
      const fees20 = calculateMarketplaceFees(20, "GBP");
      expect(fees20).toBe(2.86);

      // £100 item sale: (100 * 0.128) + 0.30 = 12.80 + 0.30 = £13.10
      const fees100 = calculateMarketplaceFees(100, "GBP");
      expect(fees100).toBe(13.10);
    });

    it("applies eBay UK high-value tier rate (3% above £4,000 threshold)", () => {
      // £5,000 item sale:
      // Standard portion: £4,000 * 0.128 = £512.00
      // Excess portion: £1,000 * 0.03 = £30.00
      // Fixed fee: £0.30
      // Total: £542.30
      const fees5k = calculateMarketplaceFees(5000, "GBP");
      expect(fees5k).toBe(542.30);
    });
  });

  describe("Royal Mail Domestic Shipping Rates", () => {
    it("resolves exact Royal Mail Tracked 48 tiers for GBP", () => {
      const small = getDomesticShippingRate("small", null, undefined, "GBP");
      expect(small.rate).toBe(ROYAL_MAIL_PARCEL_RATES.small);
      expect(small.rate).toBe(3.49);
      expect(small.description).toContain("Royal Mail");

      const medium = getDomesticShippingRate("medium", null, undefined, "GBP");
      expect(medium.rate).toBe(ROYAL_MAIL_PARCEL_RATES.medium);
      expect(medium.rate).toBe(5.99);

      const large = getDomesticShippingRate("large", null, undefined, "GBP");
      expect(large.rate).toBe(9.95);

      const extraLarge = getDomesticShippingRate("extraLarge", null, undefined, "GBP");
      expect(extraLarge.rate).toBe(14.50);
    });
  });

  describe("UK Reseller Valuation & Cop Verdict Engine", () => {
    it("deducts UK charity shop COGS, eBay UK fees, and Royal Mail postage", () => {
      const verdict = calculateThriftCopVerdict({
        resalePrice: 45, // £45 eBay UK median
        customCost: 5,   // £5 UK charity shop tag
        category: "Apparel",
        currency: "GBP",
        confidenceScore: 0.95,
      });

      // £45 resale - £5 COGS - £6.06 eBay fee (45*0.128+0.30) - £5.99 medium Royal Mail postage
      // Net profit ≈ 45 - 5 - 6.06 - 5.99 = 27.95
      expect(verdict.netProfit).toBeGreaterThan(25);
      expect(verdict.platformFees).toBe(6.06);
      expect(verdict.estimatedShipping).toBe(5.99);
      expect(verdict.verdictLabel).toContain("MUST COP");
      expect(verdict.copVerdict).toBe("MUST_COP");
    });
  });

  describe("Omni-Marketplace Multi-Channel Arbitrage (UK)", () => {
    it("generates UK platforms with Vinted UK 0% fees and eBay UK", () => {
      const comparison = calculateOmniMarketplaceComps({
        productName: "Vintage Barbour Wax Jacket",
        brand: "Barbour",
        basePrice: 85,
        currency: "GBP",
        customCost: 15,
      });

      expect(comparison.currency).toBe("GBP");
      expect(comparison.currencySymbol).toBe("£");

      const ebay = comparison.marketplaces.find((m) => m.platformId === "ebay");
      expect(ebay).toBeDefined();
      expect(ebay?.name).toBe("eBay UK");
      expect(ebay?.platformFeeRate).toBe(EBAY_UK_FEE_RATE);
      expect(ebay?.searchUrl).toContain("ebay.co.uk");

      const vinted = comparison.marketplaces.find((m) => m.platformId === "depop");
      expect(vinted).toBeDefined();
      expect(vinted?.name).toBe("Vinted UK");
      expect(vinted?.platformFeeRate).toBe(0.0);
      expect(vinted?.searchUrl).toContain("vinted.co.uk");
    });
  });
});
