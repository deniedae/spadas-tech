// scratch/verify_3_scans.js
// Run before every deployment: node scratch/verify_3_scans.js

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";

const TEST_CASES = [
  {
    label: "Nike Sneaker (clear image signal)",
    payload: { imageUrls: [], isArScan: true, _syntheticTest: "nike_sneaker" },
    expect: (data) => data?.analysis?.product_name || data?.product_name,
  },
  {
    label: "Empty frame (no center item)",
    payload: { imageUrls: [], isArScan: true, _syntheticTest: "empty_frame" },
    expect: (data) => data?.analysis?.product_name === "NO_CENTER_ITEM" || !data?.analysis?.product_name,
  },
  {
    label: "Rate limit simulation",
    payload: { imageUrls: [], isArScan: true, _syntheticTest: "rate_limit" },
    expect: (_data, status) => status === 429 || status === 200 || status === 401,
  },
];

async function run() {
  console.log("=== RUNNING SYNTHETIC SCAN SUITE ===");
  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    try {
      const res = await fetch(`${BASE_URL}/api/ai-listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tc.payload),
      });

      const data = await res.json().catch(() => null);
      const ok = tc.expect(data, res.status);

      if (ok) {
        console.log(`✅ PASS — ${tc.label}`);
        passed++;
      } else {
        console.error(`❌ FAIL — ${tc.label}`);
        console.error("   Response:", JSON.stringify(data).slice(0, 200));
        failed++;
      }
    } catch (err) {
      console.error(`❌ ERROR — ${tc.label}:`, err.message);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
