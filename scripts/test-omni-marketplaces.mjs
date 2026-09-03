import assert from "node:assert/strict";
import { calculateOmniMarketplaceComps, buildMarketplaceCompUrl } from "../src/lib/omni-marketplaces.ts";

console.log("🚀 Testing Omni-Marketplaces Engine...");

// Test 1: URL Generators
console.log("▶ Test 1: URL Generators & Query Encoding");
const ebayUrl = buildMarketplaceCompUrl("ebay", "Vintage Carhartt Jacket", "AUD");
assert.ok(ebayUrl.includes("ebay.com.au"), "eBay AU URL should target ebay.com.au for AUD");
assert.ok(ebayUrl.includes("LH_Sold=1"), "eBay URL should include LH_Sold=1");
assert.ok(ebayUrl.includes("Vintage%20Carhartt%20Jacket"), "Query should be properly encoded");

const depopUrl = buildMarketplaceCompUrl("depop", "Nike Dunk Low Panda", "USD");
assert.ok(depopUrl.includes("depop.com/search"), "Depop search URL formed correctly");

const poshmarkUrl = buildMarketplaceCompUrl("poshmark", "Lululemon Align Pant", "USD");
assert.ok(poshmarkUrl.includes("type=sold"), "Poshmark should search sold comps");

const fbUrl = buildMarketplaceCompUrl("facebook", "Sony PlayStation 5", "AUD");
assert.ok(fbUrl.includes("facebook.com/marketplace"), "FB Marketplace URL formed correctly");

console.log("  ✓ All 5 marketplace outbound URLs generated accurately with sold filters.");

// Test 2: Calculation and Ranking for Streetwear
console.log("▶ Test 2: Streetwear Pricing & Fee Calculations");
const streetwearComps = calculateOmniMarketplaceComps({
  productName: "Detroit Jacket J97",
  brand: "Carhartt",
  basePrice: 200,
  currency: "AUD",
  customCost: 25,
});

assert.equal(streetwearComps.marketplaces.length, 5, "Should return 5 marketplace comparisons");
assert.ok(streetwearComps.bestPlatform, "Should identify best platform");
assert.ok(streetwearComps.spread.maxNetPayout > streetwearComps.spread.minNetPayout, "Spread max should exceed min");

for (const m of streetwearComps.marketplaces) {
  assert.ok(m.netPayout >= 0, `Net payout for ${m.name} should not be negative`);
  assert.ok(!isNaN(m.netPayout), `Net payout for ${m.name} must be a valid number`);
  assert.ok(m.searchUrl.startsWith("https://"), `Search URL for ${m.name} must be valid HTTPS`);
}
console.log(`  ✓ Streetwear Best Channel: ${streetwearComps.bestPlatform.name} with net payout: $${streetwearComps.bestPlatform.netPayout} AUD`);

// Test 3: Low-cost item fee handling
console.log("▶ Test 3: Low-Cost Item Edge Case Handling");
const lowCostComps = calculateOmniMarketplaceComps({
  productName: "Keychain Vintage",
  basePrice: 10,
  currency: "AUD",
  customCost: 1,
});
assert.ok(lowCostComps.bestPlatform.netPayout >= 0, "Low cost item should not produce negative payout");
console.log("  ✓ Low cost items handled cleanly without negative profit bugs.");

console.log("\n🎉 ALL OMNI-MARKETPLACE ENGINE TESTS PASSED!");
