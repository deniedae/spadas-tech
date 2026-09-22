/**
 * eBay Title Generator
 * ====================
 * Pattern-based, zero-LLM eBay listing title builder.
 *
 * Pattern: [Brand] [Model] [Size/Variant] [Condition keyword] [2–3 buyer search terms]
 * Hard cap: 80 characters.
 * Drop order on overflow: search terms → variant → never brand/model.
 *
 * Input: a subset of ProductAnalysis (brand, model, category, condition,
 *        colour, size, suggestedKeywords) — same shape the vision pipeline returns.
 * Output: { title, charCount, droppedTokens, brandUnknown }
 */

import type { ProductAnalysis } from "@/types/ai-listing";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EbayTitleInput {
  brand?: string | null;
  model?: string | null;
  category: string;
  condition?: string | null;
  color?: string | null;
  size?: string | null;
  /** Raw keywords surfaced by the vision model */
  suggestedKeywords?: string[];
}

export interface EbayTitleResult {
  title: string;
  charCount: number;
  /** Tokens that were cut to fit under 80 chars */
  droppedTokens: string[];
  /** True when brand could not be determined — UI should prompt the user */
  brandUnknown: boolean;
}

// ---------------------------------------------------------------------------
// Condition normalisation map
// ---------------------------------------------------------------------------

const CONDITION_MAP: Record<string, string> = {
  // eBay canonical values (already correct)
  new: "New",
  "new with tags": "New with tags",
  "new with defects": "New with defects",
  "pre-owned": "Pre-owned",
  preowned: "Pre-owned",
  "pre owned": "Pre-owned",
  used: "Used",
  "for parts": "For parts",
  "for parts or not working": "For parts",
  "not working": "For parts",
  faulty: "For parts",
  refurbished: "Refurbished",
  // Internal inventory condition aliases
  untested: "For parts",
  faulty_for_parts: "For parts",
  used_working: "Used",
  // Condition grade aliases
  mint: "New",
  good: "Used",
  fair: "Used",
};

function normaliseCondition(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return CONDITION_MAP[key] ?? null;
}

// ---------------------------------------------------------------------------
// Category → buyer search-term sets
// (max 3 are selected; deduped against tokens already in the title)
// ---------------------------------------------------------------------------

const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  // Footwear
  sneakers: ["sneakers", "shoes", "trainers"],
  shoes: ["shoes", "sneakers", "footwear"],
  boots: ["boots", "shoes", "footwear"],
  heels: ["heels", "shoes", "pumps"],
  sandals: ["sandals", "shoes", "thongs"],
  // Clothing
  jacket: ["jacket", "coat", "outerwear"],
  hoodie: ["hoodie", "sweatshirt", "jumper"],
  shirt: ["shirt", "top", "tee"],
  tshirt: ["tshirt", "shirt", "top"],
  "t-shirt": ["t-shirt", "shirt", "top"],
  jeans: ["jeans", "denim", "pants"],
  pants: ["pants", "trousers", "bottoms"],
  dress: ["dress", "frock", "gown"],
  skirt: ["skirt", "mini", "midi"],
  shorts: ["shorts", "pants", "bottoms"],
  // Bags & accessories
  bag: ["bag", "handbag", "purse"],
  handbag: ["handbag", "bag", "purse"],
  backpack: ["backpack", "bag", "rucksack"],
  wallet: ["wallet", "purse", "billfold"],
  hat: ["hat", "cap", "headwear"],
  cap: ["cap", "hat", "snapback"],
  sunglasses: ["sunglasses", "glasses", "eyewear"],
  // Electronics
  phone: ["phone", "smartphone", "mobile"],
  smartphone: ["smartphone", "phone", "mobile"],
  laptop: ["laptop", "notebook", "computer"],
  tablet: ["tablet", "ipad", "device"],
  headphones: ["headphones", "earphones", "audio"],
  earbuds: ["earbuds", "earphones", "wireless"],
  watch: ["watch", "smartwatch", "timepiece"],
  camera: ["camera", "digital", "photography"],
  console: ["console", "gaming", "games"],
  // Collectibles / media
  vinyl: ["vinyl", "record", "lp"],
  cd: ["cd", "album", "music"],
  dvd: ["dvd", "movie", "film"],
  "blu-ray": ["blu-ray", "bluray", "movie"],
  book: ["book", "novel", "paperback"],
  comic: ["comic", "manga", "collectible"],
  // Sports
  jersey: ["jersey", "shirt", "kit"],
  // Jewellery
  necklace: ["necklace", "jewellery", "pendant"],
  ring: ["ring", "jewellery", "band"],
  bracelet: ["bracelet", "bangle", "jewellery"],
  earrings: ["earrings", "jewellery", "studs"],
  // Toys
  lego: ["lego", "building", "set"],
  toy: ["toy", "kids", "play"],
  // Default (used when category not matched)
  _default: [],
};

function getSearchTerms(category: string): string[] {
  const key = category.toLowerCase().trim();
  if (CATEGORY_SEARCH_TERMS[key]) return CATEGORY_SEARCH_TERMS[key];
  for (const [k, terms] of Object.entries(CATEGORY_SEARCH_TERMS)) {
    if (k === "_default") continue;
    if (key.includes(k) || k.includes(key)) return terms;
  }
  return CATEGORY_SEARCH_TERMS._default;
}

// ---------------------------------------------------------------------------
// Size / variant normalisation
// ---------------------------------------------------------------------------

/**
 * Formats the raw size string into buyer-readable form.
 * e.g. "10", "US10" → "US 10"; "large" → "Large"; "128gb" → "128GB"
 */
function normaliseSize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // US shoe size: "10", "10.5", "US10", "US 10"
  const usShoe = s.match(/^(?:us\s?)?(\d{1,2}(?:\.\d)?)$/i);
  if (usShoe) return `US ${usShoe[1]}`;

  // EU shoe size: "EU42", "42EU"
  const euShoe = s.match(/^eu\s?(\d{2})$/i) ?? s.match(/^(\d{2})\s?eu$/i);
  if (euShoe) return `EU ${euShoe[1]}`;

  // UK shoe size
  const ukShoe = s.match(/^uk\s?(\d{1,2}(?:\.\d)?)$/i);
  if (ukShoe) return `UK ${ukShoe[1]}`;

  // Storage / tech sizes: "128gb", "256 GB"
  const storage = s.match(/^(\d+)\s?(gb|tb|mb)$/i);
  if (storage) return `${storage[1]}${storage[2].toUpperCase()}`;

  // Clothing sizes: XS, S, M, L, XL, XXL, etc.
  if (/^(x{0,3}s|x{0,3}l|xs|sm|md|lg|xl|xxl|xxxl|small|medium|large|x-large|extra large|extra-large)$/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  // Fallback: return as-is
  return s;
}

// ---------------------------------------------------------------------------
// Token cleaning helpers
// ---------------------------------------------------------------------------

/** Remove emojis from a string */
function stripEmojis(s: string): string {
  return s.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu,
    ""
  );
}

/**
 * Strip ranking-toxic tokens:
 * - Special-character sequences (L@@K, !!!SALE!!!, etc.)
 * - Emojis
 * - ALL-CAPS sequences ≥4 chars (preserves known 2–3-char acronyms like LG, IBM, etc.)
 */
function stripToxicTokens(s: string): string {
  // Remove strings with special chars used as leet replacements (2+ special chars in a word)
  s = s.replace(/\b\w*[@#$!*]{2,}\w*\b/g, "");
  s = stripEmojis(s);
  // Lowercase ALL-CAPS words ≥4 chars (title-case them instead)
  s = s.replace(/\b([A-Z]{4,})\b/g, (match) => {
    return match.charAt(0) + match.slice(1).toLowerCase();
  });
  return s.trim();
}

/** Remove exact duplicate adjacent words (case-insensitive) */
function dedupeAdjacentWords(s: string): string {
  const words = s.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      out.push(words[i]);
    }
  }
  return out.join(" ");
}

/**
 * Remove all duplicate words anywhere in the title (case-insensitive).
 * First occurrence wins.
 */
function dedupeAllWords(s: string): string {
  const words = s.split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(w);
    }
  }
  return out.join(" ");
}

/** Final polish: collapse multiple spaces, strip trailing punctuation */
function polish(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")       // collapse double spaces
    .replace(/[,.\-:;!?]+$/, "")    // strip trailing punctuation
    .trim();
}

// ---------------------------------------------------------------------------
// Title assembly
// ---------------------------------------------------------------------------

const MAX_CHARS = 80;

/**
 * Generates an eBay-optimised listing title (no LLM).
 *
 * @param input - Vision output fields.
 * @returns { title, charCount, droppedTokens, brandUnknown }
 */
export function generateEbayTitle(input: EbayTitleInput): EbayTitleResult {
  const droppedTokens: string[] = [];

  // 1. Brand
  const rawBrand = input.brand?.trim() ?? null;
  const brandUnknown = !rawBrand;
  const brand = rawBrand ? stripToxicTokens(rawBrand) : null;

  // 2. Model
  const rawModel = input.model?.trim() ?? null;
  const model = rawModel ? stripToxicTokens(rawModel) : null;

  // 3. Size / Variant (prefer explicit size, fall back to colour as a variant token)
  const variant = normaliseSize(input.size) ?? (input.color?.trim() || null);

  // 4. Condition keyword
  const conditionKeyword = normaliseCondition(input.condition);

  // 5. Candidate search terms from category keyword set + vision keywords
  const allCategoryTerms = getSearchTerms(input.category);
  const visionKeywords = (input.suggestedKeywords ?? []).map((k) => k.toLowerCase().trim());
  const candidateSearchTerms = [...new Set([...allCategoryTerms, ...visionKeywords])];

  // 6. Build mandatory core: [Brand] [Model]
  //    If brand is unknown, use the category as the leading token.
  const brandToken = brand ?? input.category;
  const coreParts: string[] = [brandToken];
  if (model) coreParts.push(model);

  let titleTokens: string[] = [...coreParts];
  if (variant) titleTokens.push(variant);
  if (conditionKeyword) titleTokens.push(conditionKeyword);

  // 7. Dedupe search terms against tokens already in the title
  const titleWords = new Set(
    titleTokens.flatMap((t) => t.toLowerCase().split(/\s+/))
  );

  const searchTermsAdded: string[] = [];
  for (const term of candidateSearchTerms) {
    if (searchTermsAdded.length >= 3) break;
    const termWords = term.toLowerCase().split(/\s+/);
    // Skip if every word of the term is already present
    const alreadyPresent = termWords.every((w) => titleWords.has(w));
    if (!alreadyPresent) {
      searchTermsAdded.push(term);
      termWords.forEach((w) => titleWords.add(w));
    }
  }

  titleTokens = [...titleTokens, ...searchTermsAdded];

  // 8. Remove duplicate words across the full assembled title
  titleTokens = dedupeAllWords(dedupeAdjacentWords(titleTokens.join(" "))).split(/\s+/);

  // 9. Enforce 80-char hard cap
  function assemble(tokens: string[]): string {
    return polish(tokens.join(" "));
  }

  // Fast path — already fits
  if (assemble(titleTokens).length <= MAX_CHARS) {
    const title = assemble(titleTokens);
    return { title, charCount: title.length, droppedTokens, brandUnknown };
  }

  // Drop search terms one by one (last-added first)
  const working = [...titleTokens];
  for (let i = searchTermsAdded.length - 1; i >= 0; i--) {
    const term = searchTermsAdded[i];
    const termWords = term.split(/\s+/);
    for (const word of termWords) {
      const idx = working.map((w) => w.toLowerCase()).lastIndexOf(word.toLowerCase());
      if (idx !== -1) droppedTokens.push(working.splice(idx, 1)[0]);
    }
    if (assemble(working).length <= MAX_CHARS) {
      const title = assemble(working);
      return { title, charCount: title.length, droppedTokens, brandUnknown };
    }
  }

  // Drop variant
  if (variant) {
    const variantWords = variant.split(/\s+/);
    for (const word of variantWords) {
      const idx = working.map((w) => w.toLowerCase()).lastIndexOf(word.toLowerCase());
      if (idx !== -1) droppedTokens.push(working.splice(idx, 1)[0]);
    }
    if (assemble(working).length <= MAX_CHARS) {
      const title = assemble(working);
      return { title, charCount: title.length, droppedTokens, brandUnknown };
    }
  }

  // Last resort: word-boundary truncation (only fires if brand+model alone > 80 chars)
  const assembled = assemble(working);
  if (assembled.length > MAX_CHARS) {
    const truncated = assembled.slice(0, MAX_CHARS).trimEnd();
    const lastSpace = truncated.lastIndexOf(" ");
    const safeTitle = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    droppedTokens.push(`[overflow: "${assembled.slice(safeTitle.length).trim()}"]`);
    return { title: safeTitle, charCount: safeTitle.length, droppedTokens, brandUnknown };
  }

  const title = assembled;
  return { title, charCount: title.length, droppedTokens, brandUnknown };
}

// ---------------------------------------------------------------------------
// Convenience adapter — accepts a full ProductAnalysis directly
// ---------------------------------------------------------------------------

export function generateEbayTitleFromAnalysis(
  analysis: ProductAnalysis,
  overrides?: Partial<EbayTitleInput>
): EbayTitleResult {
  return generateEbayTitle({
    brand: analysis.brand,
    model: analysis.model,
    category: analysis.category,
    condition: analysis.condition,
    color: analysis.color,
    size: null, // ProductAnalysis has no top-level size; supply via overrides
    suggestedKeywords: [],
    ...overrides,
  });
}
