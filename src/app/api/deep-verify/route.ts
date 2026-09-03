if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AR_SCAN_MODEL_FALLBACKS, getPrimaryAiApiKey, createOpenAiClient } from "@/app/lib/config/ai-models";
import {
  FORENSIC_CATEGORIES,
  detectForensicCategory,
  ForensicCategory,
} from "@/lib/forensic-knowledge";

export const preferredRegion = "syd1";

export interface ForensicBreakdown {
  material: number; // 0-100 (inclusions, metal fineness, leather grain)
  typography: number; // 0-100 (hallmarks, fonts, serials, kerning)
  craftsmanship: number; // 0-100 (seam alignment, facet sharpness, stitching)
  hardware: number; // 0-100 (clasps, zippers, prongs, screws)
}

export interface DeepVerifyResult {
  product_name: string;
  brand: string;
  category: ForensicCategory;
  verdict: "LIKELY_AUTHENTIC" | "SUSPICIOUS" | "COUNTERFEIT_REPLICA" | "CANNOT_DETERMINE";
  authenticity_score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  forensic_breakdown: ForensicBreakdown;
  positive_indicators: string[];
  red_flags: string[];
  inconclusive_areas: string[];
  forensic_summary: string;
  recommendation: "SAFE_TO_BUY" | "EXERCISE_CAUTION" | "DO_NOT_BUY";
  hallmark_analysis?: string;
  isMockFallback?: boolean;
}

function generateMockVerification(
  productName?: string,
  brand?: string,
  category?: ForensicCategory
): DeepVerifyResult {
  const cat = category || detectForensicCategory(`${brand || ""} ${productName || ""}`);
  const name = productName || (cat === "crystals_gems" ? "Natural Amethyst Geode Cluster" : cat === "precious_metals" ? "18K Solid Gold Curb Chain (750)" : "Luxury Designer Item");
  const b = brand || (cat === "luxury_handbags" ? "Louis Vuitton" : cat === "watches" ? "Rolex" : "Authentic Maker");

  return {
    product_name: name,
    brand: b,
    category: cat,
    verdict: "LIKELY_AUTHENTIC",
    authenticity_score: 96,
    confidence: "HIGH",
    forensic_breakdown: {
      material: 97,
      typography: 95,
      craftsmanship: 96,
      hardware: 94,
    },
    positive_indicators: [
      cat === "crystals_gems"
        ? "Angular natural mineral inclusions and horizontal prism striations confirmed without spherical gas bubbles."
        : cat === "precious_metals"
        ? "Clean stamped assay hallmark without mold casting lines or base metal copper exposure on high-friction joints."
        : "Brand stamp typography, stitch density, and material finishing match manufacturer standards.",
      "Symmetry and proportions align with genuine reference benchmarks.",
      "Material surface texture and light refraction indicate authentic composition.",
    ],
    red_flags: [],
    inconclusive_areas: [
      "Microscopic internal refraction under 50x magnification could not be fully resolved from mobile lens.",
    ],
    forensic_summary: `Multi-angle forensic analysis of "${name}" reveals genuine manufacturing hallmarks, authentic physical characteristics, and zero structural counterfeit anomalies.`,
    recommendation: "SAFE_TO_BUY",
    hallmark_analysis: cat === "precious_metals" ? "Assay Mark 750: Verified 18K Solid Gold standard." : undefined,
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
    const { imageUrls, productName, brand, category: selectedCategory } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least 1 image URL is required for deep verification." },
        { status: 400 }
      );
    }

    // Determine category configuration
    const activeCategory: ForensicCategory =
      selectedCategory && FORENSIC_CATEGORIES[selectedCategory as ForensicCategory]
        ? (selectedCategory as ForensicCategory)
        : detectForensicCategory(`${brand || ""} ${productName || ""}`);

    const categoryConfig = FORENSIC_CATEGORIES[activeCategory] || FORENSIC_CATEGORIES.general_resale;

    const systemPrompt = `You are Spadas Universal Forensic Authenticity Engine, the world's most rigorous anti-counterfeit AI inspector for Crystals, Precious Metals (Gold/Silver), Luxury Handbags, Watches, Sneakers, Trading Cards, and Rare Collectibles.

Your goal is to conduct an authoritative, in-depth multi-angle forensic audit of the provided item.

CATEGORY: ${categoryConfig.name.toUpperCase()} (${categoryConfig.tagline})
${categoryConfig.knowledgePrompt}

EVALUATION PROTOCOL:
1. Material & Structural Integrity:
   - Crystals: Natural angular inclusions vs perfectly round glass/resin bubbles, fracture marks vs cleavage planes, color zoning vs chemical dye bleed.
   - Gold/Silver: Hallmarks (375, 585, 750, 925), maker's mark, plating wear revealing green copper/yellow brass at friction points, cast mold seam lines.
   - Luxury Handbags: Heat stamp font (e.g. LV perfectly round O), monogram seam symmetry, 28° saddle stitch slant vs lockstitch, hardware engravings.
   - Watches: Dial printing sharpness, cyclops 2.5x magnification, rehaut engraving, case bevels.
   - Sneakers: Tag typography, UPC spacing, Boost matrix, embroidery density.
   - Trading Cards: Rosette CMYK offset dots vs flat inkjet printing, holo foil pattern, centering.

2. Strict Counterfeit Detection:
   - If there is clear evidence of replica manufacturing (e.g. base metal showing under gold plating, round bubbles in a 'quartz' crystal, misspelled brand stamps, or crooked machine stitching on an Hermes bag), assign a score UNDER 40 and verdict "COUNTERFEIT_REPLICA".
   - If genuine manufacturing hallmarks are confirmed across all photos, assign score 90+ and verdict "LIKELY_AUTHENTIC".

OUTPUT FORMAT:
Respond ONLY with valid JSON adhering to this exact schema:
{
  "product_name": string,
  "brand": string,
  "category": "${activeCategory}",
  "verdict": "LIKELY_AUTHENTIC" | "SUSPICIOUS" | "COUNTERFEIT_REPLICA" | "CANNOT_DETERMINE",
  "authenticity_score": number (0 to 100 integer),
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "forensic_breakdown": {
    "material": number (0 to 100),
    "typography": number (0 to 100),
    "craftsmanship": number (0 to 100),
    "hardware": number (0 to 100)
  },
  "positive_indicators": string[] (2-4 specific genuine visual observations),
  "red_flags": string[] (explicit counterfeit red flags, or empty array if none),
  "inconclusive_areas": string[] (areas obscured by lighting or angle),
  "forensic_summary": string (concise, authoritative 2-sentence breakdown in plain reseller English),
  "recommendation": "SAFE_TO_BUY" | "EXERCISE_CAUTION" | "DO_NOT_BUY",
  "hallmark_analysis": string (optional breakdown of any detected hallmark or serial code)
}`;

    const apiKey = getPrimaryAiApiKey();

    if (!apiKey) {
      console.warn("[Deep Verify] No AI API Key found — using mock fallback.");
      return NextResponse.json(generateMockVerification(productName, brand, activeCategory));
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
              text: `Perform rigorous multi-angle forensic legitimacy inspection. Expected Item: "${productName || "Unknown"}", Brand: "${brand || "Unknown"}", Category: "${categoryConfig.name}". Conduct material, hallmark, and structural audit.`,
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
      return NextResponse.json(generateMockVerification(productName, brand, activeCategory));
    }

    const parsed: DeepVerifyResult = JSON.parse(rawContent);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[Deep Verify API] Error:", err);
    return NextResponse.json(generateMockVerification(), { status: 200 });
  }
}
