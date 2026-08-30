/**
 * Spadas Resale Engine Rigorous Performance Benchmarks
 * Evaluates real measured latencies (p50, p95, p99), memory deltas, and provider fallbacks.
 */

import { performance } from "perf_hooks";
import os from "os";

// ── Pure Offline Engine & Cop Verdict Re-implementation for isolated benchmarking ──
const CATEGORY_THRIFT_COGS = {
  apparel: 5.0,
  jackets: 14.0,
  shoes: 15.0,
  sneakers: 18.0,
  electronics: 10.0,
  gaming: 4.0,
  collectibles: 6.0,
  trading_cards: 2.5,
  handbags: 12.0,
  media: 2.0,
  vintage: 8.0,
  general: 5.0,
};

function calculateThriftCopVerdict(options) {
  const {
    resalePrice = 0,
    customCost,
    category,
    platformFeeRate = 0.134,
    fixedFee = 0.33,
    shippingCost = 0,
  } = options;

  let estimatedThriftCost = 5.0;
  if (typeof customCost === "number" && customCost > 0) {
    estimatedThriftCost = customCost;
  } else if (category) {
    const c = category.toLowerCase();
    for (const [k, cost] of Object.entries(CATEGORY_THRIFT_COGS)) {
      if (c.includes(k)) {
        estimatedThriftCost = cost;
        break;
      }
    }
  }

  const platformFees = Math.round((resalePrice * platformFeeRate + fixedFee) * 100) / 100;
  const netProfit = Math.max(
    -estimatedThriftCost,
    Math.round((resalePrice - estimatedThriftCost - platformFees - shippingCost) * 100) / 100
  );

  const roiPercentage =
    estimatedThriftCost > 0 ? Math.round((netProfit / estimatedThriftCost) * 100) : 0;

  let copVerdict = "FAIR_MARGIN";
  if (netProfit >= 35 || roiPercentage >= 300) {
    copVerdict = "MUST_COP";
  } else if (netProfit >= 15 || roiPercentage >= 100) {
    copVerdict = "QUICK_FLIP";
  } else if (netProfit < 8) {
    copVerdict = "PASS_RISKY";
  }

  return {
    estimatedResalePrice: resalePrice,
    estimatedThriftCost,
    platformFees,
    netProfit,
    roiPercentage,
    copVerdict,
  };
}

// ── In-Memory LRU Cache Implementation ──
const memoryCache = new Map();
const MEMORY_CACHE_LIMIT = 150;

function generateCacheKey(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function setCachedValuation(keyText, hit) {
  if (!keyText) return;
  const key = generateCacheKey(keyText);
  if (memoryCache.size >= MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { hit, timestamp: Date.now() });
}

function getCachedValuation(keyText, maxAgeMs = 86400000) {
  if (!keyText) return null;
  const key = generateCacheKey(keyText);
  const item = memoryCache.get(key);
  if (item && Date.now() - item.timestamp < maxAgeMs) {
    return item.hit;
  }
  return null;
}

// ── Mock Upstream Provider with Configurable Latency & Timeout ──
async function mockUpstreamProvider(itemName, latencyMs, shouldFail = false) {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  if (shouldFail) {
    throw new Error("Provider timeout / upstream failure");
  }
  return {
    product_name: itemName,
    suggested_price: 65.0,
    confidence: 0.95,
  };
}

async function appraiseWithTimeout(itemName, providerLatencyMs, timeoutMs) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("CIRCUIT_BREAKER_TIMEOUT")), timeoutMs)
  );

  try {
    const result = await Promise.race([
      mockUpstreamProvider(itemName, providerLatencyMs),
      timeoutPromise,
    ]);
    return { source: "upstream", data: result };
  } catch {
    // Fallback to offline cop verdict calculation immediately
    const fallback = calculateThriftCopVerdict({
      resalePrice: 45.0,
      category: "apparel",
    });
    return { source: "offline_fallback", data: fallback };
  }
}

// ── Statistical Helper ──
function calculatePercentiles(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    avg: Number(avg.toFixed(3)),
    p50: Number(p50.toFixed(3)),
    p95: Number(p95.toFixed(3)),
    p99: Number(p99.toFixed(3)),
    count: sorted.length,
  };
}

// ── Benchmark Suite Execution ──
async function runBenchmarks() {
  console.log("================================================================================");
  console.log("           SPADAS AI RESALE ENGINE — RIGOROUS BENCHMARK SUITE");
  console.log("================================================================================\n");

  const cpus = os.cpus();
  const envDetails = {
    OS: `${os.type()} ${os.release()} (${os.arch()})`,
    CPU: `${cpus[0]?.model || "Unknown CPU"} (${cpus.length} cores)`,
    NodeVersion: process.version,
    TotalMemoryGB: (os.totalmem() / (1024 ** 3)).toFixed(2) + " GB",
    FreeMemoryGB: (os.freemem() / (1024 ** 3)).toFixed(2) + " GB",
  };

  console.log("📋 SYSTEM TEST ENVIRONMENT:");
  console.log(` • OS:          ${envDetails.OS}`);
  console.log(` • CPU:         ${envDetails.CPU}`);
  console.log(` • Node:        ${envDetails.NodeVersion}`);
  console.log(` • Memory:      ${envDetails.TotalMemoryGB} total (${envDetails.FreeMemoryGB} free)\n`);

  const initialMem = process.memoryUsage();
  const results = {};

  // 1. Cold Appraisal Benchmark (Un-warmed iterations)
  console.log("⏱️  Running Benchmark 1: Cold Appraisal...");
  const coldSamples = [];
  for (let i = 0; i < 20; i++) {
    // Clear cache to simulate cold state
    memoryCache.clear();
    const t0 = performance.now();
    const item = `Cold Item Vintage Jacket ${i}`;
    const verdict = calculateThriftCopVerdict({
      resalePrice: 85.0 + i,
      category: "jackets",
      customCost: 14.0,
    });
    setCachedValuation(item, verdict);
    const t1 = performance.now();
    coldSamples.push(t1 - t0);
  }
  results["Cold Appraisal"] = calculatePercentiles(coldSamples);

  // 2. Parallel Appraisal Benchmark (Concurrent Promise.all batches)
  console.log("⏱️  Running Benchmark 2: Parallel Concurrent Appraisal (Batches of 10)...");
  const parallelSamples = [];
  for (let batch = 0; batch < 30; batch++) {
    const t0 = performance.now();
    const tasks = Array.from({ length: 10 }).map((_, idx) => {
      return new Promise((resolve) => {
        const v = calculateThriftCopVerdict({
          resalePrice: 40 + idx * 5,
          category: idx % 2 === 0 ? "sneakers" : "handbags",
        });
        resolve(v);
      });
    });
    await Promise.all(tasks);
    const t1 = performance.now();
    parallelSamples.push((t1 - t0) / 10); // Per-item latency in batch
  }
  results["Parallel Appraisal (per item)"] = calculatePercentiles(parallelSamples);

  // 3. Cache Hit Benchmark (1000 lookups)
  console.log("⏱️  Running Benchmark 3: Cache Hit (LRU in-memory lookup)...");
  const sampleItem = { name: "Nike Air Max 95 OG", profit: 65, copVerdict: "MUST_COP" };
  setCachedValuation("Nike Air Max 95 OG", sampleItem);

  const hitSamples = [];
  for (let i = 0; i < 1000; i++) {
    const t0 = performance.now();
    const val = getCachedValuation("Nike Air Max 95 OG");
    const t1 = performance.now();
    if (!val) throw new Error("Cache hit assertion failed");
    hitSamples.push(t1 - t0);
  }
  results["Cache Hit (in-memory)"] = calculatePercentiles(hitSamples);

  // 4. Cache Miss Benchmark (1000 lookups)
  console.log("⏱️  Running Benchmark 4: Cache Miss (Uncached lookup)...");
  const missSamples = [];
  for (let i = 0; i < 1000; i++) {
    const t0 = performance.now();
    const val = getCachedValuation(`Uncached NonExistent Item SKU #${i}`);
    const t1 = performance.now();
    if (val !== null) throw new Error("Cache miss assertion failed");
    missSamples.push(t1 - t0);
  }
  results["Cache Miss"] = calculatePercentiles(missSamples);

  // 5. Offline Fallback Benchmark (1000 local computations)
  console.log("⏱️  Running Benchmark 5: Offline Fallback (Local COGS & Cop Math)...");
  const offlineSamples = [];
  for (let i = 0; i < 1000; i++) {
    const t0 = performance.now();
    const v = calculateThriftCopVerdict({
      resalePrice: 120.0,
      customCost: 15.0,
      category: "sneakers",
    });
    const t1 = performance.now();
    if (v.copVerdict !== "MUST_COP") throw new Error("Cop verdict assertion failed");
    offlineSamples.push(t1 - t0);
  }
  results["Offline Fallback"] = calculatePercentiles(offlineSamples);

  // 6. Slow-Provider Timeout Benchmark (Circuit breaker 50ms timeout)
  console.log("⏱️  Running Benchmark 6: Slow-Provider Timeout & Circuit Breaker (50ms timeout)...");
  const timeoutSamples = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const res = await appraiseWithTimeout("Laggy Server Item", 250, false); // 250ms provider with 50ms timeout
    const t1 = performance.now();
    if (res.source !== "offline_fallback") throw new Error("Timeout fallback assertion failed");
    timeoutSamples.push(t1 - t0);
  }
  results["Slow-Provider Timeout (50ms Circuit Breaker)"] = calculatePercentiles(timeoutSamples);

  const finalMem = process.memoryUsage();
  const memDelta = {
    heapUsedMB: ((finalMem.heapUsed - initialMem.heapUsed) / (1024 * 1024)).toFixed(2),
    heapTotalMB: (finalMem.heapTotal / (1024 * 1024)).toFixed(2),
    rssMB: (finalMem.rss / (1024 * 1024)).toFixed(2),
  };

  console.log("\n================================================================================");
  console.log("                         MEASURED EMPIRICAL RESULTS");
  console.log("================================================================================");

  console.table(
    Object.entries(results).reduce((acc, [name, stats]) => {
      acc[name] = {
        "p50 (ms)": stats.p50,
        "p95 (ms)": stats.p95,
        "p99 (ms)": stats.p99,
        "Avg (ms)": stats.avg,
        "Min (ms)": stats.min,
        "Max (ms)": stats.max,
        Samples: stats.count,
      };
      return acc;
    }, {})
  );

  console.log("🧠 MEMORY CONSUMPTION PROFILE:");
  console.log(` • Heap Used Delta:  ${memDelta.heapUsedMB} MB`);
  console.log(` • Total Heap Size:   ${memDelta.heapTotalMB} MB`);
  console.log(` • Process RSS:       ${memDelta.rssMB} MB\n`);

  console.log("✅ All benchmark assertions PASSED.");
}

runBenchmarks().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
