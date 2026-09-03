import assert from "node:assert/strict";
import {
  FORENSIC_CATEGORIES,
  detectForensicCategory,
} from "../src/lib/forensic-knowledge.ts";

console.log("🚀 Testing Spadas Universal Forensic Authenticity Engine...");

// Test 1: Category Detection across Multiple Materials
console.log("▶ Test 1: Category Auto-Detection Engine");

const crystalTest = detectForensicCategory("Raw Amethyst Crystal Cluster Geode");
assert.equal(crystalTest, "crystals_gems", "Should detect crystals and gems");

const goldTest = detectForensicCategory("18K Solid Yellow Gold Curb Chain 750 Stamped");
assert.equal(goldTest, "precious_metals", "Should detect precious metals");

const silverTest = detectForensicCategory("Vintage 925 Sterling Silver Ring");
assert.equal(silverTest, "precious_metals", "Should detect 925 silver as precious metals");

const bagTest = detectForensicCategory("Louis Vuitton Speedy 25 Monogram Handbag");
assert.equal(bagTest, "luxury_handbags", "Should detect luxury handbags");

const walletTest = detectForensicCategory("Prada Saffiano Leather Bifold Wallet");
assert.equal(walletTest, "small_leather_goods", "Should detect SLG and wallets without category drift into handbags");

const watchTest = detectForensicCategory("Rolex Datejust 36mm Automatic Watch");
assert.equal(watchTest, "watches", "Should detect watches and horology");

const shoeTest = detectForensicCategory("Nike Dunk Low Retro Panda Sneaker");
assert.equal(shoeTest, "sneakers_streetwear", "Should detect sneakers");

const cardTest = detectForensicCategory("Pokemon 1999 Base Set Charizard Holographic Rare");
assert.equal(cardTest, "trading_cards", "Should detect trading cards");

console.log("  ✓ All 8 material categories auto-detected with 100% accuracy (no category drift).");

// Test 2: Angle Configuration Integrity
console.log("▶ Test 2: Multi-Angle Macro Guidance Integrity");

for (const [catKey, config] of Object.entries(FORENSIC_CATEGORIES)) {
  assert.ok(config.name, `Category ${catKey} must have a name`);
  assert.ok(config.knowledgePrompt.length > 50, `Category ${catKey} must have detailed forensic knowledge`);
  assert.equal(config.angles.length, 4, `Category ${catKey} must have exactly 4 guided macro angles`);

  for (const angle of config.angles) {
    assert.ok(angle.id, `Angle in ${catKey} must have an ID`);
    assert.ok(angle.title, `Angle in ${catKey} must have a title`);
    assert.ok(angle.instruction, `Angle in ${catKey} must have clear instruction`);
    assert.ok(angle.macroTip, `Angle in ${catKey} must have an expert macro tip`);
  }
}
console.log("  ✓ All 32 guided macro photography angles verified with instructions & tips.");

// Test 3: Specific Counterfeit Rules Verification
console.log("▶ Test 3: Counterfeit Tell Rules & Hallmarks");

const crystalPrompt = FORENSIC_CATEGORIES.crystals_gems.knowledgePrompt;
assert.ok(crystalPrompt.includes("Gas Bubbles"), "Crystal prompt must check for round gas bubbles");
assert.ok(crystalPrompt.includes("Inclusions"), "Crystal prompt must inspect natural inclusions");

const metalPrompt = FORENSIC_CATEGORIES.precious_metals.knowledgePrompt;
assert.ok(metalPrompt.includes("750"), "Metal prompt must check for 750 (18K) hallmark");
assert.ok(metalPrompt.includes("925"), "Metal prompt must check for 925 silver hallmark");
assert.ok(metalPrompt.includes("Plating Erosion"), "Metal prompt must check for plating erosion");

const bagPrompt = FORENSIC_CATEGORIES.luxury_handbags.knowledgePrompt;
assert.ok(bagPrompt.includes("Louis Vuitton"), "Bag prompt must include Louis Vuitton specifics");
assert.ok(bagPrompt.includes("Hermes"), "Bag prompt must include Hermes saddle stitch rules");

const slgPrompt = FORENSIC_CATEGORIES.small_leather_goods.knowledgePrompt;
assert.ok(slgPrompt.includes("Notched 'R'"), "SLG prompt must verify Prada notched 'R' tell");
assert.ok(slgPrompt.includes("Factory Inspection Tag"), "SLG prompt must verify factory tag tell");
assert.ok(slgPrompt.includes("Saffiano"), "SLG prompt must check Saffiano leather vs plastic");

console.log("  ✓ Specialized counterfeit rules verified across crystals, gold/silver, luxury bags, and Prada SLGs.");

// Test 4: Intelligent AI Verification Triage
console.log("▶ Test 4: Intelligent AI Verification Triage");
import { checkNeedsVerification } from "../src/lib/forensic-knowledge.ts";

const lvCheck = checkNeedsVerification({ name: "Monogram Wallet", brand: "Louis Vuitton", estimatedValue: 350 });
assert.equal(lvCheck.needsVerification, true, "Louis Vuitton wallet must require verification");
assert.equal(lvCheck.category, "small_leather_goods", "Wallets must route to small_leather_goods");

const pradaCheck = checkNeedsVerification({ name: "Saffiano Bifold Wallet", brand: "Prada", estimatedValue: 180 });
assert.equal(pradaCheck.needsVerification, true, "Prada bifold wallet must require verification");
assert.equal(pradaCheck.category, "small_leather_goods", "Prada wallet must route to small_leather_goods");

const lvBagCheck = checkNeedsVerification({ name: "Speedy 30 Monogram", brand: "Louis Vuitton", estimatedValue: 800 });
assert.equal(lvBagCheck.needsVerification, true, "Louis Vuitton Speedy must require verification");
assert.equal(lvBagCheck.category, "luxury_handbags", "Handbags must route to luxury_handbags");

const goldCheck = checkNeedsVerification({ name: "18K Gold Chain Necklace", brand: "Generic", estimatedValue: 500 });
assert.equal(goldCheck.needsVerification, true, "18K Gold must require verification");
assert.equal(goldCheck.category, "precious_metals");

const crystalCheck = checkNeedsVerification({ name: "Raw Amethyst Crystal Cluster Geode", estimatedValue: 60 });
assert.equal(crystalCheck.needsVerification, true, "Crystals and geodes must require verification");
assert.equal(crystalCheck.category, "crystals_gems");

const rolexCheck = checkNeedsVerification({ name: "Submariner Date", brand: "Rolex", estimatedValue: 9000 });
assert.equal(rolexCheck.needsVerification, true, "Rolex must require verification");
assert.equal(rolexCheck.category, "watches");

const mugCheck = checkNeedsVerification({ name: "Vintage Ceramic Coffee Mug", brand: "Target", estimatedValue: 4 });
assert.equal(mugCheck.needsVerification, false, "Everyday coffee mug must NOT require verification");

const shirtCheck = checkNeedsVerification({ name: "Plain Cotton Crewneck T-Shirt", brand: "Gildan", estimatedValue: 8 });
assert.equal(shirtCheck.needsVerification, false, "Plain t-shirt must NOT require verification");

console.log("  ✓ AI correctly distinguishes high-risk items from everyday commodities without cluttering UI.");

console.log("\n🎉 ALL FORENSIC AUTHENTICITY ENGINE TESTS PASSED!");
