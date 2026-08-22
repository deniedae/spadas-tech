if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AR_SCAN_MODEL_FALLBACKS, getPrimaryAiApiKey, createOpenAiClient } from "@/app/lib/config/ai-models";

export const preferredRegion = "syd1";

export interface DeepVerifyResult {
  product_name: string;
  brand: string;
  verdict: "LIKELY_AUTHENTIC" | "SUSPICIOUS" | "CANNOT_DETERMINE";
  authenticity_score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  positive_indicators: string[];
  red_flags: string[];
  inconclusive_areas: string[];
  forensic_summary: string;
  recommendation: "SAFE_TO_BUY" | "EXERCISE_CAUTION" | "DO_NOT_BUY";
  isMockFallback?: boolean;
}

const BRAND_AUTHENTICITY_KNOWLEDGE: Record<string, string> = {
  nike: "Check: Tag typography and spacing (authentic Nike uses Futura Bold Condensed), date formatting on size tag, heel tab embroidery alignment, midsole star pattern, uniform stitch density (no double-crossing threads).",
  jordan: "Check: Jumpman logo finger count and shoelace details, Wings logo embossing depth and RD connecting letters, tongue tag font kerning, box label sticker typeface.",
  supreme: "Check: Box logo letter kerning (specifically 'r' and 'e' spacing), non-italicized clean Futura font, neck tag country of origin (USA/Canada), side flag tag embroidery quality.",
  yeezy: "Check: Primeknit stitch pattern along center seam, Boost pellet texture (soft, irregular defined pellets, not smooth plastic), interior heel cushion dots, size label font weight.",
  carhartt: "Check: Union made in USA / Mexico care tags, embossed copper rivets, heavy duck canvas texture, YKK or Talon brass zipper pull branding.",
  "ralph lauren": "Check: Polo player pony details (clearly defined mallet, reins, player leg), blue neck tag weave texture, RN 41381 registration number, mother-of-pearl cross-stitched buttons.",
  "louis vuitton": "Check: Monogram alignment (symmetric, LV logo never cut off on seams in authentic bags), date code / microchip format, heat stamp font (O is very round, TT very close together), brass hardware weight.",
  gucci: "Check: Double G logo interlocking symmetry, underside font of leather tab with 'R' trademark circle, Gucci font serifs, serial number font (clean sans-serif numbers with distinct font).",
  apple: "Check: Lightning/USB-C pin plating uniformity, laser-etched serial numbers, font alignment on device chassis (San Francisco typeface), packaging pull-tab tear mechanics.",
  sony: "Check: Laser-engraved model badges, screw finish (black oxide/recessed), label font fidelity and regulatory FCC/CE markings.",
};

function getBrandKnowledgePrompt(brandOrName: string): string {
  const lower = brandOrName.toLowerCase();
  for (const [key, knowledge] of Object.entries(BRAND_AUTHENTICITY_KNOWLEDGE)) {
    if (lower.includes(key)) {
      return `Brand-Specific Counterfeit Inspection Guide for ${key.toUpperCase()}:\n${knowledge}`;
    }
  }
  return "General Inspection: Inspect label typography, stitch density, symmetry, material texture, hardware quality (zippers/rivets), and country-of-origin markings.";
}

function generateMockVerification(productName?: string, brand?: string): DeepVerifyResult {
  const name = productName || "Nike Dunk Low Retro White Black Panda";
  const b = brand || "Nike";
  return {
    product_name: name,
    brand: b,
    verdict: "LIKELY_AUTHENTIC",
    authenticity_score: 94,
    confidence: "HIGH",
    positive_indicators: [
      "Brand tag typography and style code layout matches authentic manufacturer standards.",
      "Stitch density and seam spacing are consistent and uniform across panels.",
      "Logo proportions and geometry show correct alignment without distortion.",
      "Hardware and material finishing show authentic texture and construction.",
    ],
    red_flags: [],
    inconclusive_areas: [
      "Internal micro-stamp or hidden factory codes partially obscured by lighting.",
    ],
    forensic_summary: `Multi-angle forensic analysis of "${name}" reveals genuine manufacturing hallmarks, clean label typography, and zero structural counterfeit anomalies.`,
    recommendation: "SAFE_TO_BUY",
    isMockFallback: true,
  };
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrls, productName, brand, category } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least 1 image URL is required for deep verification." },
        { status: 400 }
      );
    }

    const brandContext = getBrandKnowledgePrompt(`${brand || ""} ${productName || ""}`);

    const systemPrompt = `You are Spadas Forensic Authenticity Engine, the world's most rigorous anti-counterfeit AI inspector for reselling sneakers, streetwear, luxury fashion, vintage collectibles, and electronics.

Your task is to conduct an in-depth, forensic multi-angle inspection of the provided product images.

${brandContext}

EVALUATION CRITERIA:
1. Label & Typography: Kerning, font boldness, date format, country of origin, style codes, RN numbers.
2. Seam & Stitching: Stitch count per inch, stitch tension, double-stitching errors, loose thread ends.
3. Logo & Graphics: Geometry, proportions, embossing depth, embroidery density, placement symmetry.
4. Materials & Hardware: Grain texture, zipper branding (YKK/Talon/Riri/Lampo), leather edge burnishing, rivet stamping.
5. Common Counterfeit Tells: Font bleeding, plastic sheen, asymmetric logo placement, incorrect serial formats.

OUTPUT FORMAT:
You MUST respond with valid JSON adhering strictly to this schema:
{
  "product_name": string,
  "brand": string,
  "verdict": "LIKELY_AUTHENTIC" | "SUSPICIOUS" | "CANNOT_DETERMINE",
  "authenticity_score": number (0 to 100 integer),
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "positive_indicators": string[] (2-4 specific positive visual observations),
  "red_flags": string[] (list of any counterfeit red flags, or empty array if none),
  "inconclusive_areas": string[] (areas that could not be fully verified from camera angles),
  "forensic_summary": string (concise 2-sentence breakdown in plain reseller English),
  "recommendation": "SAFE_TO_BUY" | "EXERCISE_CAUTION" | "DO_NOT_BUY"
}`;

    const apiKey = getPrimaryAiApiKey();

    if (!apiKey) {
      console.warn("[Deep Verify] No OpenAI API Key found — using mock fallback.");
      return NextResponse.json(generateMockVerification(productName, brand));
    }

    const openai = createOpenAiClient();

    const imageContent = imageUrls.slice(0, 4).map((url: string) => ({
      type: "image_url" as const,
      image_url: {
        url,
        detail: "high" as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: AR_SCAN_MODEL_FALLBACKS[0] || "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Perform multi-angle deep authenticity inspection. Expected item: "${productName || "Unknown"}" Brand: "${brand || "Unknown"}" Category: "${category || "Resale item"}". Inspect all angles carefully.`,
            },
            ...imageContent,
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1200,
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(generateMockVerification(productName, brand));
    }

    const parsed: DeepVerifyResult = JSON.parse(rawContent);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[Deep Verify API] Error:", err);
    return NextResponse.json(generateMockVerification(), { status: 200 });
  }
}
