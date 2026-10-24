import { describe, it, expect } from "vitest";
import {
  evaluateBrandAgreement,
  crossCheckScanAccuracy,
  type VerificationCandidate,
} from "../multi-ai-verifier";

describe("Multi-AI Consensus Verifier", () => {
  describe("evaluateBrandAgreement", () => {
    it("confirms agreement when brands match exactly or case-insensitively", () => {
      const res1 = evaluateBrandAgreement("Nike", "Nike");
      expect(res1.agreed).toBe(true);

      const res2 = evaluateBrandAgreement("Patagonia", "patagonia");
      expect(res2.agreed).toBe(true);

      const res3 = evaluateBrandAgreement("Lululemon Athletica", "Lululemon");
      expect(res3.agreed).toBe(true);
    });

    it("confirms agreement when both brands are generic or unbranded", () => {
      const res1 = evaluateBrandAgreement("Generic", "Unbranded");
      expect(res1.agreed).toBe(true);

      const res2 = evaluateBrandAgreement(null, "generic");
      expect(res2.agreed).toBe(true);

      const res3 = evaluateBrandAgreement(undefined, null);
      expect(res3.agreed).toBe(true);
    });

    it("rejects disagreement when brands conflict without OCR evidence", () => {
      const res = evaluateBrandAgreement("Gucci", "Coach");
      expect(res.agreed).toBe(false);

      const res2 = evaluateBrandAgreement("Sony", "Bose");
      expect(res2.agreed).toBe(false);
    });

    it("uses visible OCR tags to confirm brand verification", () => {
      const res = evaluateBrandAgreement("Nike", "Nike Inc", ["swoosh", "nike", "size 10"]);
      expect(res.agreed).toBe(true);
      expect(res.directOcrMatch).toBe(true);
    });

    it("flags brand disagreement when primary claims luxury but OCR only has generic text", () => {
      const res = evaluateBrandAgreement("Prada", "Unbranded", ["100% cotton", "made in china"]);
      expect(res.agreed).toBe(false);
    });

    it("confirms luxury brand when OCR detects iconic brand plaque text", () => {
      const res = evaluateBrandAgreement("Prada", "Unbranded", ["prada milano dal 1913"]);
      expect(res.agreed).toBe(true);
      expect(res.directOcrMatch).toBe(true);
    });
  });

  describe("crossCheckScanAccuracy candidate filtering", () => {
    it("immediately returns unverified false status for empty or NO_CENTER_ITEM candidates", async () => {
      const emptyCandidate: VerificationCandidate = {
        productName: "NO_CENTER_ITEM",
        brand: null,
        category: "General",
      };

      const result = await crossCheckScanAccuracy("data:image/jpeg;base64,123", emptyCandidate);
      expect(result.isAccurate).toBe(false);
      expect(result.status).toBe("single_ai_unverified");
      expect(result.confidenceScore).toBeLessThan(0.5);
    });

    it("gracefully falls back to single-ai status if secondary models are not active", async () => {
      const validCandidate: VerificationCandidate = {
        productName: "Vintage Levi's 501 Jeans",
        brand: "Levi's",
        category: "Clothing",
        confidenceScore: 0.9,
      };

      // In test environment without GEMINI_API_KEY / XAI_API_KEY, should safely return fallback
      const result = await crossCheckScanAccuracy("data:image/jpeg;base64,123", validCandidate);
      expect(result).toBeDefined();
      expect(result.verifiedProductName).toBe("Vintage Levi's 501 Jeans");
      expect(result.verifiedBrand).toBe("Levi's");
      expect(["verified_consensus", "single_ai_unverified"]).toContain(result.status);
    });
  });
});
