// Centralized OpenAI Model Target & API Key Provider Configuration
// Defines verified OpenAI production model families for vision scanning and listing generation

export const AR_SCAN_MODEL = "gpt-4o-mini";
export const LISTING_MODEL = "gpt-4o";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-4o-mini", "gpt-4o"];
export const LISTING_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-mini"];

/**
 * Returns active API key prioritizing Unlimited Ling / Vercel AI Key (vck_...)
 * with automatic fallback to standard OpenAI key (sk-proj-...)
 */
export function getPrimaryAiApiKey(useFallback = false): string {
  const lingKey = process.env.VERCEL_AI_KEY || process.env.LING_API_KEY;
  const standardKey = process.env.OPENAI_API_KEY;

  if (useFallback) {
    return standardKey || lingKey || "";
  }

  // Prioritize Unlimited Ling / Vercel Key
  return lingKey || standardKey || "";
}
