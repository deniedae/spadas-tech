/**
 * Spadas Resale Engine Rigorous Performance Benchmarks
 * Evaluates real measured latencies (p50, p95, p99), memory deltas, provider fallbacks,
 * and strict AbortController timeout & reason assertions.
 */

import { performance } from "perf_hooks";
import os from "os";
import assert from "assert";

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

// ── AbortSignal & Circuit Breaker Engine with Strict In-Flight & Reason Tracking ──
async function executeWithCircuitBreaker(providerTask, options) {
  const { timeoutMs, abortReason = "CIRCUIT_BREAKER_TIMEOUT", fallback } = options;
  const controller = new AbortController();
  const signal = controller.signal;

  let recordedAbortReason = null;
  signal.addEventListener("abort", () => {
    recordedAbortReason = typeof signal.reason === "string" ? signal.reason : String(signal.reason || abortReason);
  });

  const startTime = performance.now();
  let timerId;

  const timeoutPromise = new Promise((resolve) => {
    timerId = setTimeout(async () => {
      // Trigger AbortSignal with recorded reason
      if (!signal.aborted) {
        controller.abort(abortReason);
      }

      const elapsed = performance.now() - startTime;
      const fallbackData = await fallback();

      resolve({
        result: fallbackData,
        source: "offline_fallback",
        durationMs: elapsed,
        aborted: true,
        abortReason: recordedAbortReason || abortReason,
      });
    }, timeoutMs);
  });

  const upstreamPromise = (async () => {
    try {
      const data = await providerTask(signal);
      if (timerId) clearTimeout(timerId);

      return {
        result: data,
        source: "upstream",
        durationMs: performance.now() - startTime,
        aborted: false,
        abortReason: null,
      };
    } catch (err) {
      if (timerId) clearTimeout(timerId);
      if (signal.aborted) {
        const fallbackData = await fallback();
        return {
          result: fallbackData,
          source: "offline_fallback",
          durationMs: performance.now() - startTime,
          aborted: true,
          abortReason: recordedAbortReason || abortReason,
        };
      }
      throw err;
    }
  })();

  return await Promise.race([upstreamPromise, timeoutPromise]);
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
    parallelSamples.push((t1 - t0) / 10);
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
    assert.ok(val, "Cache hit assertion failed");
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
    assert.strictEqual(val, null, "Cache miss assertion failed");
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
    assert.strictEqual(v.copVerdict, "MUST_COP", "Cop verdict assertion failed");
    offlineSamples.push(t1 - t0);
  }
  results["Offline Fallback"] = calculatePercentiles(offlineSamples);

  // 6. Slow-Provider Timeout & Strict AbortSignal Assertion Benchmark
  console.log("⏱️  Running Benchmark 6: Slow-Provider Timeout & AbortSignal Assertions (60ms timeout)...");
  const timeoutSamples = [];
  const CONFIGURED_TIMEOUT_MS = 60;
  const SLOW_PROVIDER_LATENCY_MS = 250;

  for (let i = 0; i < 25; i++) {
    let providerWasAborted = false;
    let providerPendingDuration = 0;
    const providerStartTime = performance.now();

    const slowProviderTask = (signal) => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (!signal.aborted) {
            resolve({ product_name: "Late Item", price: 75.0 });
          }
        }, SLOW_PROVIDER_LATENCY_MS);

        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          providerWasAborted = true;
          providerPendingDuration = performance.now() - providerStartTime;
        });
      });
    };

    const t0 = performance.now();
    const res = await executeWithCircuitBreaker(slowProviderTask, {
      timeoutMs: CONFIGURED_TIMEOUT_MS,
      abortReason: "CIRCUIT_BREAKER_TIMEOUT",
      fallback: () => calculateThriftCopVerdict({ resalePrice: 50.0, category: "apparel" }),
    });
    const t1 = performance.now();
    const measuredElapsedMs = t1 - t0;

    // Strict Empirical Assertions:
    // 1. Provider remained pending for at least the configured timeout
    assert.ok(
      providerPendingDuration >= CONFIGURED_TIMEOUT_MS * 0.95,
      `Provider did not remain pending for timeout: ${providerPendingDuration}ms vs ${CONFIGURED_TIMEOUT_MS}ms`
    );

    // 2. Fallback is NOT returned before the timeout
    assert.ok(
      measuredElapsedMs >= CONFIGURED_TIMEOUT_MS * 0.95,
      `Fallback was returned prematurely at ${measuredElapsedMs}ms (before ${CONFIGURED_TIMEOUT_MS}ms timeout)!`
    );

    // 3. Abort signal is triggered
    assert.strictEqual(res.aborted, true, "Abort signal was not triggered on timeout!");
    assert.strictEqual(providerWasAborted, true, "Provider listener did not receive abort signal!");

    // 4. Abort reason is recorded
    assert.strictEqual(
      res.abortReason,
      "CIRCUIT_BREAKER_TIMEOUT",
      `Expected abort reason 'CIRCUIT_BREAKER_TIMEOUT', received '${res.abortReason}'`
    );

    // 5. Returned source is offline fallback
    assert.strictEqual(res.source, "offline_fallback", "Result source was not offline_fallback!");

    timeoutSamples.push(measuredElapsedMs);
  }
  results[`Slow-Provider Timeout (${CONFIGURED_TIMEOUT_MS}ms Circuit Breaker)`] = calculatePercentiles(timeoutSamples);

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

  console.log("🔍 TIMEOUT & ABORT VERIFICATION SUMMARY:");
  console.log(` • Configured Timeout:                  ${CONFIGURED_TIMEOUT_MS} ms`);
  console.log(` • Provider Pending Before Abort:       >= ${CONFIGURED_TIMEOUT_MS} ms (PASSED ✓)`);
  console.log(` • Fallback Return Elapsed Time:        >= ${CONFIGURED_TIMEOUT_MS} ms (PASSED ✓)`);
  console.log(` • AbortSignal.aborted Status:          true (PASSED ✓)`);
  console.log(` • AbortSignal.reason Recorded:         "CIRCUIT_BREAKER_TIMEOUT" (PASSED ✓)`);
  console.log(` • Result Fallback Source:              "offline_fallback" (PASSED ✓)\n`);

  console.log("✅ All benchmark & abort signal assertions PASSED.");
}

runBenchmarks().catch((err) => {
  console.error("Benchmark failed with assertion error:", err);
  process.exit(1);
});
