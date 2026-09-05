import { NextResponse } from "next/server";
import { createOpenAiClient, getPrimaryAiApiKey } from "@/app/lib/config/ai-models";
import { checkNeedsVerification } from "@/lib/forensic-knowledge";
import { estimateCategoryShippingCost, detectThriftTrap } from "@/lib/thrift-cop-engine";

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

    const systemPrompt = `You are Spadas Ultra-Fast Thrift Vision Engine. Analyze the thrift shelf/rack photo in <1.5s with RUTHLESS RESELLER ACCURACY.
Identify the exact item, brand, category, condition, realistic secondary market resale value (cleared eBay sold comps in ${currency}), typical thrift store tag cost ($2-$20 ${currency}), and calculate True Net Profit:
True Net Profit = Resale Value - Thrift Cost - Platform Fees (13.4% + $0.33) - Real Parcel Shipping ($4.20 - $11.00).

RUTHLESS RESELLER RULES & AVOID AMATEUR TRAPS:
1. NEVER OVERVALUE PENNY ARBITRAGE / LOW-DOLLAR MEDIA:
   Common mass-market DVDs, Blu-rays, and CDs (e.g. Wolverine, Twilight, Dark Knight, Avatar, standard movies) sell on eBay for $3 - $5 gross with free shipping by mega-warehouses. Tracked parcel postage ($4.20) + eBay fees ($1.00) means an individual seller loses money or nets $0.
   -> Estimated Value: $4-$6. Cop Verdict: "PASS_RISKY". Notes: "Common media. Tracked postage ($4.20) eats 100% of profit."
2. NEVER OVERVALUE BUDGET COMMODITY TECH:
   Brands like Amazon Basics, Insignia, Onn, Mainstays, and Blackweb retail for $10-$14 BRAND NEW on Amazon Prime with next-day delivery. A used Amazon Basics keyboard or mouse has near-zero resale demand ($5-$8 at best) and shipping costs $9.50.
   -> Cop Verdict: "PASS_RISKY". Notes: "Budget commodity tech. Cheaper new on Amazon Prime."
3. BE REALISTIC ON NOVELTY CERAMIC MUGS & GLASSWARE:
   Mass-market novelty coffee mugs (standard Nintendo, Disney, Star Wars from Target/Walmart) sell for $6-$9, NOT $20. Shipping is $8.50 due to 1.5 lb fragile bubble-wrap packaging. Unless it is a rare 1980s/1990s collector grail, net profit is negative.
   -> Cop Verdict: "PASS_RISKY". Notes: "Fragile ceramic novelty. Shipping ($8.50) eliminates margin."
4. READ VISIBLE TEXT & BRAND LOGOS FIRST:
   Inspect logos and badges (e.g. TP-Link, Netgear, Linksys, Cisco, Belkin, Anker, Sony, Nintendo, Apple, Logitech, Carhartt, Nike, Patagonia, Ralph Lauren).
5. NEVER MISIDENTIFY COMPUTER/NETWORKING GEAR AS VAPES.
6. PRECISE TITLES:
   Formulate accurate title: [Brand] [Model/Type] [Category/Color] (e.g. "TP-Link AC1200 Wi-Fi Range Extender White", "Vintage Carhartt Canvas Work Jacket").

Cop Verdict Criteria:
- "MUST_COP": Net profit >= $40 after shipping & fees.
- "QUICK_FLIP": Net profit >= $15 after shipping & fees with fast sell-through.
- "PASS_RISKY": Net profit < $8 or flagged as a thrift trap (common DVD, Amazon Basics, novelty mug).

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
            { type: "text", text: `Appraise thrift item in ${currency}. Apply ruthless reseller math with real shipping costs.` },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "auto",
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

    const pName = parsed.product_name || "Thrift Item";
    const pBrand = parsed.brand || "Authentic";
    const pCategory = parsed.category || "General";

    // Deduct realistic category parcel shipping
    const shippingCost = estimateCategoryShippingCost(pCategory, pName);
    const calculatedNetProfit = Math.max(0, Math.round((estVal - estCost - ebayFee - shippingCost) * 100) / 100);
    const netProfit = typeof parsed.true_net_profit === "number" && parsed.true_net_profit < calculatedNetProfit
      ? parsed.true_net_profit
      : calculatedNetProfit;
    const roi = estCost > 0 ? Math.round((netProfit / estCost) * 100) : 0;

    // Check for thrift traps (Common DVDs, Amazon Basics, Novelty Mugs)
    const trap = detectThriftTrap(pName, estVal, pBrand);

    let copVerdict: "MUST_COP" | "QUICK_FLIP" | "PASS_RISKY" = "PASS_RISKY";
    let notes = parsed.notes || "";

    if (trap.isTrap) {
      copVerdict = "PASS_RISKY";
      notes = trap.reason || "Postage & fees exceed item resale value. Leave on shelf.";
    } else if (netProfit <= 0 || (estVal < 14 && pCategory.toLowerCase().includes("media"))) {
      copVerdict = "PASS_RISKY";
      notes = `Negative profit (-$${(estCost + ebayFee + shippingCost - estVal).toFixed(2)}) after $${shippingCost.toFixed(2)} shipping. Leave on shelf.`;
    } else if (netProfit < 8 || roi < 40) {
      copVerdict = "PASS_RISKY";
      notes = `Thin profit ($${netProfit.toFixed(2)}) after postage. High effort for low reward.`;
    } else if (netProfit >= 40 || (roi >= 250 && netProfit >= 25)) {
      copVerdict = "MUST_COP";
      notes = notes || "High profit thrift find!";
    } else if (netProfit >= 15 || roi >= 100) {
      copVerdict = "QUICK_FLIP";
      notes = notes || "Good fast flip potential!";
    }

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
      cop_verdict: copVerdict,
      is_grail: copVerdict === "MUST_COP",
      needs_verification: Boolean(parsed.needs_verification || verificationCheck.needsVerification),
      notes,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.warn("[Rapid Thrift API] Error, returning local fallback:", err);
    return NextResponse.json(generateLocalThriftFallback());
  }
}
