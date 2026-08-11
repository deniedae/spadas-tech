// Centralized OpenAI Model Target Configuration
// Defines verified OpenAI production model families for vision scanning and listing generation

export const AR_SCAN_MODEL = "gpt-4o-mini";
export const LISTING_MODEL = "gpt-4o";

export const AR_SCAN_MODEL_FALLBACKS = ["gpt-4o-mini", "gpt-4o"];
export const LISTING_MODEL_FALLBACKS = ["gpt-4o", "gpt-4o-mini"];
