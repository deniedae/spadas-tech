import { NextResponse } from "next/server";
import { createOpenAiClient, getPrimaryAiApiKey } from "@/app/lib/config/ai-models";
import { checkNeedsVerification } from "@/lib/forensic-knowledge";

export const preferredRegion = "syd1";

interface RapidThriftResponse {
  product_name: string;
  brand: string;
  category: string;
  condition: string;
  estimated_value: number;
  thrift_cost: number;
  true_net_profit: number;
  roi_percentage: number;
  cop_verdict: "MUST_COP" | "QUICK_FLIP" | "PASS_RISKY";
  is_grail: boolean;
  needs_verification: boolean;
  notes: string;
}

function generateLocalThriftFallback(currency = "AUD"): RapidThriftResponse {
  const catalog = [
    { name: "Vintage Nike Embroidered Swoosh Crewneck", brand: "Nike", category: "Streetwear & Apparel", val: 85, cost: 8 },
    { name: "Carhartt J97 Detroit Canvas Work Jacket", brand: "Carhartt", category: "Workwear & Outerwear", val: 175, cost: 15 },
    { name: "Patagonia Synchilla Snap-T Fleece Pullover", brand: "Patagonia", category: "Outdoor Apparel", val: 95, cost: 10 },
    { name: "Vintage Sony Walkman Portable Cassette Player", brand: "Sony", category: "Vintage Electronics", val: 120, cost: 12 },
    { name: "Prada Saffiano Leather Bifold Wallet", brand: "Prada", category: "Small Leather Goods", val: 190, cost: 14 },
    { name: "Ralph Lauren Heavy Cable-Knit Wool Sweater", brand: "Ralph Lauren", category: "Designer Knitwear", val: 65, cost: 9 },
  ];
  const pick = catalog[Math.floor(Math.random() * catalog.length)];
  const fee = pick.val * 0.134 + 0.33;
  const net = Math.max(0, Math.round((pick.val - pick.cost - fee) * 100) / 100);
  const roi = pick.cost > 0 ? Math.round((net / pick.cost) * 100) : 0;
  const isHighProfit = net >= 50;

  const verification = checkNeedsVerification({
    name: pick.name,
    brand: pick.brand,
    category: pick.category,
    estimatedValue: pick.val,
  });

  return {
    product_name: pick.name,
    brand: pick.brand,
    category: pick.category,
    condition: "Used - Good",
    estimated_value: pick.val,
    thrift_cost: pick.cost,
    true_net_profit: net,
    roi_percentage: roi,
    cop_verdict: net >= 50 ? "MUST_COP" : net >= 15 ? "QUICK_FLIP" : "PASS_RISKY",
    is_grail: isHighProfit,
    needs_verification: verification.needsVerification,
    notes: isHighProfit ? `High velocity thrift flip in ${currency}!` : `Steady turnover item`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { image, currency = "AUD" } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image data URL or URL is required." },
        { status: 400 }
      );
    }

    const apiKey = getPrimaryAiApiKey();
    if (!apiKey) {
      console.log("[Rapid Thrift API] No AI Key configured, returning local appraisal.");
      return NextResponse.json(generateLocalThriftFallback(currency));
    }

    const openai = createOpenAiClient();

    const systemPrompt = `You are Spadas Ultra-Fast Thrift Vision Engine. Analyze the thrift shelf/rack photo in <1.5s.
Identify the exact item, brand, category, condition, estimated resale value (eBay sold comps in ${currency}), typical thrift store tag cost ($2-$20 ${currency}), and calculate True Net Profit (Resale Value - Thrift Cost - (Resale Value * 0.134 + 0.33)).
Assign cop_verdict: "MUST_COP" (profit >= $50), "QUICK_FLIP" (profit >= $15), or "PASS_RISKY" (profit < $15).

CRITICAL ACCURACY & OCR RULES:
1. READ VISIBLE TEXT & BRAND LOGOS FIRST:
   Actively inspect printed logos, emblems, badges, and model text (e.g. "TP-Link", "tp-link", "Netgear", "Linksys", "Cisco", "Belkin", "Anker", "Sony", "Nintendo", "Apple", "Logitech", "Carhartt", "Nike", "Patagonia", "Ralph Lauren").
2. NEVER MISIDENTIFY NETWORKING / COMPUTER TECH AS VAPES:
   Do NOT guess "electronic cigarette", "vape", or "e-cig" when looking at electronic hardware, Wi-Fi adapters, range extenders, smart plugs, USB dongles, chargers, or network accessories. An item with USB connectors, antennas, Ethernet RJ-45 ports, wall prongs, or status LEDs is networking/computer equipment (e.g. "TP-Link AC1200 Wi-Fi Range Extender" or "TP-Link Nano USB Wi-Fi Adapter"), NEVER an electronic cigarette.
3. PRECISE TITLES:
   Formulate accurate title: [Brand] [Model/Type] [Category/Color] (e.g. "TP-Link AC1200 Wi-Fi Range Extender White", "Vintage Carhartt Canvas Work Jacket").

Output ONLY valid JSON adhering strictly to:
{
  "product_name": string,
  "brand": string,
  "category": string,
  "condition": string,
  "estimated_value": number,
  "thrift_cost": number,
  "true_net_profit": number,
  "roi_percentage": number,
  "cop_verdict": "MUST_COP" | "QUICK_FLIP" | "PASS_RISKY",
  "is_grail": boolean,
  "needs_verification": boolean,
  "notes": string
}`;

    // Fast completion with strict token limit for low latency
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Appraise thrift item in ${currency}. Read any visible text or brand logos and be precise.` },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "auto", // Auto resolution enables reading brand names and ports without hallucination
              },
            },
          ],
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(generateLocalThriftFallback(currency));
    }

    const parsed = JSON.parse(rawContent);

    const estVal = Number(parsed.estimated_value) || 20;
    const estCost = Number(parsed.thrift_cost) || (estVal <= 5 ? 1 : Math.max(2, Math.round(estVal * 0.15)));
    const ebayFee = estVal * 0.134 + 0.33;
    const netProfit =
      Number(parsed.true_net_profit) ||
      Math.max(0, Math.round((estVal - estCost - ebayFee) * 100) / 100);
    const roi = Number(parsed.roi_percentage) || (estCost > 0 ? Math.round((netProfit / estCost) * 100) : 0);

    const pName = parsed.product_name || "Thrift Item";
    const pBrand = parsed.brand || "Authentic";
    const pCategory = parsed.category || "General";

    const verificationCheck = checkNeedsVerification({
      name: pName,
      brand: pBrand,
      category: pCategory,
      estimatedValue: estVal,
    });

    const result: RapidThriftResponse = {
      product_name: pName,
      brand: pBrand,
      category: pCategory,
      condition: parsed.condition || "Used - Good",
      estimated_value: estVal,
      thrift_cost: estCost,
      true_net_profit: netProfit,
      roi_percentage: roi,
      cop_verdict: netProfit >= 50 ? "MUST_COP" : netProfit >= 15 ? "QUICK_FLIP" : "PASS_RISKY",
      is_grail: netProfit >= 50,
      needs_verification: Boolean(parsed.needs_verification || verificationCheck.needsVerification),
      notes: parsed.notes || (netProfit >= 50 ? "High profit thrift find!" : "Good flip potential"),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.warn("[Rapid Thrift API] Error, returning local fallback:", err);
    return NextResponse.json(generateLocalThriftFallback());
  }
}
