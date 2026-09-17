import { NextRequest } from "next/server";
import { createOpenAiClient, getPrimaryAiApiKey } from "@/app/lib/config/ai-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ItemChatContext {
  title: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  tag_price?: number;
  fair_market_price?: number;
  estimated_net?: number;
  comps?: Array<{ title: string; price: number; date?: string }>;
  liquid_notes?: string;
}

function buildSystemPrompt(ctx: ItemChatContext): string {
  const compsSummary = (ctx.comps || [])
    .slice(0, 3)
    .map((c, i) => `  ${i + 1}. "${c.title}" - $${c.price} AUD`)
    .join("\n") || "  (No direct comps found)";

  return `You are Spadas Copilot, an elite in-store resale sourcing advisor for eBay Australia & secondary marketplaces.
The reseller is standing in a thrift store aisle holding this scanned item and needs immediate, decisive guidance.

ITEM SNAPSHOT:
- Product: ${ctx.title || "Scanned Item"}
- Brand: ${ctx.brand || "Unbranded / Unknown"}
- Category: ${ctx.category || "General"}
- Condition: ${ctx.condition || "Used - Good"}
- In-Store Tag Cost: $${ctx.tag_price ?? 10} AUD
- Fair Market Value: $${ctx.fair_market_price ?? 45} AUD
- Projected True Net Profit: $${ctx.estimated_net ?? 20} AUD
${ctx.liquid_notes ? `- Bottle / Liquid Status: ${ctx.liquid_notes}\n` : ""}- Recent Sold Comps:
${compsSummary}

STRICT OPERATIONAL RULES:
1. PUNCHY & BRIEF: Maximum 75 words total per response. Resellers are in a rush.
2. DECISIVE: Start directly with the action (COP, PASS, or COUNTER-OFFER).
3. PRACTICAL: Mention specific physical flaws to inspect or best platform (e.g., eBay vs FB Marketplace).
4. ZERO FLUFF: No greetings, no throat-clearing, no repeating the full item title.`;
}

function generateOfflineHeuristicResponse(query: string, ctx: ItemChatContext): string {
  const q = query.toLowerCase();
  const net = Number(ctx.estimated_net) || 15;
  const tag = Number(ctx.tag_price) || 10;
  const market = Number(ctx.fair_market_price) || 40;
  const title = ctx.title || "Item";

  if (q.includes("fair") || q.includes("price") || q.includes("worth")) {
    return `At $${tag} tag price against a $${market} market median, your take-home net is ~$${net}. If margin is over $15, it's a solid buy. Try to negotiate down to $${Math.max(2, Math.round(tag * 0.75))} for extra cushion.`;
  }
  if (q.includes("flip") || q.includes("hold") || q.includes("fast")) {
    if (net >= 25) {
      return `Fast flip. List on eBay AU as Buy It Now at $${Math.round(market * 0.95)} for a quick sale within 7–14 days. Demand is active.`;
    }
    return `Marginal flip. Take-home net is $${net}. List at $${market} and accept offers at $${Math.round(market * 0.85)}.`;
  }
  if (q.includes("flaw") || q.includes("inspect") || q.includes("check")) {
    if (ctx.liquid_notes || (ctx.category || "").toLowerCase().includes("fragrance")) {
      return `Check atomizer spray function, examine bottle neck for hairline cracks, smell test for rancidity, and verify batch code on the base.`;
    }
    return `Inspect corners and edges for chips/scuffs, verify brand hallmark/serial tags, check for missing accessories or cables, and test moving mechanisms.`;
  }
  if (q.includes("where") || q.includes("platform") || q.includes("sell")) {
    if (net >= 30) {
      return `eBay Australia for maximum reach and buyer protections. If bulky or fragile, list on FB Marketplace cash on pickup for zero fees.`;
    }
    return `eBay AU for fastest liquidity. Crosspost to FB Marketplace at $${market} cash on pickup.`;
  }

  if (net >= 20) {
    return `COP. Sells for ~$${market} with healthy +$${net} net profit after postage and fees. Inspect physical condition and list immediately.`;
  }
  return `PASS or negotiate. Projected net of $${net} on a $${tag} buy is too thin for the risk. Offer $${Math.max(2, Math.round(tag * 0.6))} or leave it.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [], itemContext = {} } = body;

    const latestUserMessage = messages[messages.length - 1]?.content || "";
    const systemPrompt = buildSystemPrompt(itemContext);
    const openAiKey = getPrimaryAiApiKey();

    const encoder = new TextEncoder();

    // 1. If OpenAI API key is available, use real-time streaming (< 300ms TTFT)
    if (openAiKey && openAiKey.length > 10 && !openAiKey.includes("placeholder")) {
      try {
        const openai = createOpenAiClient();

        const formattedMessages = [
          { role: "system" as const, content: systemPrompt },
          ...messages.slice(-6).map((m: any) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: String(m.content || ""),
          })),
        ];

        const streamResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: formattedMessages,
          stream: true,
          max_tokens: 180,
          temperature: 0.3,
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
        console.warn("[Copilot Chat] Streaming error, falling back to heuristic engine:", aiErr?.message);
      }
    }

    // 2. High-Speed Synthetic Streaming Fallback (0ms latency, works offline / without key)
    const fallbackText = generateOfflineHeuristicResponse(latestUserMessage, itemContext);
    const words = fallbackText.split(" ");

    const fallbackStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunkWord = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkWord })}\n\n`));
          // Quick 18ms spacing to emulate natural real-time streaming
          await new Promise((r) => setTimeout(r, 18));
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
    console.error("[Copilot Chat] Request error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
