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
  is_us_market_only?: boolean;
  us_median_usd?: number;
  arbitrage_signal?: string;
  sell_through_rate?: string | number;
  liquidity_speed?: string;
}

function formatChatAUD(val: number | string | null | undefined, includePlus = false): string {
  if (typeof val === "string") val = val.replace(/[^0-9.-]+/g, "");
  const num = Number(val) || 0;
  if (num < 0) return `-$${Math.abs(num).toFixed(2)}`;
  return includePlus ? `+$${num.toFixed(2)}` : `$${num.toFixed(2)}`;
}

function buildSystemPrompt(ctx: ItemChatContext): string {
  const compsSummary = (ctx.comps || [])
    .slice(0, 3)
    .map((c, i) => `  ${i + 1}. "${c.title}" - ${formatChatAUD(c.price)} AUD`)
    .join("\n") || "  (No direct comps found)";

  const regionalAlert = ctx.is_us_market_only
    ? `\nREGIONAL COMPS ALERT:
- US-ONLY FALLBACK ACTIVE: No domestic Australian sold comps exist on record.
- Comps shown originate from the US market (~$${ctx.us_median_usd || 0} USD converted to ~${formatChatAUD(ctx.fair_market_price)} AUD).
- ARBITRAGE GUIDANCE: Advise the user on domestic scarcity (setting a premium Buy-It-Now price in Australia due to zero local supply) or cross-border international export (accounting for ~$25 AUD tracked international air shipping).`
    : `\nREGIONAL CONTEXT: Domestic eBay Australia comps verified. Reseller is operating in Australia.`;

  return `You are Spadas Copilot, an elite in-store resale sourcing advisor for eBay Australia & secondary marketplaces.
The reseller is standing in a thrift store aisle holding this scanned item and needs immediate, decisive guidance.

ITEM SNAPSHOT:
- Product: ${ctx.title || "Scanned Item"}
- Brand: ${ctx.brand || "Unbranded / Unknown"}
- Category: ${ctx.category || "General"}
- Condition: ${ctx.condition || "Used - Good"}
- In-Store Tag Cost: ${formatChatAUD(ctx.tag_price ?? 10)} AUD
- Fair Market Value: ${formatChatAUD(ctx.fair_market_price ?? 45)} AUD
- Projected True Net Profit: ${formatChatAUD(ctx.estimated_net ?? 20, true)} AUD
- Sell-Through Rate (STR): ${ctx.sell_through_rate || "Moderate"}
- Liquidity Speed: ${ctx.liquidity_speed || "MODERATE"}
${ctx.liquid_notes ? `- Bottle / Liquid Status: ${ctx.liquid_notes}\n` : ""}- Recent Sold Comps:
${compsSummary}
${regionalAlert}

PROACTIVE STRATEGIC CAPABILITIES:
1. TITLE OPTIMIZATION: If asked for a title or SEO, generate a high-ranking 80-character eBay title (front-load Brand, Model, Key Specs, Condition, and high-volume search keywords without punctuation fluff).
2. PRICING STRATEGY: If asked for pricing, provide actionable price brackets: Buy It Now price with Best Offer auto-accept (e.g., ~85% of BIN) and auto-decline (e.g., ~70% of BIN) thresholds.
3. FLAW & AUTHENTICITY INSPECTION: If asked to inspect or authenticate, give category-specific physical checks (batch codes on fragrances, stitch counts & hardware weight on streetwear/luxury, model numbers/port tests on electronics, single-stitch/tag dates on vintage tees).
4. LIQUIDITY & PLATFORM ADVICE: Recommend whether to fast-flip locally on FB Marketplace/Gumtree (cash on pickup, 0% fees) or ship nationally on eBay Australia.
5. US SCARCITY & ARBITRAGE: If US market data is active, advise on setting an Australian domestic scarcity markup or international export feasibility.

STRICT OPERATIONAL RULES:
1. PUNCHY & BRIEF: Maximum 80 words total per response. Resellers are in a rush.
2. DECISIVE: Start directly with the action or strategy (COP, PASS, COUNTER-OFFER, or optimized title/price).
3. PRACTICAL: Always cite specific numbers or physical checkpoints.
4. ZERO FLUFF: No generic greetings, no throat-clearing, no repeating the full item title unnecessarily.`;
}

function generateOfflineHeuristicResponse(query: string, ctx: ItemChatContext): string {
  const q = query.toLowerCase();
  const net = Number(ctx.estimated_net) || 15;
  const tag = Number(ctx.tag_price) || 10;
  const market = Number(ctx.fair_market_price) || 40;
  const title = ctx.title || "Item";
  const brand = ctx.brand && ctx.brand !== "Unbranded" ? ctx.brand : "";

  const formattedNet = formatChatAUD(net);
  const formattedNetWithPlus = formatChatAUD(net, true);
  const formattedTag = formatChatAUD(tag);
  const formattedMarket = formatChatAUD(market);

  // 1. 80-Character eBay SEO Title
  if (q.includes("title") || q.includes("seo") || q.includes("80-char")) {
    const rawTitle = `${brand} ${title} ${ctx.condition || "Pre-Owned"} Resale Authentic Verified`.replace(/\s+/g, " ").trim();
    const truncated = rawTitle.slice(0, 80);
    return `🎯 **80-Char SEO Title:**\n\`${truncated}\`\n(Front-loads ${brand || "brand"}, model, and search keywords for top eBay AU algorithm ranking).`;
  }

  // 2. Best Offer Price Brackets
  if (q.includes("bracket") || q.includes("best offer") || q.includes("pricing") || q.includes("bin")) {
    const binPrice = Math.round(market * 1.10);
    const autoAccept = Math.round(binPrice * 0.85);
    const autoDecline = Math.round(binPrice * 0.70);
    return `🏷️ **Pricing Strategy:**\n• **Buy It Now (BIN):** $${binPrice} AUD (anchors perceived value)\n• **Auto-Accept Offers:** ≥$${autoAccept} AUD\n• **Auto-Decline Lowballs:** <$${autoDecline} AUD\nKeeps margin protected while catching serious buyers.`;
  }

  // 3. Category-Specific Authenticity & Flaws
  if (q.includes("authent") || q.includes("flaw") || q.includes("check") || q.includes("inspect")) {
    const cat = (ctx.category || "").toLowerCase();
    if (ctx.liquid_notes || cat.includes("fragrance")) {
      return `🔍 **Fragrance Check:**\n1. Check batch code on bottle base vs box.\n2. Examine atomizer nozzle spray pattern.\n3. Check collar ring for leaking or glue residue.\n4. Sniff test top notes for oxidation.`;
    }
    if (cat.includes("clothing") || cat.includes("apparel") || cat.includes("streetwear")) {
      return `🔍 **Garment Check:**\n1. Inspect inner care tags & RN/CA numbers.\n2. Check stitching density on hems and logos.\n3. Verify YKK/lampo zipper authenticity.\n4. Check armpits and collar for yellowing.`;
    }
    if (cat.includes("electronic") || cat.includes("gaming")) {
      return `🔍 **Tech Check:**\n1. Inspect serial number sticker & warranty seals.\n2. Check battery compartment for acid leakage.\n3. Test power switch & charging port tightness.\n4. Check screen/lens for scratches.`;
    }
    return `🔍 **Inspection Checklist:**\n1. Verify brand hallmark / engraved serial numbers.\n2. Inspect corners & high-wear edges for scuffs or chips.\n3. Confirm all original accessories / cables are present.`;
  }

  // 4. US Scarcity Strategy & Arbitrage
  if (q.includes("scarcity") || q.includes("us") || q.includes("export") || ctx.is_us_market_only) {
    const usMedian = ctx.us_median_usd || Math.round(market / 1.54);
    const domesticScarcityPrice = Math.round(market * 1.25);
    return `🌐 **Cross-Border Arbitrage Strategy:**\n• **Zero AU Sales:** No local eBay AU competition.\n• **Domestic Scarcity Play:** List on eBay AU at $${domesticScarcityPrice} AUD (~25% markup). Local buyers pay extra to avoid US import shipping & wait times.\n• **Global Export:** US sales median is $${usMedian} USD (~${formattedMarket} AUD). Enable eBay International Shipping with $25 AUD postage.`;
  }

  // 5. Local Flip vs National eBay
  if (q.includes("local") || q.includes("gumtree") || q.includes("fb") || q.includes("platform") || q.includes("where")) {
    if (net >= 35) {
      return `⚡ **Platform Advice:** eBay AU for maximum buyer reach and full PayPal/eBay protection. If fragile or bulky, list on FB Marketplace at $${Math.round(market * 0.9)} cash on pickup to bypass 13.4% fees entirely.`;
    }
    return `⚡ **Platform Advice:** Fast-flip locally on FB Marketplace at $${market} cash on pickup for zero fees. If unsold in 7 days, cross-post to eBay AU.`;
  }

  if (q.includes("fair") || q.includes("price") || q.includes("worth")) {
    return `At ${formattedTag} tag price against a ${formattedMarket} market median, your take-home net is ~${formattedNet}. If margin is over $15, it's a solid buy. Try to negotiate down to $${Math.max(2, Math.round(tag * 0.75))} for extra cushion.`;
  }
  if (q.includes("flip") || q.includes("hold") || q.includes("fast")) {
    if (net >= 25) {
      return `Fast flip. List on eBay AU as Buy It Now at $${Math.round(market * 0.95)} for a quick sale within 7–14 days. Demand is active.`;
    }
    return `Marginal flip. Take-home net is ${formattedNet}. List at ${formattedMarket} and accept offers at $${Math.round(market * 0.85)}.`;
  }

  if (net >= 20) {
    return `COP. Sells for ~${formattedMarket} with healthy ${formattedNetWithPlus} net profit after postage and fees. Inspect physical condition and list immediately.`;
  }
  return `PASS or negotiate. Projected net of ${formattedNet} on a ${formattedTag} buy is too thin for the risk. Offer $${Math.max(2, Math.round(tag * 0.6))} or leave it.`;
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
