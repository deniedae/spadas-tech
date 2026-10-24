/**
 * Multi-AI Consensus Verification Engine for Spadas Lens & Rapid Thrift
 * 
 * Provides continuous dual-AI cross-checking to reject hallucinations,
 * audit visible OCR brand tags, and ensure all scanned items are accurately
 * verified before market comps are queried.
 */

import { hasGeminiVisionKey } from "@/app/lib/config/gemini-vision";
import { hasGrokApiKey, createGrokClient, GROK_VISION_MODEL } from "@/app/lib/config/grok-vision";
import { createOpenAiClient } from "@/app/lib/config/ai-models";

export type ConsensusStatus =
  | "verified_consensus"
  | "corrected"
  | "disputed_brand"
  | "single_ai_unverified";

export interface ScanAccuracyVerificationResult {
  isAccurate: boolean;
  status: ConsensusStatus;
  verifiedBrand: string | null;
  verifiedProductName: string;
  verifiedCategory: string;
  confidenceScore: number;
  auditorModel: string;
  verifiedBy: string[];
  ocrMatches: string[];
  discrepancyReason?: string;
  auditNotes?: string;
}

export interface VerificationCandidate {
  productName: string;
  brand: string | null;
  category: string;
  condition?: string;
  estimatedValue?: number;
  confidenceScore?: number;
  ocrWords?: string[];
  primaryProvider?: string;
}

/**
 * Normalizes text for brand/model comparison
 */
function normalizeToken(str?: string | null): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Evaluates whether two brands fundamentally match or conflict.
 */
export function evaluateBrandAgreement(
  primaryBrand?: string | null,
  auditorBrand?: string | null,
  ocrTags: string[] = []
): { agreed: boolean; directOcrMatch: boolean } {
  const normPrimary = normalizeToken(primaryBrand);
  const normAuditor = normalizeToken(auditorBrand);

  const isPrimaryGeneric = !normPrimary || normPrimary === "generic" || normPrimary === "unbranded" || normPrimary === "authentic";
  const isAuditorGeneric = !normAuditor || normAuditor === "generic" || normAuditor === "unbranded" || normAuditor === "authentic";

  // Both agree it is generic/unbranded
  if (isPrimaryGeneric && isAuditorGeneric) {
    return { agreed: true, directOcrMatch: false };
  }

  // Exact match or substring match
  if (!isPrimaryGeneric && !isAuditorGeneric) {
    if (normPrimary === normAuditor || normPrimary.includes(normAuditor) || normAuditor.includes(normPrimary)) {
      return { agreed: true, directOcrMatch: true };
    }
  }

  // Check OCR tokens for direct physical confirmation
  const ocrBlob = ocrTags.map(normalizeToken).join(" ");
  const ocrMatchesPrimary = !isPrimaryGeneric && ocrBlob.includes(normPrimary);
  const ocrMatchesAuditor = !isAuditorGeneric && ocrBlob.includes(normAuditor);

  // If OCR physically confirms either the primary brand or auditor brand, confirm agreement
  if (ocrMatchesPrimary || ocrMatchesAuditor) {
    if (ocrMatchesPrimary && !isAuditorGeneric && normAuditor !== normPrimary && !ocrMatchesAuditor) {
      // Auditor specifically claimed an unconfirmed competitor, but OCR confirms primary
      return { agreed: true, directOcrMatch: true };
    }
    return { agreed: true, directOcrMatch: true };
  }

  return { agreed: false, directOcrMatch: false };
}

/**
 * Core Cross-Check Engine: Verifies primary scan result using an independent secondary AI.
 */
export async function crossCheckScanAccuracy(
  imageDataUrl: string,
  candidate: VerificationCandidate,
  options?: {
    timeoutMs?: number;
    targetCurrency?: string;
  }
): Promise<ScanAccuracyVerificationResult> {
  const primaryProvider = candidate.primaryProvider || "OpenAI";
  const timeoutMs = options?.timeoutMs || 3500;

  // If candidate is already null/unidentified, no need to audit
  if (!candidate.productName || candidate.productName === "NO_CENTER_ITEM" || candidate.productName === "unidentified") {
    return {
      isAccurate: false,
      status: "single_ai_unverified",
      verifiedBrand: null,
      verifiedProductName: candidate.productName || "Unidentified",
      verifiedCategory: candidate.category || "General",
      confidenceScore: 0.2,
      auditorModel: "none",
      verifiedBy: [primaryProvider],
      ocrMatches: [],
    };
  }

  // Determine which secondary AI to use as Auditor:
  // If primary was OpenAI and Gemini is available -> use Gemini (or Grok)
  // If primary was Grok and Gemini/OpenAI is available -> use Gemini/OpenAI
  const canUseGemini = hasGeminiVisionKey();
  const canUseGrok = hasGrokApiKey() && primaryProvider !== "xai";
  const canUseOpenAi = primaryProvider === "xai";

  const auditorChoice = canUseGemini
    ? "gemini"
    : canUseGrok
    ? "grok"
    : canUseOpenAi
    ? "openai"
    : null;

  if (!auditorChoice) {
    return {
      isAccurate: true,
      status: "single_ai_unverified",
      verifiedBrand: candidate.brand,
      verifiedProductName: candidate.productName,
      verifiedCategory: candidate.category,
      confidenceScore: candidate.confidenceScore ?? 0.88,
      auditorModel: "single_model_standalone",
      verifiedBy: [primaryProvider],
      ocrMatches: candidate.ocrWords || [],
      auditNotes: "Single model verification (no secondary API key configured).",
    };
  }

  const promptText = `You are a forensic secondary verification auditor for a thrift reseller scanner.
A primary AI model identified this item from the camera as:
- Product: "${candidate.productName}"
- Brand: "${candidate.brand || "Unbranded / None"}"
- Category: "${candidate.category}"

YOUR TASK:
Examine the image critically to confirm or refute this identification:
1. FORENSIC OCR & HARDWARE INSPECTION:
   - Read any visible brand emblems, logos, care labels, size tags, serial numbers, heat stamps, or typography.
   - For luxury & designer goods (e.g. Prada, Gucci, Louis Vuitton, Coach, Chanel): inspect signature hardware (inverted metal triangle plaque, engraved zipper pulls, interior gold foil stamps, Saffiano crosshatch leather texture).
2. BRAND INTEGRITY:
   - If signature hardware, plaque, typography, or silhouette matches the identified brand, CONFIRM it ("AGREED").
   - If the item is clearly from a DIFFERENT brand, output "CORRECTED" with the actual brand.
   - If the brand emblem is not fully legible from this angle, output "DISPUTED" and request a close-up of the logo plaque/stamp. Do NOT wipe out a legitimate designer item to a generic commodity if design language matches.
3. MODEL ACCURACY: Is the model/silhouette name accurate? If wrong or too specific, provide the true description.
4. VERDICT:
   - "AGREED": Primary identification is confirmed accurate.
   - "CORRECTED": Primary identification had incorrect brand or product name; provide the correct verified details.
   - "DISPUTED": Brand emblem is unconfirmed from this angle; recommend tag/plaque close-up.

Return STRICT JSON only (no markdown, no backticks):
{
  "verdict": "AGREED" | "CORRECTED" | "DISPUTED",
  "verified_brand": "Brand or null",
  "verified_product_name": "Corrected Product Name",
  "verified_category": "Clothing | Electronics | Collectibles | etc.",
  "ocr_text_found": ["tag_text", "logo_text"],
  "confidence": 0.95,
  "reason": "1-sentence audit summary"
}`;

  try {
    let rawAuditorJson = "";
    let auditorModelName = "";

    // 1. Google Gemini Auditor Branch
    if (auditorChoice === "gemini") {
      auditorModelName = "gemini-2.5-flash";
      const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GEMINI_KEY ||
        process.env.GOOGLE_AI_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match && apiKey) {
        const mimeType = match[1];
        const base64Data = match[2];
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const geminiRes = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    { inline_data: { mime_type: mimeType, data: base64Data } },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 300,
                responseMimeType: "application/json",
              },
            }),
          });
          clearTimeout(timeoutId);

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            rawAuditorJson = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn("[Multi-AI Verifier] Gemini auditor request timed out or failed:", fetchErr);
        }
      }
    }

    // 2. xAI Grok Auditor Branch (if Gemini not configured or failed)
    if (!rawAuditorJson && (auditorChoice === "grok" || hasGrokApiKey())) {
      auditorModelName = GROK_VISION_MODEL;
      const grok = createGrokClient();
      if (grok) {
        try {
          const completion = await grok.chat.completions.create({
            model: GROK_VISION_MODEL,
            temperature: 0.1,
            max_tokens: 300,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You are a forensic brand authentication auditor. Output raw JSON only." },
              {
                role: "user",
                content: [
                  { type: "text", text: promptText },
                  { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
                ],
              },
            ],
          });
          rawAuditorJson = completion.choices?.[0]?.message?.content || "";
        } catch (grokErr) {
          console.warn("[Multi-AI Verifier] Grok auditor call failed:", grokErr);
        }
      }
    }

    // 3. OpenAI Auditor Branch (when primary was xAI)
    if (!rawAuditorJson && auditorChoice === "openai") {
      auditorModelName = "gpt-4o-mini";
      try {
        const openai = createOpenAiClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are a forensic brand verification auditor. Return strict JSON only." },
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
              ],
            },
          ],
        });
        rawAuditorJson = completion.choices?.[0]?.message?.content || "";
      } catch (openAiErr) {
        console.warn("[Multi-AI Verifier] OpenAI auditor call failed:", openAiErr);
      }
    }

    if (!rawAuditorJson) {
      // Graceful fallback to candidate if secondary auditor didn't return in time
      return {
        isAccurate: true,
        status: "single_ai_unverified",
        verifiedBrand: candidate.brand,
        verifiedProductName: candidate.productName,
        verifiedCategory: candidate.category,
        confidenceScore: candidate.confidenceScore ?? 0.85,
        auditorModel: auditorModelName || "auditor_timeout",
        verifiedBy: [primaryProvider],
        ocrMatches: candidate.ocrWords || [],
        auditNotes: "Auditor response timed out; primary scan preserved.",
      };
    }

    const cleanJson = rawAuditorJson
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleanJson);

    const verdict = (parsed.verdict || "AGREED").toUpperCase();
    const ocrFound: string[] = Array.isArray(parsed.ocr_text_found) ? parsed.ocr_text_found : [];
    const auditorBrand = parsed.verified_brand && parsed.verified_brand !== "null" ? parsed.verified_brand : null;
    const auditorProduct = parsed.verified_product_name || candidate.productName;
    const auditorCategory = parsed.verified_category || candidate.category;
    const auditorConfidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.95;

    const brandAgreement = evaluateBrandAgreement(candidate.brand, auditorBrand, ocrFound);

    if (verdict === "AGREED" || brandAgreement.agreed) {
      return {
        isAccurate: true,
        status: "verified_consensus",
        verifiedBrand: candidate.brand || auditorBrand,
        verifiedProductName: candidate.productName,
        verifiedCategory: candidate.category,
        confidenceScore: Math.min(0.99, Math.max(candidate.confidenceScore ?? 0.88, auditorConfidence)),
        auditorModel: auditorModelName,
        verifiedBy: [primaryProvider, auditorModelName],
        ocrMatches: Array.from(new Set([...(candidate.ocrWords || []), ...ocrFound])),
        auditNotes: parsed.reason || "Both AI models independently confirmed item identification.",
      };
    }

    if (verdict === "CORRECTED") {
      return {
        isAccurate: false,
        status: "corrected",
        verifiedBrand: auditorBrand,
        verifiedProductName: auditorProduct,
        verifiedCategory: auditorCategory,
        confidenceScore: auditorConfidence,
        auditorModel: auditorModelName,
        verifiedBy: [auditorModelName],
        ocrMatches: ocrFound,
        discrepancyReason: parsed.reason || `Auditor corrected brand from "${candidate.brand}" to "${auditorBrand}".`,
      };
    }

    // Otherwise Disputed Brand
    // If primary identified a brand and auditor didn't identify a conflicting competitor brand,
    // preserve candidate.brand so eBay comps can still lookup the designer model while flagging the verification state!
    const isAuditorGeneric = !auditorBrand || auditorBrand.toLowerCase() === "generic" || auditorBrand.toLowerCase() === "unbranded";
    const hasConflictingBrand = auditorBrand && !isAuditorGeneric && normalizeToken(auditorBrand) !== normalizeToken(candidate.brand);
    const finalBrand = hasConflictingBrand ? null : (candidate.brand || auditorBrand);

    return {
      isAccurate: false,
      status: "disputed_brand",
      verifiedBrand: finalBrand,
      verifiedProductName: candidate.productName,
      verifiedCategory: candidate.category,
      confidenceScore: 0.70,
      auditorModel: auditorModelName,
      verifiedBy: [primaryProvider, auditorModelName],
      ocrMatches: ocrFound,
      discrepancyReason: parsed.reason || (finalBrand
        ? `Center camera closer on the ${finalBrand} logo plaque or interior heat stamp to confirm authentication.`
        : `Dispute between ${candidate.brand} and ${auditorBrand}.`),
    };
  } catch (err: any) {
    console.warn("[Multi-AI Verifier] Exception during cross-check execution:", err?.message || err);
    return {
      isAccurate: true,
      status: "single_ai_unverified",
      verifiedBrand: candidate.brand,
      verifiedProductName: candidate.productName,
      verifiedCategory: candidate.category,
      confidenceScore: candidate.confidenceScore ?? 0.85,
      auditorModel: "auditor_error",
      verifiedBy: [primaryProvider],
      ocrMatches: candidate.ocrWords || [],
      auditNotes: "Fallback to primary scan due to verification execution error.",
    };
  }
}
