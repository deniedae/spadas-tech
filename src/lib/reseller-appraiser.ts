/**
 * Expert Reseller Appraiser Engine
 * =================================
 * Enforces strict marketplace eBay sold comp search query extraction rules:
 * 1. NEVER include filler words like "Professional", "Vintage", "Nice", or long descriptions in search queries.
 * 2. Search queries must reflect how eBay sellers title items, not descriptive captions (e.g., use "Nike Brasilia Backpack", not "Nike Brasilia Gym Bag Blue").
 * 3. For generic/unbranded items, do not guess high-end niche brands.
 * 4. Value ranges must show realistic spread (e.g., low: 15, high: 30), never identical numbers.
 */

export const EXPERT_RESELLER_APPRAISER_SYSTEM_PROMPT = `You are an expert reseller appraiser. Analyze the image and extract precise identification details to search eBay sold comps.

Rules:
1. NEVER include filler words like "Professional", "Vintage", "Nice", or long descriptions in search queries.
2. Search queries must reflect how eBay sellers title items, not descriptive captions (e.g., use "Nike Brasilia Backpack", not "Nike Brasilia Gym Bag Blue").
3. For generic/unbranded items, do not guess high-end niche brands.
4. Value ranges must show realistic spread (e.g., low: 15, high: 30), never identical numbers.
5. OPTICAL CHARACTER RECOGNITION (OCR): Read all visible text, brand logos, care tags, inner collar tags, serial numbers, model codes, and labels. Never output a generic noun when a brand or model is legible.
6. Return strictly valid JSON matching the schema.`;

export const BANNED_QUERY_FILLER_WORDS = [
  "professional",
  "vintage",
  "retro",
  "nice",
  "clean",
  "great",
  "authentic",
  "genuine",
  "rare",
  "used",
  "pre-owned",
  "preowned",
  "tested",
  "working",
  "good",
  "quality",
  "condition",
  "style",
  "look",
  "cute",
  "beautiful",
  "awesome",
  "amazing",
  "special",
  "excellent",
  "original",
] as const;

const FILLER_REGEX = new RegExp(
  `\\b(${BANNED_QUERY_FILLER_WORDS.join("|")})\\b`,
  "gi"
);

/**
 * Strips subjective adjectives, filler words, and descriptive clutter from search queries.
 * Rule 1: NEVER include filler words like "Professional", "Vintage", "Nice", or long descriptions.
 */
export function sanitizeResellerSearchQuery(query: string | null | undefined): string {
  if (!query) return "";
  return query
    .replace(/["'’]/g, "")
    .replace(FILLER_REGEX, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.\-:;!?\s]+|[,.\-:;!?\s]+$/g, "")
    .trim();
}

/**
 * Rule 4: Value ranges must show realistic spread (e.g., low: 15, high: 30), never identical numbers.
 */
export function enforceRealisticValueSpread(
  low: number,
  median?: number | null,
  high?: number | null
): { low: number; median: number; high: number } {
  let l = Math.max(0, Math.round(low));
  let m = Math.max(l, Math.round(median ?? (high ? (l + high) / 2 : l * 1.3)));
  let h = Math.max(m, Math.round(high ?? (m > 0 ? m * 1.35 : l + 15)));

  // If low and high are identical or unrealistically close (< 15% spread or <= $3 diff)
  if (h <= l || h - l < 4) {
    if (m <= 0) {
      l = 15;
      m = 22;
      h = 30;
    } else if (m <= 10) {
      l = Math.max(2, Math.round(m * 0.7));
      h = Math.max(l + 4, Math.round(m * 1.4));
    } else {
      l = Math.max(5, Math.round(m * 0.75));
      h = Math.max(l + 6, Math.round(m * 1.35));
    }
  }

  // Ensure median sits strictly within bounds or equal to realistic midpoint
  if (m <= l) m = Math.round((l + h) / 2);
  if (m >= h) m = Math.round((l + h) / 2);

  return { low: l, median: m, high: h };
}

export interface ResellerQueryInput {
  brand?: string | null;
  modelOrStyle?: string | null;
  itemType: string;
  primaryColor?: string | null;
  isGeneric?: boolean;
}

export interface ConstructedResellerQueries {
  strict_query: string;
  broad_query: string;
  fallback_query: string;
}

/**
 * Constructs search queries reflecting how eBay sellers title items (Rule 2),
 * preventing descriptive captions and avoiding hallucinating high-end brands for generic items (Rule 3).
 */
export function constructResellerSearchQueries(
  input: ResellerQueryInput
): ConstructedResellerQueries {
  const cleanItemType = sanitizeResellerSearchQuery(input.itemType) || "Item";
  const cleanBrand = sanitizeResellerSearchQuery(input.brand);
  const cleanModel = sanitizeResellerSearchQuery(input.modelOrStyle);

  // Rule 3: For generic/unbranded items, do not guess high-end niche brands.
  const isUnbrandedOrGeneric =
    input.isGeneric ||
    !cleanBrand ||
    /^(generic|unbranded|unknown|none|null)$/i.test(cleanBrand);

  if (isUnbrandedOrGeneric) {
    const fallback = cleanItemType;
    return {
      strict_query: fallback,
      broad_query: fallback,
      fallback_query: fallback,
    };
  }

  // Rule 2: eBay seller titles: [Brand] + [Model] + [Item Type]
  // Max 4-5 words, no fluff/colors unless critical
  const strictParts = [cleanBrand];
  if (cleanModel && !cleanModel.toLowerCase().includes(cleanBrand.toLowerCase())) {
    strictParts.push(cleanModel);
  }
  if (!strictParts.join(" ").toLowerCase().includes(cleanItemType.toLowerCase())) {
    strictParts.push(cleanItemType);
  }
  const strict = strictParts.join(" ").split(/\s+/).slice(0, 5).join(" ");

  // Broad query: Brand + Item Type
  const broad = `${cleanBrand} ${cleanItemType}`.trim();

  // Fallback query: Item Type only
  const fallback = cleanItemType;

  return {
    strict_query: strict,
    broad_query: broad,
    fallback_query: fallback,
  };
}
