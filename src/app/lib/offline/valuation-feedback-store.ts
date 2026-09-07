/**
 * Automated Data Flywheel: Valuation Feedback & Calibration Store
 * Tracks user corrections, manual price edits, and rating signals to tune
 * computer vision and offline heuristic valuation weights in real-time.
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";

interface CalibrationRecord {
  categoryOrKeyword: string;
  adjustmentMultiplier: number;
  sampleCount: number;
  lastUpdated: number;
}

// Global in-memory dynamic weights cache
declare global {
  var __spadasCalibrationWeights: Map<string, CalibrationRecord> | undefined;
}

if (!global.__spadasCalibrationWeights) {
  global.__spadasCalibrationWeights = new Map();
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeKey(str?: string | null): string {
  if (!str) return "general";
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().split(/\s+/)[0] || "general";
}

/**
 * Returns dynamic calibration multiplier for a given category or brand keyword.
 * Defaults to 1.0 (neutral) if insufficient correction data.
 */
export function getValuationMultiplier(queryOrCategory?: string): number {
  if (!queryOrCategory) return 1.0;
  const key = normalizeKey(queryOrCategory);
  const cache = global.__spadasCalibrationWeights;

  const record = cache?.get(key);
  if (record && record.sampleCount >= 2) {
    // Dampen extremes between 0.6x and 1.8x
    return Math.max(0.6, Math.min(1.8, record.adjustmentMultiplier));
  }

  return 1.0;
}

/**
 * Ingests a user manual price correction to dynamically tune fallback appraisal weights.
 */
export async function recordValuationCorrection(params: {
  userId?: string | null;
  scanId?: string | null;
  category?: string | null;
  brand?: string | null;
  originalPrice: number;
  correctedPrice: number;
  reason?: string;
  notes?: string;
}): Promise<{ newMultiplier: number; key: string }> {
  const key = normalizeKey(params.brand || params.category || "resale");
  const cache = global.__spadasCalibrationWeights!;

  // Ratio of user price vs original AI appraisal
  const rawRatio = params.originalPrice > 0 ? params.correctedPrice / params.originalPrice : 1.0;
  // Clamp single correction between 0.35x and 2.5x to prevent outlier sabotage
  const clampedRatio = Math.max(0.35, Math.min(2.5, rawRatio));

  const existing = cache.get(key) || {
    categoryOrKeyword: key,
    adjustmentMultiplier: 1.0,
    sampleCount: 0,
    lastUpdated: Date.now(),
  };

  // Exponential moving average: alpha weight 0.3 for new feedback
  const alpha = 0.3;
  const newMultiplier = Math.round((existing.adjustmentMultiplier * (1 - alpha) + clampedRatio * alpha) * 100) / 100;
  const updatedRecord: CalibrationRecord = {
    categoryOrKeyword: key,
    adjustmentMultiplier: newMultiplier,
    sampleCount: existing.sampleCount + 1,
    lastUpdated: Date.now(),
  };

  cache.set(key, updatedRecord);

  // Persist to Supabase telemetry table asynchronously
  const supabase = getSupabaseAdmin();
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase.from("valuation_feedback").insert({
          scan_id: params.scanId || null,
          user_id: params.userId || null,
          category: params.category || "General",
          brand: params.brand || "Unspecified",
          original_price: params.originalPrice,
          corrected_price: params.correctedPrice,
          multiplier_impact: newMultiplier,
          correction_reason: params.reason || "MANUAL_ADJUSTMENT",
          notes: params.notes || null,
          created_at: new Date().toISOString(),
        });

        if (error) {
          // Fallback log to scan_reports if valuation_feedback table isn't created yet
          await supabase.from("scan_reports").insert({
            scan_id: params.scanId || null,
            user_id: params.userId || "anonymous",
            item_name: `${params.brand || ""} ${params.category || ""}: Adjusted $${params.originalPrice} -> $${params.correctedPrice}`,
            reported_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("[valuation-feedback] DB telemetry notice:", err);
      }
    })();
  }

  return { newMultiplier, key };
}
