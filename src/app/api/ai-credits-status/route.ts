import { NextResponse } from "next/server";
import OpenAI from "openai";

export const preferredRegion = "syd1";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith("sk-proj-placeholder")) {
      return NextResponse.json({
        status: "exhausted",
        isExhausted: true,
        message: "API Key missing or placeholder",
        checkedAt: new Date().toISOString(),
      });
    }

    // Fast 1-token health check with 2.5s circuit breaker
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      await openai.models.list({ signal: controller.signal });
      clearTimeout(timeoutId);
      return NextResponse.json({
        status: "active",
        isExhausted: false,
        message: "OpenAI API Credits Active",
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      const status = err?.status || err?.statusCode;
      const msg = (err?.message || "").toLowerCase();
      const isQuotaErr =
        status === 401 ||
        status === 402 ||
        status === 429 ||
        msg.includes("quota") ||
        msg.includes("credit") ||
        msg.includes("billing") ||
        msg.includes("unauthorized") ||
        msg.includes("insufficient");

      return NextResponse.json({
        status: isQuotaErr ? "exhausted" : "active",
        isExhausted: isQuotaErr,
        message: isQuotaErr ? "AI Credits Depleted (401/402/429 Quota Error)" : "API Connected",
        errorDetails: err?.message || "Check failed",
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      status: "exhausted",
      isExhausted: true,
      message: "AI Credits Check Failed",
      checkedAt: new Date().toISOString(),
    });
  }
}
