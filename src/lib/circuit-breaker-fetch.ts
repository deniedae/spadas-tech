/**
 * Spadas Resilient Circuit Breaker & Abort Controller Engine
 * Ensures upstream AI/comps providers are strictly aborted when exceeding timeout thresholds,
 * records the exact abort reason, guarantees fallback is never returned prematurely,
 * and releases pending network sockets.
 */

export interface CircuitBreakerOptions<T> {
  timeoutMs: number;
  abortReason?: string;
  fallback: () => T | Promise<T>;
}

export interface CircuitBreakerExecutionResult<T> {
  result: T;
  source: "upstream" | "offline_fallback";
  durationMs: number;
  aborted: boolean;
  abortReason: string | null;
}

/**
 * Executes an async provider function with guaranteed AbortSignal timeout enforcement.
 */
export async function executeWithCircuitBreaker<T>(
  providerTask: (signal: AbortSignal) => Promise<T>,
  options: CircuitBreakerOptions<T>
): Promise<CircuitBreakerExecutionResult<T>> {
  const { timeoutMs, abortReason = "CIRCUIT_BREAKER_TIMEOUT", fallback } = options;
  const controller = new AbortController();
  const signal = controller.signal;

  let recordedAbortReason: string | null = null;
  signal.addEventListener("abort", () => {
    recordedAbortReason = typeof signal.reason === "string" ? signal.reason : String(signal.reason || abortReason);
  });

  const startTime = performance.now();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<CircuitBreakerExecutionResult<T>>((resolve) => {
    timerId = setTimeout(async () => {
      // 1. Trigger explicit abort with reason
      if (!signal.aborted) {
        controller.abort(abortReason);
      }

      const elapsed = performance.now() - startTime;
      const fallbackData = await fallback();

      resolve({
        result: fallbackData,
        source: "offline_fallback",
        durationMs: elapsed,
        aborted: true,
        abortReason: recordedAbortReason || abortReason,
      });
    }, timeoutMs);
  });

  const upstreamPromise = (async (): Promise<CircuitBreakerExecutionResult<T>> => {
    try {
      const data = await providerTask(signal);
      if (timerId) clearTimeout(timerId);

      return {
        result: data,
        source: "upstream",
        durationMs: performance.now() - startTime,
        aborted: false,
        abortReason: null,
      };
    } catch (err: any) {
      if (timerId) clearTimeout(timerId);

      // If aborted during flight, handle gracefully
      if (signal.aborted) {
        const fallbackData = await fallback();
        return {
          result: fallbackData,
          source: "offline_fallback",
          durationMs: performance.now() - startTime,
          aborted: true,
          abortReason: recordedAbortReason || abortReason,
        };
      }
      throw err;
    }
  })();

  return await Promise.race([upstreamPromise, timeoutPromise]);
}
