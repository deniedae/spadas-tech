import OpenAI from "openai";

export const AR_SCAN_MODEL = "gpt-4o-mini";
export const LISTING_MODEL = "gpt-4o";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-4o-mini", "gpt-4o"];
export const LISTING_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-mini"];

/**
 * Returns active verified AI API key
 */
export function getPrimaryAiApiKey(): string {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_AI_KEY ||
    ""
  );
}

/**
 * Factory function to instantiate OpenAI client with direct OpenAI key priority
 * and seamless Vercel AI Gateway fallback
 */
export function createOpenAiClient(): OpenAI {
  const openAiKey = process.env.OPENAI_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_KEY;

  // Prioritize direct OpenAI Key (sk-proj-...) to bypass Vercel AI Gateway 403 credit card requirement
  if (openAiKey && openAiKey.startsWith("sk-proj-") && !openAiKey.includes("placeholder")) {
    return new OpenAI({
      apiKey: openAiKey,
    });
  }

  if (gatewayKey && gatewayKey.startsWith("vck_")) {
    return new OpenAI({
      apiKey: gatewayKey,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });
  }

  return new OpenAI({
    apiKey: openAiKey || "sk-proj-placeholder",
  });
}
