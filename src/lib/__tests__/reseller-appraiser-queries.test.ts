import { describe, it, expect } from "vitest";
import {
  sanitizeResellerSearchQuery,
  enforceRealisticValueSpread,
  constructResellerSearchQueries,
} from "../reseller-appraiser";
import { buildSearchQueries } from "@/app/lib/ebay-australia-comps";

describe("Reseller Appraiser — Strict eBay Comps Rules", () => {
  describe("Rule 1: Never include filler words in search queries", () => {
    it("strips 'Professional', 'Vintage', 'Nice', 'Clean', 'Great', 'Authentic' from queries", () => {
      expect(
        sanitizeResellerSearchQuery("Professional Hairdressing Scissors")
      ).toBe("Hairdressing Scissors");

      expect(
        sanitizeResellerSearchQuery("Vintage Nike Brasilia Backpack")
      ).toBe("Nike Brasilia Backpack");

      expect(
        sanitizeResellerSearchQuery("Nice Clean Carhartt Detroit Jacket")
      ).toBe("Carhartt Detroit Jacket");

      expect(
        sanitizeResellerSearchQuery("Authentic Genuine Sony WH-1000XM4")
      ).toBe("Sony WH-1000XM4");

      expect(
        sanitizeResellerSearchQuery("Rare Pre-owned Tested Working Nintendo Switch")
      ).toBe("Nintendo Switch");
    });
  });

  describe("Rule 2: Reflect eBay seller titles rather than descriptive captions", () => {
    it("builds 'Nike Brasilia Backpack' rather than a descriptive caption like 'Nike Brasilia Gym Bag Blue'", () => {
      const queries = constructResellerSearchQueries({
        brand: "Nike",
        modelOrStyle: "Brasilia",
        itemType: "Backpack",
        primaryColor: "Blue",
      });

      expect(queries.strict_query).toBe("Nike Brasilia Backpack");
      expect(queries.broad_query).toBe("Nike Backpack");
      expect(queries.fallback_query).toBe("Backpack");
      expect(queries.strict_query).not.toContain("Gym Bag Blue");
    });

    it("caps strict query to max 4-5 core keywords without fluff", () => {
      const queries = constructResellerSearchQueries({
        brand: "Carhartt",
        modelOrStyle: "Detroit Jacket J97 DKB",
        itemType: "Jacket",
      });

      const words = queries.strict_query.split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(5);
      expect(queries.strict_query).toContain("Carhartt");
    });
  });

  describe("Rule 3: For generic/unbranded items, do not guess high-end niche brands", () => {
    it("falls back to generic item type when item is unbranded or generic", () => {
      const queries = constructResellerSearchQueries({
        brand: null,
        modelOrStyle: null,
        itemType: "Ceramic Coffee Mug",
        isGeneric: true,
      });

      expect(queries.strict_query).toBe("Ceramic Coffee Mug");
      expect(queries.broad_query).toBe("Ceramic Coffee Mug");
      expect(queries.fallback_query).toBe("Ceramic Coffee Mug");
      expect(queries.strict_query).not.toMatch(/le creuset|starbucks|gucci/i);
    });

    it("ignores generic placeholder brand sentinels like 'generic' or 'unbranded'", () => {
      const queries = constructResellerSearchQueries({
        brand: "Generic",
        modelOrStyle: null,
        itemType: "Ribbed Glass Vase",
      });

      expect(queries.strict_query).toBe("Ribbed Glass Vase");
      expect(queries.broad_query).toBe("Ribbed Glass Vase");
    });
  });

  describe("Rule 4: Value ranges must show realistic spread, never identical numbers", () => {
    it("corrects identical numbers to a realistic market spread", () => {
      // User case: e.g. low: 15, high: 30, never identical
      const result = enforceRealisticValueSpread(20, 20, 20);
      expect(result.low).toBeLessThan(result.high);
      expect(result.low).not.toBe(result.high);
      expect(result.high - result.low).toBeGreaterThanOrEqual(4);
    });

    it("maintains realistic spread when given low and high values", () => {
      const result = enforceRealisticValueSpread(15, 22, 30);
      expect(result.low).toBe(15);
      expect(result.median).toBe(22);
      expect(result.high).toBe(30);
      expect(result.low).toBeLessThan(result.high);
    });

    it("handles zero or sub-zero defaults gracefully", () => {
      const result = enforceRealisticValueSpread(0, 0, 0);
      expect(result.low).toBe(15);
      expect(result.median).toBe(22);
      expect(result.high).toBe(30);
    });
  });

  describe("eBay Sold Comps prioritized cascading queries", () => {
    it("prioritizes custom reseller queries in buildSearchQueries", () => {
      const queries = buildSearchQueries(
        "Nike Brasilia Backpack",
        "Nike",
        "Bags",
        ["Nike Brasilia Backpack", "Nike Backpack", "Backpack"]
      );

      expect(queries[0]).toBe("Nike Brasilia Backpack");
      expect(queries[1]).toBe("Nike Backpack");
      expect(queries[2]).toBe("Backpack");
    });
  });
});
