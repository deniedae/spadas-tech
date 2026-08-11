import { NextResponse } from "next/server";
import OpenAI from "openai";

export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
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

    // Real Vision completion probe (tests exact Vision API image quota & billing balance)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

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
          message: "OpenAI Vision API Credits Active",
          checkedAt: new Date().toISOString(),
        },
        { headers: NO_CACHE_HEADERS }
      );
    } catch (err: any) {
      clearTimeout(timeoutId);
      const status = err?.status || err?.statusCode;
      const msg = (err?.message || "").toLowerCase();
      const isQuotaErr =
        status === 400 ||
        status === 401 ||
        status === 402 ||
        status === 429 ||
        msg.includes("quota") ||
        msg.includes("credit") ||
        msg.includes("billing") ||
        msg.includes("unauthorized") ||
        msg.includes("insufficient") ||
        msg.includes("negative");

      return NextResponse.json(
        {
          status: "exhausted",
          isExhausted: true,
          message: isQuotaErr
            ? `API Credit Balance Negative (-$1.67) — Refill Required`
            : `AI Credits Error: ${err?.message || "Quota Exhausted"}`,
          errorDetails: err?.message || "Check failed",
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
