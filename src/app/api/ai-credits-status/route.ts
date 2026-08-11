if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getPrimaryAiApiKey } from "@/app/lib/config/ai-models";

export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const apiKey = getPrimaryAiApiKey();
    if (!apiKey || apiKey.startsWith("sk-proj-placeholder")) {
      return NextResponse.json(
        {
          status: "exhausted",
          isExhausted: true,
          message: "API Key missing or placeholder",
          checkedAt: new Date().toISOString(),
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Real Vision completion probe (tests exact Vision API image quota & billing balance)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "vision test" },
                {
                  type: "image_url",
                  image_url: {
                    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                    detail: "low",
                  },
                },
              ],
            },
          ],
          max_tokens: 5,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          status: "active",
          isExhausted: false,
          message: "OpenAI Vision API Credits Active & Online",
          checkedAt: new Date().toISOString(),
        },
        { headers: NO_CACHE_HEADERS }
      );
    } catch (err: any) {
      clearTimeout(timeoutId);
      const status = err?.status || err?.statusCode;
      const msg = (err?.message || "").toLowerCase();
      const code = err?.code || err?.error?.code || "";

      // Exclude 429 Rate Limits, AbortErrors, or 400 parameter errors from credit exhaustion
      const isRateOrTimeout =
        status === 429 ||
        err?.name === "AbortError" ||
        code === "rate_limit_exceeded" ||
        msg.includes("rate limit") ||
        msg.includes("rate_limit_exceeded");

      if (isRateOrTimeout) {
        return NextResponse.json(
          {
            status: "active",
            isExhausted: false,
            message: "OpenAI API Active (Transient Rate Limit Pause)",
            checkedAt: new Date().toISOString(),
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      const isStrictQuotaErr =
        status === 401 ||
        status === 402 ||
        code === "insufficient_quota" ||
        code === "invalid_api_key" ||
        msg.includes("insufficient_quota") ||
        msg.includes("invalid_api_key") ||
        msg.includes("credit balance") ||
        msg.includes("billing");

      return NextResponse.json(
        {
          status: isStrictQuotaErr ? "exhausted" : "active",
          isExhausted: isStrictQuotaErr,
          message: isStrictQuotaErr
            ? `API Credit Balance Negative / Quota Exhausted`
            : `AI Status Online: ${err?.message || "Active"}`,
          errorDetails: err?.message || "Check complete",
          checkedAt: new Date().toISOString(),
        },
        { headers: NO_CACHE_HEADERS }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "exhausted",
        isExhausted: true,
        message: "AI Credits Check Failed",
        checkedAt: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
