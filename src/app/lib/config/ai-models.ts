import OpenAI from "openai";

export const AR_SCAN_MODEL = "gpt-4o";
export const LISTING_MODEL = "gpt-4o";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-2024-08-06"];
export const LISTING_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-2024-08-06"];

/**
 * Returns active verified AI API key
 */
export function getPrimaryAiApiKey(): string {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    process.env.VERCEL_OPENAI_KEY ||
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
  const openAiKey = getPrimaryAiApiKey();
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_KEY;

  if (openAiKey && openAiKey.length > 10 && !openAiKey.includes("placeholder")) {
    return new OpenAI({
      apiKey: openAiKey,
    });
  }

  if (gatewayKey && gatewayKey.length > 10) {
    return new OpenAI({
      apiKey: gatewayKey,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });
  }

  return new OpenAI({
    apiKey: openAiKey || "sk-placeholder-key",
  });
}
