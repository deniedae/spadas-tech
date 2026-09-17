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
   - Starter ($29 AUD/mo): 100 scans per month.
   - Pro ($49 AUD/mo or $10 AUD/mo promotional): Unlimited scans, Real-Time AI Copilot, Deep Comps Audit, and Priority Sourcing Radar.
   - Manage plan anytime in Settings > Billing.

COMMUNICATION STYLE:
- Friendly, professional, concise, and technically authoritative.
- Resellers want fast, direct solutions.
- If a user asks a complex technical bug question or wants a custom feature, suggest tapping "[Request Dev]" in the header so Spadas engineering can review it directly.`;

function generateHeuristicSupportReply(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("us") || q.includes("scarcity") || q.includes("american") || q.includes("fallback")) {
    return `🌐 **US-Only Comps & Scarcity Pricing:**\n\nWhen an item has fewer than 3 recorded sales on eBay Australia, Spadas automatically queries high-liquidity US sold data. We convert USD to AUD, deduct international shipping friction (~$25 AUD), and highlight it as a **Domestic Scarcity Play**—meaning you can often price higher in Australia because local domestic supply is near zero!`;
  }

  if (q.includes("comp") || q.includes("ebay") || q.includes("australia") || q.includes("price") || q.includes("au")) {
    return `🇦🇺 **Geo-Strict eBay Australia Comps:**\n\nFor Australian users, Spadas strictly filters for verified domestic eBay Australia sold items (\`LH_PrefLoc=1\`), excluding international sellers. We apply Interquartile Range (IQR) statistical filtering to eliminate bulk lots, multi-packs, and fake outliers so your valuations reflect true realized cash market value.`;
  }

  if (q.includes("profit") || q.includes("fee") || q.includes("calculate") || q.includes("formula") || q.includes("p&l") || q.includes("margin")) {
    return `💰 **Net Profit & P&L Formula:**\n\nYour **Net Profit** is calculated in real time as:\n\n\`Net Profit = Fair Market Value − Tag Cost − eBay AU Fees (~13.4% + $0.33) − Estimated Domestic Postage\`\n\nWhat is displayed on your screen is your actual take-home realized profit.`;
  }

  if (q.includes("str") || q.includes("velocity") || q.includes("fast flip") || q.includes("turn")) {
    return `⚡ **Sell-Through Rate (STR) & Velocity:**\n\nSpadas computes inventory velocity by comparing recent 90-day sold listings against active supply. Items with >50% STR and ~14-day turn speed are flagged as **⚡ Fast Flips**, while slow movers (>90 days turn) are flagged as **🛑 Traps**.`;
  }

  if (q.includes("list") || q.includes("publish") || q.includes("draft") || q.includes("connect")) {
    return `🛒 **1-Click eBay AU Publishing:**\n\nConnect your eBay Seller Hub account in **Settings > Connected Accounts**. Once linked, tap **[Publish to eBay]** on any item in your Haul, Dashboard, or Listings to instantly create an active listing with pre-filled title, category, price, and photos.`;
  }

  if (q.includes("plan") || q.includes("subscri") || q.includes("pro") || q.includes("credit") || q.includes("starter") || q.includes("cost") || q.includes("price")) {
    return `⚡ **Spadas Subscription Plans:**\n\n• **Starter Plan:** 100 scans per month, basic comps, and inventory tracking.\n• **Pro Plan:** Unlimited camera scans, real-time AI In-Aisle Copilot, deep comps audit, and 1-click eBay publishing.\n\nYou can manage or upgrade your plan anytime in **Settings > Billing**.`;
  }

  if (q.includes("human") || q.includes("developer") || q.includes("bug") || q.includes("issue") || q.includes("help") || q.includes("contact")) {
    return `👨‍💻 **Developer Support Desk:**\n\nNeed engineering assistance or encountering a sync issue? Tap **[Request Dev]** in the header above to submit a ticket directly to Spadas engineering (lead developer: \`deniedae@gmail.com\`). You will receive an in-app reply with full developer verification!`;
  }

  return `👋 **Hello from Spadas AI Copilot!**\n\nI can help you with:\n• **🇦🇺 Geo-Strict Comps**: How eBay AU sold data and US fallbacks work.\n• **💰 P&L Formulas**: Exact deductions for eBay fees and shipping.\n• **⚡ STR & Velocity**: Identifying fast flips vs inventory traps.\n• **🛒 eBay Publishing**: 1-click catalog intake and live drafts.\n\nWhat would you like to know?`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [] } = body;

    const latestUserMessage = messages[messages.length - 1]?.content || "";
    const openAiKey = getPrimaryAiApiKey();
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const encoder = new TextEncoder();

    // 1. OpenAI Engine
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
          max_tokens: 350,
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
        console.warn("[Support Chat] OpenAI error, attempting Gemini fallback:", aiErr?.message);
      }
    }

    // 2. Google Gemini Fallback
    if (geminiApiKey && geminiApiKey.length > 10) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${SYSTEM_SUPPORT_PROMPT}\n\nUser Question:\n${latestUserMessage}`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 350,
              temperature: 0.4,
            },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const replyText =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            generateHeuristicSupportReply(latestUserMessage);

          const words = replyText.split(" ");
          const geminiStream = new ReadableStream({
            async start(controller) {
              for (let i = 0; i < words.length; i++) {
                const chunkWord = (i === 0 ? "" : " ") + words[i];
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkWord })}\n\n`));
                await new Promise((r) => setTimeout(r, 14));
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });

          return new Response(geminiStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          });
        }
      } catch (gemErr: any) {
        console.warn("[Support Chat] Gemini error, using synthetic engine:", gemErr?.message);
      }
    }

    // 3. High-Speed Synthetic Diagnostic Engine
    const fallbackText = generateHeuristicSupportReply(latestUserMessage);
    const words = fallbackText.split(" ");

    const fallbackStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunkWord = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkWord })}\n\n`));
          await new Promise((r) => setTimeout(r, 14));
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
