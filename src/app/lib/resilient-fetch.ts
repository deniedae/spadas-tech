/**
 * Resilient Fetch Engine with Exponential Backoff & Jitter
 * Handles network drops in low-reception thrift store basements by automatically retrying failed requests.
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 2500;
  const backoffFactor = options.backoffFactor ?? 2;

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(input, init);

      // Retry on transient server errors (502, 503, 504) or rate limits (429)
      if (response.status === 429 || (response.status >= 502 && response.status <= 504)) {
        if (attempt === maxRetries) return response;

        const jitter = Math.random() * 150;
        const delay = Math.min(maxDelayMs, initialDelayMs * Math.pow(backoffFactor, attempt) + jitter);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        continue;
      }

      return response;
    } catch (err: any) {
      // AbortError should not be retried
      if (err?.name === "AbortError") throw err;

      if (attempt === maxRetries) throw err;

      const jitter = Math.random() * 150;
      const delay = Math.min(maxDelayMs, initialDelayMs * Math.pow(backoffFactor, attempt) + jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw new Error("Resilient fetch exceeded maximum retry attempts.");
}
