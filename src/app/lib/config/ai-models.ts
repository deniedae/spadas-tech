// Centralized OpenAI Model Target & API Key Provider Configuration
// Defines verified OpenAI production model families for vision scanning and listing generation

export const AR_SCAN_MODEL = "gpt-4o-mini";
export const LISTING_MODEL = "gpt-4o";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-4o-mini", "gpt-4o"];
export const LISTING_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-mini"];

/**
 * Returns active verified OpenAI API key (sk-proj-...)
 */
export function getPrimaryAiApiKey(): string {
  return process.env.OPENAI_API_KEY || "";
}
