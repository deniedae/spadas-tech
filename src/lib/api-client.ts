export interface SafeFetchResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Robust fetch wrapper for client-side API requests.
 * Safely parses JSON, handles non-200 responses, handles non-JSON error pages,
 * and intercepts network disconnects without throwing unhandled exceptions.
 */
export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResponse<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get("content-type");

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        data: null,
        error: errData.error || errData.message || `Request failed with status ${res.status}`,
        status: res.status,
      };
    }

    if (contentType && !contentType.includes("application/json")) {
      const text = await res.text();
      return {
        data: null,
        error: res.ok ? null : `Server returned non-JSON (${res.status}): ${text.slice(0, 100)}`,
        status: res.status,
      };
    }

    const data = (await res.json()) as T;
    return { data, error: null, status: res.status };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Network connectivity error",
      status: 0,
    };
  }
}
