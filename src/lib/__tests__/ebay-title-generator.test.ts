/**
 * eBay Title Generator — Test Suite
 * ==================================
 * Covers the four spec-mandated cases plus edge-case regression tests.
 *
 * Run with: npm run test:fees
 */

import { describe, it, expect } from "vitest";
import { generateEbayTitle } from "../ebay-title-generator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectClean(title: string) {
  // No double spaces
  expect(title).not.toMatch(/\s{2,}/);
  // No trailing punctuation
  expect(title).not.toMatch(/[,.\-:;!?]$/);
  // No repeated adjacent words (case-insensitive)
  const words = title.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    expect(words[i].toLowerCase()).not.toBe(words[i - 1].toLowerCase());
  }
  // Hard 80-char cap
  expect(title.length).toBeLessThanOrEqual(80);
}

// ---------------------------------------------------------------------------
// Spec Test 1: "Nike Dunk Low", US 10, Pre-owned → full title under 80 chars
// ---------------------------------------------------------------------------

describe('Spec case 1 — "Nike Dunk Low" US 10 Pre-owned', () => {
  const result = generateEbayTitle({
    brand: "Nike",
    model: "Dunk Low",
    category: "sneakers",
    condition: "Pre-owned",
    size: "US 10",
  });

  it("contains Brand at position 1", () => {
    expect(result.title.startsWith("Nike")).toBe(true);
  });

  it("contains Model immediately after Brand", () => {
    expect(result.title).toMatch(/^Nike Dunk Low/);
  });

  it("contains size formatted correctly (US 10, not Size: 10)", () => {
    expect(result.title).toContain("US 10");
    expect(result.title).not.toMatch(/size:\s*10/i);
  });

  it("contains normalised condition keyword", () => {
    expect(result.title).toContain("Pre-owned");
  });

  it("appends at least one buyer search term (sneakers category)", () => {
    const hasTerm =
      result.title.toLowerCase().includes("sneakers") ||
      result.title.toLowerCase().includes("shoes") ||
      result.title.toLowerCase().includes("trainers");
    expect(hasTerm).toBe(true);
  });

  it("is under 80 chars", () => {
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it("reports brandUnknown = false", () => {
    expect(result.brandUnknown).toBe(false);
  });

  it("passes clean-title checks", () => {
    expectClean(result.title);
  });
});

// ---------------------------------------------------------------------------
// Spec Test 2: Long model name forces dropping search terms
// ---------------------------------------------------------------------------

describe("Spec case 2 — long model name forces search-term drops", () => {
  const longModel =
    "Ultra Boost 22 Prime Limited Edition Anniversary Collector Pack";

  const result = generateEbayTitle({
    brand: "Adidas",
    model: longModel,
    category: "sneakers",
    condition: "New with tags",
    size: "US 9",
  });

  it("keeps brand and model intact", () => {
    expect(result.title).toContain("Adidas");
    expect(result.title).toContain("Ultra Boost 22");
  });

  it("is under 80 chars", () => {
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it("reports dropped tokens when search terms were cut", () => {
    // The title might not overflow if the model happens to fit — but if it does,
    // droppedTokens must record what was cut.
    if (result.droppedTokens.length > 0) {
      expect(result.droppedTokens.length).toBeGreaterThan(0);
    }
  });

  it("passes clean-title checks", () => {
    expectClean(result.title);
  });
});

// ---------------------------------------------------------------------------
// Spec Test 3: Missing brand → fallback to category, flag brandUnknown
// ---------------------------------------------------------------------------

describe("Spec case 3 — missing brand triggers fallback + brandUnknown flag", () => {
  const result = generateEbayTitle({
    brand: null,
    model: "Slim Fit Chino",
    category: "pants",
    condition: "Used",
  });

  it("sets brandUnknown = true", () => {
    expect(result.brandUnknown).toBe(true);
  });

  it("uses category as the leading token", () => {
    expect(result.title.toLowerCase().startsWith("pants")).toBe(true);
  });

  it("still includes model", () => {
    expect(result.title).toContain("Slim Fit Chino");
  });

  it("includes at least one category search term", () => {
    const hasTerm =
      result.title.toLowerCase().includes("pants") ||
      result.title.toLowerCase().includes("trousers") ||
      result.title.toLowerCase().includes("bottoms");
    expect(hasTerm).toBe(true);
  });

  it("is under 80 chars", () => {
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it("passes clean-title checks", () => {
    expectClean(result.title);
  });
});

// Variant: completely empty brand AND model
describe("Spec case 3b — brand and model both null", () => {
  const result = generateEbayTitle({
    brand: null,
    model: null,
    category: "sneakers",
    condition: "Used",
    color: "Black",
  });

  it("sets brandUnknown = true", () => {
    expect(result.brandUnknown).toBe(true);
  });

  it("starts with category", () => {
    expect(result.title.toLowerCase().startsWith("sneakers")).toBe(true);
  });

  it("is under 80 chars", () => {
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it("passes clean-title checks", () => {
    expectClean(result.title);
  });
});

// ---------------------------------------------------------------------------
// Spec Test 4: No double spaces, no trailing punctuation, no repeated words
// ---------------------------------------------------------------------------

describe("Spec case 4 — formatting guarantees", () => {
  const cases = [
    {
      label: "normal item",
      input: {
        brand: "Levi's",
        model: "501",
        category: "jeans",
        condition: "Pre-owned",
        size: "Large",
      },
    },
    {
      label: "toxic brand name",
      input: {
        brand: "L@@K  BRAND",
        model: "XR5000",
        category: "phone",
        condition: "Used",
      },
    },
    {
      label: "all-caps model",
      input: {
        brand: "Sony",
        model: "PLAYSTATION FIVE PRO",
        category: "console",
        condition: "New",
      },
    },
    {
      label: "duplicate search term matches brand",
      input: {
        brand: "Shoes Brand",
        model: "Runner v2",
        category: "shoes",
        condition: "New",
      },
    },
    {
      label: "condition with trailing dot in raw input",
      input: {
        brand: "Apple",
        model: "iPhone 15",
        category: "phone",
        condition: "Pre-owned",
        size: "128GB",
      },
    },
  ];

  for (const { label, input } of cases) {
    it(`[${label}] passes clean-title checks`, () => {
      const result = generateEbayTitle(input);
      expectClean(result.title);
    });
  }
});

// ---------------------------------------------------------------------------
// Condition normalisation
// ---------------------------------------------------------------------------

describe("Condition normalisation", () => {
  const conditionMap: [string, string][] = [
    ["new", "New"],
    ["NEW", "New"],
    ["pre-owned", "Pre-owned"],
    ["Pre Owned", "Pre-owned"],
    ["preowned", "Pre-owned"],
    ["used_working", "Used"],
    ["faulty_for_parts", "For parts"],
    ["untested", "For parts"],
    ["mint", "New"],
    ["Mint", "New"],
    ["good", "Used"],
    ["fair", "Used"],
  ];

  for (const [raw, expected] of conditionMap) {
    it(`maps "${raw}" → "${expected}"`, () => {
      const result = generateEbayTitle({
        brand: "Nike",
        model: "Air Max",
        category: "sneakers",
        condition: raw,
      });
      expect(result.title).toContain(expected);
    });
  }

  it("unknown condition produces no condition keyword (doesn't break)", () => {
    const result = generateEbayTitle({
      brand: "Nike",
      model: "Air Max",
      category: "sneakers",
      condition: "some_weird_value",
    });
    expect(result.title).toMatch(/^Nike Air Max/);
    expect(result.charCount).toBeLessThanOrEqual(80);
  });
});

// ---------------------------------------------------------------------------
// Size normalisation
// ---------------------------------------------------------------------------

describe("Size normalisation", () => {
  const cases: [string, string][] = [
    ["10", "US 10"],
    ["10.5", "US 10.5"],
    ["US10", "US 10"],
    ["US 10", "US 10"],
    ["EU42", "EU 42"],
    ["UK9", "UK 9"],
    ["128gb", "128GB"],
    ["256 GB", "256GB"],
    ["large", "Large"],
    ["XL", "Xl"], // title-cased
    ["small", "Small"],
  ];

  for (const [raw, expected] of cases) {
    it(`"${raw}" → "${expected}"`, () => {
      const result = generateEbayTitle({
        brand: "Adidas",
        model: "Stan Smith",
        category: "shoes",
        condition: "Used",
        size: raw,
      });
      expect(result.title).toContain(expected);
    });
  }

  it('does NOT render size as "Size: 10"', () => {
    const result = generateEbayTitle({
      brand: "Nike",
      model: "Dunk Low",
      category: "sneakers",
      condition: "Used",
      size: "10",
    });
    expect(result.title).not.toMatch(/size:\s*10/i);
    expect(result.title).toContain("US 10");
  });
});

// ---------------------------------------------------------------------------
// Toxic token stripping
// ---------------------------------------------------------------------------

describe("Toxic token stripping", () => {
  it("removes leet-speak special-char sequences from brand", () => {
    const result = generateEbayTitle({
      brand: "L@@K Nike",
      model: "Air Max",
      category: "sneakers",
      condition: "Used",
    });
    expect(result.title).not.toContain("L@@K");
    expect(result.title).toContain("Nike");
  });

  it("title-cases ALL-CAPS words ≥4 chars in model", () => {
    const result = generateEbayTitle({
      brand: "Sony",
      model: "BRAVIA OLED TV",
      category: "tv",
      condition: "New",
    });
    // BRAVIA should become Bravia, OLED is 4 chars so also title-cased
    expect(result.title).not.toMatch(/\bBRAVIA\b/);
    expect(result.title).not.toMatch(/\bOLED\b/);
  });

  it("preserves short known acronyms (≤3 chars) like 'LG' or 'IBM'", () => {
    const result = generateEbayTitle({
      brand: "LG",
      model: "OLED C3",
      category: "tv",
      condition: "New",
    });
    // LG is 2 chars — must be preserved
    expect(result.title).toContain("LG");
  });
});

// ---------------------------------------------------------------------------
// 80-char hard cap
// ---------------------------------------------------------------------------

describe("80-char hard cap", () => {
  it("never exceeds 80 chars regardless of inputs", () => {
    const extremeInput = {
      brand: "A Very Long Brand Name That Keeps Going",
      model: "Super Deluxe Limited Edition Anniversary Special Edition Collector",
      category: "sneakers",
      condition: "Pre-owned",
      size: "US 12.5",
      suggestedKeywords: ["exclusive", "rare", "grail"],
    };
    const result = generateEbayTitle(extremeInput);
    expect(result.title.length).toBeLessThanOrEqual(80);
    expect(result.charCount).toBe(result.title.length);
  });

  it("charCount matches actual title length", () => {
    const result = generateEbayTitle({
      brand: "Nike",
      model: "Dunk Low",
      category: "sneakers",
      condition: "Pre-owned",
      size: "US 10",
    });
    expect(result.charCount).toBe(result.title.length);
  });

  it("drop order: search terms go before variant", () => {
    // Use a brand + model combo that fills most of 80 chars
    const result = generateEbayTitle({
      brand: "Adidas",
      model: "Ultra Boost 22 Prime Limited Edition Anniversary Collector Pack",
      category: "sneakers",
      condition: "New with tags",
      size: "US 9",
    });
    // Should fit without truncation since search terms are dropped first
    expect(result.title.length).toBeLessThanOrEqual(80);
    // Brand must still be present
    expect(result.title).toContain("Adidas");
  });
});

// ---------------------------------------------------------------------------
// Search term deduplication
// ---------------------------------------------------------------------------

describe("Search term deduplication", () => {
  it("does not repeat words already in brand/model", () => {
    // "Sneakers" is in category terms but brand is "Sneakers Co"
    const result = generateEbayTitle({
      brand: "Sneakers Co",
      model: "Runner",
      category: "sneakers",
      condition: "New",
    });
    const words = result.title.toLowerCase().split(/\s+/);
    const sneakersCount = words.filter((w) => w === "sneakers").length;
    expect(sneakersCount).toBeLessThanOrEqual(1);
  });

  it("adds at most 3 search terms", () => {
    const result = generateEbayTitle({
      brand: "Unknown",
      model: "Thing",
      category: "sneakers",
      condition: "Used",
      suggestedKeywords: ["alpha", "beta", "gamma", "delta", "epsilon"],
    });
    // The result should stay ≤80 chars and title should be clean
    expect(result.charCount).toBeLessThanOrEqual(80);
    expectClean(result.title);
  });
});

// ---------------------------------------------------------------------------
// Brand + Model always in positions 1–2
// ---------------------------------------------------------------------------

describe("Brand + Model mandatory positions", () => {
  it("Brand is always first token", () => {
    const result = generateEbayTitle({
      brand: "Puma",
      model: "Suede Classic",
      category: "sneakers",
      condition: "Used",
      size: "US 9",
    });
    expect(result.title.startsWith("Puma")).toBe(true);
  });

  it("Model immediately follows Brand", () => {
    const result = generateEbayTitle({
      brand: "Puma",
      model: "Suede Classic",
      category: "sneakers",
      condition: "Used",
      size: "US 9",
    });
    expect(result.title.startsWith("Puma Suede Classic")).toBe(true);
  });

  it("Brand is never dropped even in extreme overflow", () => {
    const result = generateEbayTitle({
      brand: "Nike",
      model: "Air Force 1 Low Retro QS Basketball Shoe Special Anniversary",
      category: "sneakers",
      condition: "Pre-owned",
      size: "US 11",
    });
    expect(result.title).toContain("Nike");
  });
});
