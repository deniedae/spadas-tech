// Centralized OpenAI Model Target Configuration
// Defines model families for low-latency AR vision scanning and high-reasoning listing generation

export const AR_SCAN_MODEL = "gpt-5.6-luna";
export const LISTING_MODEL = "gpt-5.6-terra";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-5.6-luna", "gpt-4o-mini"];
export const LISTING_MODEL_FALLBACKS = ["gpt-5.6-terra", "gpt-4o", "gpt-4o-mini"];
