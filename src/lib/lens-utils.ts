// Pure utility functions for lens camera scanning logic

// Stop-words list for debouncer filtering
export const STOP_WORDS = new Set([
  "with", "in", "the", "and", "a", "an", "of", "for", "to", "on", "at", "by",
  "mens", "womens", "original", "box", "item", "used", "new", "style", "type",
  "authentic", "vintage", "retro", "brand", "edition", "set", "pack", "lot",
]);

// Keyword Similarity Checker with Stop-Word Filtering
export function getKeywordSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/'s\b/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const words1 = normalize(str1);
  const words2 = normalize(str2);

  if (words1.length === 0 || words2.length === 0) {
    const raw1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length >= 2);
    const raw2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length >= 2);
    if (raw1.length === 0 || raw2.length === 0) return 0;
    const s1 = new Set(raw1);
    const s2 = new Set(raw2);
    let common = 0;
    s1.forEach((w) => { if (s2.has(w)) common++; });
    return common / Math.max(s1.size, s2.size);
  }

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let common = 0;
  set1.forEach((w) => { if (set2.has(w)) common++; });
  const dice = (2 * common) / (set1.size + set2.size);
  const minOverlap = common / Math.min(set1.size, set2.size);
  const maxOverlap = common / Math.max(set1.size, set2.size);
  return Math.max(dice, minOverlap, maxOverlap);
}

// Strict Vague / Partial Read Detector
export function isVagueOrPartialRead(productName?: string | null): boolean {
  if (!productName || typeof productName !== "string") return true;
  const trimmed = productName.trim();
  if (trimmed.length < 3) return true;
  if (/^[.\\/_\-–—:;,#@!$%^&*()+=~`\s]+$/.test(trimmed)) return true;
  const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  if (alphanumeric.length < 2) return true;

  const lower = trimmed.toLowerCase();
  const explicitFailures = [
    "no_center_item", "scanned item", "scanned reseller item", "resale item",
    "unknown item", "unidentified item", "unidentified", "unknown product",
    "unknown title", "could not be identified", "cannot be determined",
    "exact card details unclear", "vintage electronics / resale item",
    "null", "undefined", "object", "item",
  ];
  return explicitFailures.some(
    (phrase) => lower === phrase || lower === `.${phrase}` || lower.startsWith(`${phrase} `)
  );
}

// Clean Condition Subtitle Helper (Strips internal AI reasoning notes)
export function cleanConditionText(rawCondition: string): string {
  if (!rawCondition) return "Used";
  return (
    rawCondition
      .replace(/\(.*?\)/g, "")
      .replace(/assume.*$/i, "")
      .replace(/untested.*$/i, "Used")
      .replace(/faulty.*$/i, "Used")
      .replace(/parts-only.*$/i, "Used")
      .replace(/sold as-is.*$/i, "Used")
      .replace(/ungraded.*$/i, "Used")
      .trim() || "Used"
  );
}

// Capture a JPEG frame from a live HTMLVideoElement, returns a data URL or null
export function captureVideoFrame(video: HTMLVideoElement | null, quality = 0.85): string | null {
  if (!video || video.videoWidth === 0) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}
