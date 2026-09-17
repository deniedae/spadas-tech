import OpenAI from "openai";
import type { AiListingResult } from "@/types/ai-listing";

export const GLM_FLASH_MODEL = "glm-5.3-flash";
export const GLM_BACKUP_MODELS = ["glm-5.3-flash", "glm-4v-flash", "glm-4-flash"];

/**
 * Checks if a GLM (Zhipu AI / OpenRouter) API key is configured.
 */
export function hasGlmVisionKey(): boolean {
  const key =
    process.env.GLM_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.BIGMODEL_API_KEY ||
    process.env.OPENROUTER_API_KEY;
  return Boolean(key && key.length > 8 && !key.includes("placeholder"));
}

/**
 * Instantiates an OpenAI-compatible client for GLM-5.3-Flash.
 * Supports direct Zhipu BigModel API or OpenRouter routing.
 */
export function createGlmClient(): OpenAI | null {
  const directKey =
    process.env.GLM_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.BIGMODEL_API_KEY;

  if (directKey && directKey.length > 8 && !directKey.includes("placeholder")) {
    return new OpenAI({
      apiKey: directKey,
      baseURL: process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
    });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && openRouterKey.length > 8) {
    return new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://spadas-tech.vercel.app",
        "X-Title": "Spadas Lens",
      },
    });
  }

  return null;
}

export interface GlmFastVisionResult {
  product_name: string;
  brand: string | null;
  category: string;
  condition: string;
  media_format?: "4K UHD" | "Blu-ray" | "DVD" | "Steelbook" | "VHS" | "Cassette" | "CD" | "Vinyl" | null;
  confidence_score: number;
  estimated_value: number;
  suggested_price_min: number;
  suggested_price_max: number;
  defect_notes: string[];
}

/**
 * Ultra-Fast Sub-250ms GLM-5.3-Flash Vision Identification for AR Scanner HUD
 */
export async function callGlmVisionFast(
  imageDataUrl: string,
  categoryHint?: string
): Promise<GlmFastVisionResult | null> {
  const client = createGlmClient();
  if (!client) return null;

  try {
    const prompt = `You are an expert reseller appraiser for eBay Australia and secondary marketplaces.
Perform instant, forensic OCR visual identification on this item:
1. Product Name: Exact brand and model silhouette (e.g. "Sony Cyber-shot DSC-W350", "Universal Bad Neighbours Blu-ray", "Carhartt Detroit Jacket").
2. Brand: Exact brand or null if generic unbranded.
3. Category: e.g. "Electronics", "Clothing", "Media & Movies", "Collectibles", "Video Games".
4. Condition: e.g. "Used - Good", "Brand New", "For Parts".
5. Media Format: If movie/disc, strictly inspect the upper header banner: 'Blu-ray' (blue banner), '4K UHD' (black/4K header), 'DVD' (standard black casing), 'Steelbook' (metal case), 'VHS', 'CD', 'Vinyl'. Otherwise null.
6. Valuation (AUD): Realistic pre-owned sold comps on eBay Australia (estimated_value, suggested_price_min, suggested_price_max).
7. Defect notes: Any visible scuffs, tears, scratches, or flaws.

Return strict JSON:
{
  "product_name": "string",
  "brand": "string or null",
  "category": "string",
  "condition": "string",
  "media_format": "4K UHD | Blu-ray | DVD | Steelbook | VHS | Cassette | CD | Vinyl | null",
  "confidence_score": 0.95,
  "estimated_value": 35,
  "suggested_price_min": 25,
  "suggested_price_max": 45,
  "defect_notes": []
}`;

    const cleanUrl = imageDataUrl.trim().replace(/[\r\n]/g, "");

    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_API_KEY ? "zhipu/glm-5.3-flash" : GLM_FLASH_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: cleanUrl },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as GlmFastVisionResult;
  } catch (err: any) {
    console.warn("[GLM-5.3-Flash] Vision inference error:", err?.message || err);
    return null;
  }
}
