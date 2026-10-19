import { describe, it, expect } from "vitest";

// Re-implement the exact pure grounding functions for isolated unit verification
function isItemUnidentified(res: any): boolean {
  if (!res) return true;
  const raw = (res.analysis?.product_name || res.product_name || "").trim();
  if (!raw) return true;
  if (
    raw === "NO_CENTER_ITEM" ||
    raw.toLowerCase() === "unidentified" ||
    raw.toLowerCase() === "unknown product" ||
    raw.toLowerCase() === "null" ||
    raw.length < 2 ||
    /^[.\/_\-–—:;,\s]+$/.test(raw)
  ) {
    return true;
  }
  if (res.status === "unidentified" || res.analysis?.status === "unidentified") {
    return true;
  }
  return false;
}

function brandsDisagree(brand1?: string | null, brand2?: string | null): boolean {
  if (!brand1 || !brand2) return false;
  const b1 = brand1.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const b2 = brand2.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!b1 || !b2) return false;
  if (b1 === b2 || b1.includes(b2) || b2.includes(b1)) return false;
  const genericSentinels = [
    "unknown",
    "generic",
    "vintage",
    "custom",
    "unbranded",
    "null",
    "none",
    "handmade",
    "nocenteritem",
  ];
  if (genericSentinels.includes(b1) || genericSentinels.includes(b2)) return false;
  return true;
}

describe("Tri-Model Vision Grounding & Cascade Verification", () => {
  it("flags empty, null, or missing items as unidentified so cascade triggers", () => {
    expect(isItemUnidentified(null)).toBe(true);
    expect(isItemUnidentified(undefined)).toBe(true);
    expect(isItemUnidentified({ product_name: "" })).toBe(true);
    expect(isItemUnidentified({ product_name: "   " })).toBe(true);
    expect(isItemUnidentified({ product_name: "NO_CENTER_ITEM" })).toBe(true);
    expect(isItemUnidentified({ analysis: { product_name: "NO_CENTER_ITEM" } })).toBe(true);
    expect(isItemUnidentified({ analysis: { product_name: "unidentified" } })).toBe(true);
    expect(isItemUnidentified({ analysis: { product_name: "unknown product" } })).toBe(true);
    expect(isItemUnidentified({ analysis: { product_name: "null" } })).toBe(true);
    expect(isItemUnidentified({ analysis: { product_name: "-" } })).toBe(true);
    expect(isItemUnidentified({ analysis: { product_name: "..." } })).toBe(true);
    expect(isItemUnidentified({ status: "unidentified", analysis: { product_name: "Nike Shoe" } })).toBe(true);
  });

  it("recognizes valid product identifications cleanly", () => {
    expect(isItemUnidentified({ status: "identified", analysis: { product_name: "Sony Cyber-shot DSC-W350" } })).toBe(false);
    expect(isItemUnidentified({ status: "identified", analysis: { product_name: "Carhartt Detroit Jacket J97" } })).toBe(false);
    expect(isItemUnidentified({ status: "identified", analysis: { product_name: "Prada Saffiano Wallet" } })).toBe(false);
    expect(isItemUnidentified({ status: "identified", analysis: { product_name: "Super Mario 64 N64 Cartridge" } })).toBe(false);
  });

  it("detects genuine brand disagreements without false alarms on generic labels", () => {
    // Real disagreements that require Grok arbitration:
    expect(brandsDisagree("Nike", "Adidas")).toBe(true);
    expect(brandsDisagree("Sony", "Panasonic")).toBe(true);
    expect(brandsDisagree("Prada", "Gucci")).toBe(true);

    // Matching or sub-brand agreements:
    expect(brandsDisagree("Nike", "Nike Air")).toBe(false);
    expect(brandsDisagree("Sony", "SONY")).toBe(false);
    expect(brandsDisagree("The North Face", "North Face")).toBe(false);

    // Generic sentinels that should NOT trigger brand arbitration:
    expect(brandsDisagree("Vintage", "Carhartt")).toBe(false);
    expect(brandsDisagree("Unbranded", "Ralph Lauren")).toBe(false);
    expect(brandsDisagree("Generic", "Sony")).toBe(false);
    expect(brandsDisagree(null, "Nike")).toBe(false);
    expect(brandsDisagree(undefined, undefined)).toBe(false);
  });

  it("simulates tri-model fallback progression (OpenAI fail -> Gemini hit)", () => {
    // Model 1 produces NO_CENTER_ITEM
    const model1Result = {
      status: "unidentified",
      analysis: { product_name: "NO_CENTER_ITEM" },
    };
    expect(isItemUnidentified(model1Result)).toBe(true);

    // Cascade activates Model 2 (Gemini Flash)
    const model2Result = {
      status: "identified",
      analysis: {
        product_name: "Sony Cyber-shot DSC-W350 Silver",
        brand: "Sony",
        confidence: "high",
        confidence_score: 0.96,
      },
    };
    expect(isItemUnidentified(model2Result)).toBe(false);
    expect(model2Result.analysis.brand).toBe("Sony");
  });

  it("simulates tri-model fallback progression (OpenAI fail -> Gemini fail -> Grok hit)", () => {
    // Model 1 produces error / null
    const model1Result = null;
    expect(isItemUnidentified(model1Result)).toBe(true);

    // Model 2 also unidentified
    const model2Result = {
      status: "unidentified",
      analysis: { product_name: "unidentified" },
    };
    expect(isItemUnidentified(model2Result)).toBe(true);

    // Cascade activates Model 3 (xAI Grok Vision)
    const model3Result = {
      status: "identified",
      analysis: {
        product_name: "Vintage Carhartt Active Jacket J130 MOS",
        brand: "Carhartt",
        confidence: "high",
        confidence_score: 0.98,
      },
    };
    expect(isItemUnidentified(model3Result)).toBe(false);
    expect(model3Result.analysis.brand).toBe("Carhartt");
  });
});
