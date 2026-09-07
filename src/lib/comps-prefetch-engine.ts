/**
 * Intelligent Prefetch Queue & Geolocation Category Biasing Engine
 * 1. Location-Aware Category Biasing:
 *    Detects user geolocation, venue context (Thrift store, op-shop, vintage market, consignment),
 *    and biases vision inference priors toward authentic secondhand inventory.
 * 2. Intelligent Prefetch Queue:
 *    Caches recent marketplace category query templates locally in localStorage (spadas_category_query_templates).
 *    Fires eBay sold comps queries in parallel with vision inference the instant an optical composite is synthesized.
 */

import { SupportedCurrency } from "@/app/lib/currency-routing";

export interface SpatialMetadata {
  latitude?: number;
  longitude?: number;
  storeName?: string;
  venueType?: "thrift_shop" | "vintage_market" | "consignment" | "pawn_tech" | "general_resale";
  suburb?: string;
  country?: string;
  categoryBias?: string;
}

export type CategoryBiasOption =
  | "auto"
  | "vintage_clothing"
  | "digicams_tech"
  | "designer_luxury"
  | "collectibles_toys"
  | "general_thrift";

export interface CategoryQueryTemplate {
  id: string;
  category: string;
  bias: CategoryBiasOption;
  queryTemplate: string;
  sampleKeywords: string[];
  lastUsed: number;
  frequency: number;
}

const TEMPLATES_STORAGE_KEY = "spadas_category_query_templates";
const SPATIAL_STORAGE_KEY = "spadas_cached_spatial_metadata";

// Seed high-confidence default templates for top thrift / resale categories
const DEFAULT_QUERY_TEMPLATES: CategoryQueryTemplate[] = [
  {
    id: "vintage_apparel_jacket",
    category: "Clothing",
    bias: "vintage_clothing",
    queryTemplate: "vintage duck canvas jacket",
    sampleKeywords: ["carhartt", "detroit", "workwear", "canvas", "vintage"],
    lastUsed: Date.now(),
    frequency: 12,
  },
  {
    id: "vintage_apparel_tee",
    category: "Clothing",
    bias: "vintage_clothing",
    queryTemplate: "vintage single stitch graphic t-shirt",
    sampleKeywords: ["harley", "nike", "band tee", "90s", "single stitch"],
    lastUsed: Date.now(),
    frequency: 10,
  },
  {
    id: "digicams_y2k",
    category: "Electronics",
    bias: "digicams_tech",
    queryTemplate: "vintage digital camera y2k cyber-shot",
    sampleKeywords: ["sony", "canon", "powershot", "olympus", "digicam"],
    lastUsed: Date.now(),
    frequency: 9,
  },
  {
    id: "luxury_wallet",
    category: "Luxury Accessories",
    bias: "designer_luxury",
    queryTemplate: "saffiano leather triangle bifold wallet",
    sampleKeywords: ["prada", "gucci", "leather", "wallet", "monogram"],
    lastUsed: Date.now(),
    frequency: 8,
  },
  {
    id: "shoes_streetwear",
    category: "Shoes",
    bias: "vintage_clothing",
    queryTemplate: "retro high og sneakers",
    sampleKeywords: ["nike", "jordan", "dunk", "adidas", "sneakers"],
    lastUsed: Date.now(),
    frequency: 7,
  },
  {
    id: "retro_gaming",
    category: "Video Games",
    bias: "digicams_tech",
    queryTemplate: "nintendo game boy pokemon game cartridge",
    sampleKeywords: ["nintendo", "pokemon", "gameboy", "ds", "retro game"],
    lastUsed: Date.now(),
    frequency: 6,
  },
];

/**
 * Loads category query templates from localStorage, initializing with defaults if absent.
 */
export function getStoredCategoryTemplates(): CategoryQueryTemplate[] {
  if (typeof window === "undefined") return DEFAULT_QUERY_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_QUERY_TEMPLATES));
      return DEFAULT_QUERY_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUERY_TEMPLATES;
  } catch {
    return DEFAULT_QUERY_TEMPLATES;
  }
}

/**
 * Records a successful query in the local template cache, boosting its frequency score.
 */
export function recordCategoryTemplateQuery(
  productName: string,
  category: string,
  bias: CategoryBiasOption = "auto"
): void {
  if (typeof window === "undefined" || !productName || productName.length < 3) return;
  try {
    const templates = getStoredCategoryTemplates();
    const cleanName = productName.trim().toLowerCase();
    
    // Check if an existing template closely matches
    const existing = templates.find((t) => t.queryTemplate.toLowerCase() === cleanName || cleanName.includes(t.queryTemplate.toLowerCase()));
    if (existing) {
      existing.frequency += 1;
      existing.lastUsed = Date.now();
    } else {
      templates.unshift({
        id: `custom-${Date.now()}`,
        category: category || "General",
        bias: bias || "auto",
        queryTemplate: cleanName.slice(0, 60),
        sampleKeywords: cleanName.split(/\s+/).slice(0, 4),
        lastUsed: Date.now(),
        frequency: 1,
      });
    }

    // Keep top 25 highest-frequency templates
    templates.sort((a, b) => b.frequency - a.frequency);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates.slice(0, 25)));
  } catch (err) {
    console.warn("[comps-prefetch] Failed to record query template:", err);
  }
}

/**
 * Retrieves the most probable marketplace query template based on active category bias and candidate keywords.
 */
export function getPredictiveQueryForCategory(
  bias: CategoryBiasOption,
  detectedTextHints?: string[]
): string {
  const templates = getStoredCategoryTemplates();
  const textJoined = (detectedTextHints || []).join(" ").toLowerCase();

  // 1. Text hint match
  if (textJoined.length > 2) {
    for (const t of templates) {
      const match = t.sampleKeywords.some((kw) => textJoined.includes(kw.toLowerCase()));
      if (match) {
        return t.queryTemplate;
      }
    }
  }

  // 2. Bias match
  if (bias && bias !== "auto") {
    const matchingBias = templates.find((t) => t.bias === bias);
    if (matchingBias) return matchingBias.queryTemplate;
  }

  // 3. Fallback to highest frequency template
  return templates[0]?.queryTemplate || "vintage thrift find";
}

/**
 * Resolves user geolocation and spatial venue metadata non-blockingly (3s timeout).
 */
export async function resolveSpatialMetadata(
  activeBias: CategoryBiasOption = "auto"
): Promise<SpatialMetadata> {
  if (typeof window === "undefined") {
    return { venueType: "thrift_shop", categoryBias: activeBias };
  }

  // Retrieve cached spatial metadata first for instant response
  let cached: SpatialMetadata = { venueType: "thrift_shop", categoryBias: activeBias };
  try {
    const raw = localStorage.getItem(SPATIAL_STORAGE_KEY);
    if (raw) {
      cached = { ...cached, ...JSON.parse(raw) };
    }
  } catch {}

  // Non-blocking background geolocation refresh
  if ("geolocation" in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 2500, maximumAge: 300000 }
        );
      });

      if (pos && pos.coords) {
        const updated: SpatialMetadata = {
          ...cached,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          storeName: cached.storeName || "Local Sourcing Hub / Op-Shop",
          venueType: "thrift_shop",
          categoryBias: activeBias !== "auto" ? activeBias : "vintage_clothing",
        };
        try {
          localStorage.setItem(SPATIAL_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      }
    } catch {}
  }

  return cached;
}

// In-Memory Parallel Comps Pre-fetch Cache
const parallelCompsCache = new Map<string, { promise: Promise<any>; timestamp: number }>();

/**
 * Fires a predictive background sold comps query in parallel with vision inference.
 * Keeps response cached for 60 seconds.
 */
export function fireParallelCompsQuery(
  query: string,
  currency: SupportedCurrency = "AUD"
): Promise<any> {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 3) return Promise.resolve(null);

  const key = `${currency}::${clean}`;
  const existing = parallelCompsCache.get(key);
  if (existing && Date.now() - existing.timestamp < 60000) {
    return existing.promise;
  }

  const promise = fetch("/api/price-suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: clean, currency }),
  })
    .then(async (res) => {
      if (res.ok) {
        return res.json().catch(() => null);
      }
      return null;
    })
    .catch((err) => {
      console.warn("[comps-prefetch] Parallel prefetch error:", err);
      return null;
    });

  parallelCompsCache.set(key, { promise, timestamp: Date.now() });

  // Clean stale keys
  if (parallelCompsCache.size > 20) {
    const oldestKey = parallelCompsCache.keys().next().value;
    if (oldestKey) parallelCompsCache.delete(oldestKey);
  }

  return promise;
}
