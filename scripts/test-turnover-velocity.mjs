import { calculateSalesVelocity } from "../src/lib/turnover-velocity-engine.ts";
import { calculateThriftCopVerdict } from "../src/lib/thrift-cop-engine.ts";

console.log("==================================================");
console.log(" 🧪 Testing Reseller Turnover & Velocity Engine    ");
console.log("==================================================\n");

function assert(cond, msg) {
  if (!cond) {
    console.error("❌ FAILED:", msg);
    process.exit(1);
  } else {
    console.log("✓ PASSED:", msg);
  }
}

// 1. Auto Salvage High-Turnover: ECM / ECU
const ecm = calculateSalesVelocity({
  productName: "Honda Civic OEM Engine Control Module ECU ECM",
  category: "Auto Salvage & Parts",
});
console.log("ECM Velocity Profile:", {
  str: `${ecm.sellThroughRate}%`,
  days: ecm.estDaysToSell,
  tier: ecm.turnoverTier,
  label: ecm.velocityLabel,
});
assert(ecm.turnoverTier === "RAPID_FIRE", "ECM must be RAPID_FIRE tier");
assert(ecm.sellThroughRate >= 100, "ECM must have >=100% STR");
assert(ecm.isHoarderRisk === false, "ECM must not be hoarder risk");

// 2. Junkyard Hoarder Trap: Heavy Steel Wheel
const wheel = calculateSalesVelocity({
  productName: "Chevy Silverado Heavy 17in Steel Wheel Rim",
  category: "Auto Parts",
});
console.log("\nHeavy Wheel Velocity Profile:", {
  str: `${wheel.sellThroughRate}%`,
  days: wheel.estDaysToSell,
  tier: wheel.turnoverTier,
  isHoarderRisk: wheel.isHoarderRisk,
});
assert(wheel.turnoverTier === "HOARDER_RISK", "Heavy Steel Wheel must be HOARDER_RISK tier");
assert(wheel.sellThroughRate < 25, "Heavy Steel Wheel must have <25% STR");
assert(wheel.isHoarderRisk === true, "Heavy Steel Wheel must trigger isHoarderRisk flag");

// 3. Ruthless Reseller Cop Verdict downgrades hoarder trap
const wheelVerdict = calculateThriftCopVerdict({
  resalePrice: 65,
  customCost: 15,
  category: "Auto Parts",
  productName: "Heavy Steel Wheel Rim",
});
console.log("\nHeavy Wheel Cop Verdict:", {
  verdict: wheelVerdict.copVerdict,
  label: wheelVerdict.verdictLabel,
  desc: wheelVerdict.verdictDescription,
});
assert(wheelVerdict.copVerdict === "PASS_RISKY", "Hoarder trap must result in PASS_RISKY verdict even with paper profit");
assert(wheelVerdict.verdictLabel.includes("HARD PASS"), "Label must clearly warn HARD PASS");

// 4. Digicam High Velocity Flip
const digicam = calculateSalesVelocity({
  productName: "Sony Cyber-shot DSC-W330 Y2K CCD Digicam",
  category: "Digital Cameras",
});
console.log("\nDigicam Velocity Profile:", {
  str: `${digicam.sellThroughRate}%`,
  days: digicam.estDaysToSell,
  tier: digicam.turnoverTier,
});
assert(digicam.turnoverTier === "RAPID_FIRE", "Digicam must be RAPID_FIRE");
assert(digicam.sellThroughRate >= 140, "Digicam must have high STR");

// 5. Explicit Scraper Counts (Active vs Sold) Formula Validation
const scraperCalc = calculateSalesVelocity({
  productName: "Flipping Item",
  category: "General",
  activeCount: 15,
  soldsCount: 22,
});
console.log("\nScraper Counts Math (22 sold / 15 active):", {
  str: `${scraperCalc.sellThroughRate}%`,
  tier: scraperCalc.turnoverTier,
  days: scraperCalc.estDaysToSell,
});
assert(scraperCalc.sellThroughRate === 147, "STR must equal Math.round((22/15)*100) = 147%");
assert(scraperCalc.turnoverTier === "RAPID_FIRE", "147% STR must be RAPID_FIRE");

console.log("\n🎉 ALL 5 TURNOVER & SALES VELOCITY TESTS PASSED PERFECTLY!\n");
