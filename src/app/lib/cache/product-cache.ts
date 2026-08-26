import { supabase } from "@/app/lib/supabase";
import type { AiListingResult } from "@/types/ai-listing";

// Level 1: In-Memory Edge Cache (0ms latency for frequent items)
const memoryCache = new Map<string, { data: AiListingResult; expiry: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7-day retention

export function normalizeSearchKey(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fast lookup from In-Memory or Supabase product cache
 */
export async function getCachedProductScan(searchQuery: string): Promise<AiListingResult | null> {
  const key = normalizeSearchKey(searchQuery);
  if (!key || key.length < 3) return null;

  // 1. Check in-memory Edge Cache (0ms)
  const memHit = memoryCache.get(key);
  if (memHit && memHit.expiry > Date.now()) {
    console.log(`[ProductCache] In-Memory HIT (0ms): "${key}"`);
    return memHit.data;
  }

  // 2. Check Supabase scanned_product_cache (sub-30ms)
  try {
    const { data, error } = await supabase
      .from("scanned_product_cache")
      .select("*")
      .ilike("search_key", `%${key}%`)
      .limit(1)
      .single();

    if (!error && data && data.result_payload) {
      console.log(`[ProductCache] Supabase Cache HIT (<30ms): "${key}"`);
      const cachedResult = data.result_payload as AiListingResult;

      // Update in-memory cache
      memoryCache.set(key, { data: cachedResult, expiry: Date.now() + CACHE_TTL_MS });

      // Increment hit count asynchronously
      void supabase
        .from("scanned_product_cache")
        .update({ hit_count: (data.hit_count || 1) + 1, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .then(() => {});

      return cachedResult;
    }
  } catch (err) {
    console.warn("[ProductCache] Supabase cache read warning:", err);
  }

  return null;
}

/**
 * Save scanned product to both In-Memory and Supabase cache
 */
export async function saveProductToCache(
  productName: string,
  resultPayload: AiListingResult
): Promise<void> {
  const key = normalizeSearchKey(productName);
  if (!key || key.length < 3 || key === "no center item" || key.includes("unidentified")) {
    return;
  }

  // 1. Update in-memory cache
  memoryCache.set(key, { data: resultPayload, expiry: Date.now() + CACHE_TTL_MS });

  // 2. Persist to Supabase
  try {
    await supabase.from("scanned_product_cache").upsert(
      {
        search_key: key,
        product_name: productName,
        brand: resultPayload.analysis?.brand || null,
        category: resultPayload.analysis?.category || "General Resale",
        price_median: resultPayload.suggested_price_median || 45,
        result_payload: resultPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "search_key" }
    );
    console.log(`[ProductCache] Saved to Supabase Knowledge Graph: "${key}"`);
  } catch (err) {
    console.warn("[ProductCache] Supabase cache save warning:", err);
  }
}
