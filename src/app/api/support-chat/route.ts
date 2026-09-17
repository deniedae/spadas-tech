import { NextRequest } from "next/server";
import { createOpenAiClient, getPrimaryAiApiKey } from "@/app/lib/config/ai-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_SUPPORT_PROMPT = `You are the Spadas Platform Support Specialist & Reseller Guide.
You assist resellers using Spadas Tech with inventory management, camera scanning, eBay Australian comps, subscription plans, and secondary market workflows.

PLATFORM KNOWLEDGE BASE:
1. SPADAS LENS & SCANNING:
   - Lens AR uses continuous object detection and OCR to identify thrifting items in real time.
   - Barcode mode checks GS1, UPC, and ISBN databases for fast media (books, video games, sealed items).
   - Liquid & Fragrance detection calculates fill levels and adjusts fair market value accordingly.

2. GEO-STRICT COMPS ENGINE & US FALLBACK:
   - Domestic AU Comps: When in Australia, Spadas strictly queries eBay Australia sold items (LH_PrefLoc=1) in AUD, excluding international sellers.
   - US Market Fallback: If fewer than 3 verified AU sales exist, Spadas automatically pulls high-liquidity US sold data, converts USD to AUD, factors in ~$25 AUD international air shipping friction, and highlights domestic scarcity pricing opportunities.

3. P&L & FEE CALCULATIONS:
   - Fair Market Value: Filtered via Interquartile Range (IQR) to exclude multi-packs and fake sales.
   - Net Profit Formula: Resale Price minus In-Store Tag Price minus eBay fees (13.4% + $0.33) minus postage.

4. 1-CLICK EBAY PUBLISHING & INVENTORY:
   - Direct OAuth connection to eBay AU allows 1-click drafts and live listing publishing.
   - Full inventory management with CSV/JSON exports and sales velocity tracking.

5. SUBSCRIPTIONS & CREDITS:
   - Starter: 100 scans per month.
   - Pro: Unlimited scans, Real-Time AI Copilot, Deep Comps Audit, and Priority Sourcing Radar.
   - Enterprise: Multi-seat teams and high-frequency webhook syncing.

COMMUNICATION STYLE:
- Friendly, professional, concise, and technically authoritative.
- Resellers want fast, direct solutions.
- If a user asks a complex technical bug question or wants a custom feature, suggest tapping the "[Request Developer Support]" button in the header so a human engineer can review it directly.`;

function generateHeuristicSupportReply(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("us") || q.includes("scarcity") || q.includes("american") || q.includes("fallback")) {
    return `🌐 **US-Only Comps & Scarcity:**\nWhen an item has fewer than 3 recorded sales on eBay Australia, Spadas automatically pulls US sold comps. We convert the USD price to AUD, deduct international shipping friction (~$25 AUD), and flag it as a **Domestic Scarcity Play**—meaning you can often charge an Australian premium because local supply is zero!`;
  }

  if (q.includes("comp") || q.includes("ebay") || q.includes("australia") || q.includes("price")) {
    return `🇦🇺 **Geo-Strict AU Comps:**\nFor Australian users, Spadas strictly filters for domestic eBay Australia sold items (\`LH_PrefLoc=1\`), excluding overseas sellers. We apply Interquartile Range (IQR) filtering to strip bulk lots and accidental outlier sales so your valuations reflect true realized cash value.`;
  }

  if (q.includes("profit") || q.includes("fee") || q.includes("calculate") || q.includes("formula")) {
    return `💰 **P&L Breakdown:**\nYour Net Profit = Fair Market Value − Tag Price − eBay AU Selling Fees (~13.4% + $0.33) − Estimated Domestic Postage. What you see is your true take-home cash.`;
  }

  if (q.includes("list") || q.includes("publish") || q.includes("draft")) {
    return `🛒 **1-Click eBay Listing:**\nConnect your eBay account in Settings, then tap "Publish to eBay" on any item in your Haul or Dashboard. Spadas pre-fills the optimized 80-character title, category, condition, and recommended price.`;
  }

  if (q.includes("plan") || q.includes("subscri") || q.includes("pro") || q.includes("credit")) {
    return `⚡ **Plans & Access:**\n• **Starter ($29/mo):** 100 AI scans/month\n• **Pro ($49/mo):** Unlimited scans, AI In-Aisle Copilot, Real-time Sold Comps, & 1-Click Publishing\nManage your subscription anytime in Settings > Billing.`;
  }

  if (q.includes("human") || q.includes("developer") || q.includes("bug") || q.includes("issue") || q.includes("help")) {
    return `👨‍💻 **Developer Support:**\nNeed technical assistance or found a bug? Tap **[Request Developer Support]** in the header above to notify our engineering team directly with your session details. We respond quickly!`;
  }

  return `Hello! I'm your Spadas Support & Platform Assistant. I can help with scanning techniques, eBay AU sold comp formulas, P&L calculations, and subscription management. How can I help you today?`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [] } = body;

    const latestUserMessage = messages[messages.length - 1]?.content || "";
    const openAiKey = getPrimaryAiApiKey();
    const encoder = new TextEncoder();

    if (openAiKey && openAiKey.length > 10 && !openAiKey.includes("placeholder")) {
      try {
        const openai = createOpenAiClient();

        const formattedMessages = [
          { role: "system" as const, content: SYSTEM_SUPPORT_PROMPT },
          ...messages.slice(-8).map((m: any) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: String(m.content || ""),
          })),
        ];

        const streamResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: formattedMessages,
          stream: true,
          max_tokens: 280,
          temperature: 0.4,
        });

        const customStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamResponse) {
                const text = chunk.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (err: any) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
              controller.close();
            }
          },
        });

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      } catch (aiErr: any) {
        console.warn("[Support Chat] OpenAI error, falling back to heuristic engine:", aiErr?.message);
      }
    }

    // High-speed fallback
    const fallbackText = generateHeuristicSupportReply(latestUserMessage);
    const words = fallbackText.split(" ");

    const fallbackStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunkWord = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkWord })}\n\n`));
          await new Promise((r) => setTimeout(r, 16));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(fallbackStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("[Support Chat] Request error:", err);
    return new Response(JSON.stringify({ error: err.message || "Support chat error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
