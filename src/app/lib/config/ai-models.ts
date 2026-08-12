// Centralized OpenAI Model Target & API Key Provider Configuration
// Defines verified OpenAI production model families for vision scanning and listing generation

export const AR_SCAN_MODEL = "gpt-4o-mini";
export const LISTING_MODEL = "gpt-4o";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-4o-mini", "gpt-4o"];
export const LISTING_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-mini"];

/**
 * Returns active verified AI API key (AI Gateway, Vercel AI, or OpenAI)
 */
export function getPrimaryAiApiKey(): string {
  return (
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_AI_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}
