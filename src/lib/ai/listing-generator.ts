import type { AiListingResult, AiGenerationStage } from "@/types/ai-listing";

export interface GenerateListingInput {
  imageUrls: string[];
}

export interface GenerateListingOptions {
  signal?: AbortSignal;
  onProgress?: (stage: AiGenerationStage, progress: number) => void;
}

export async function generateListing(
  input: GenerateListingInput,
  options: GenerateListingOptions = {},
): Promise<AiListingResult> {
  const { signal, onProgress } = options;

  onProgress?.("analyzing", 0.1);

  const res = await fetch("/api/ai-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrls: input.imageUrls }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "AI generation failed.");
  }

  onProgress?.("finalizing" as AiGenerationStage, 1);
  return (await res.json()) as AiListingResult;
}
