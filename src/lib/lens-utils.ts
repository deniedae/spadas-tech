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

// Utility to auto-crop the snapshot video frame to a centered or targeted product area
// Set target dimensions for a clean square product shot (e.g., 1080x1080)
export function captureVideoFrameCropped(
  video: HTMLVideoElement | null,
  options: {
    /** Output size in pixels — defaults to 1080×1080 */
    size?: number;
    /**
     * Crop bias: 0.5 = dead center (default).
     * < 0.5 pulls toward top, > 0.5 pulls toward bottom.
     * Useful if the viewfinder reticle is offset from the video midpoint.
     */
    verticalBias?: number;
    quality?: number;
  } = {}
): string | null {
  if (!video || video.videoWidth === 0) return null;

  const { size = 1080, verticalBias = 0.5, quality = 0.88 } = options;

  try {
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Largest centered square that fits within the video frame
    const cropSide = Math.min(vw, vh);

    // Center horizontally; apply vertical bias for viewfinder alignment
    const sx = Math.round((vw - cropSide) / 2);
    const sy = Math.round((vh - cropSide) * verticalBias);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return captureVideoFrame(video, quality); // graceful fallback

    // Draw cropped region scaled to target size
    ctx.drawImage(
      video,
      sx, sy, cropSide, cropSide, // source crop
      0,  0,  size,     size      // destination (scaled)
    );

    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // Fall back to full-frame capture if anything fails
    return captureVideoFrame(video, quality);
  }
}

/**
 * Captures a centered 1080×1080 square crop from a live video element
 * and returns it as a JPEG Blob — ready for direct binary upload to
 * Supabase Storage without any base64 encoding overhead.
 *
 * Identical crop logic to captureVideoFrameCropped() but Blob output
 * makes it faster for upload paths that use FormData or fetch body.
 */
export async function captureAndCropPhoto(videoElement: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
    const startX = (videoElement.videoWidth - size) / 2;
    const startY = (videoElement.videoHeight - size) / 2;

    ctx.drawImage(
      videoElement,
      startX, startY, size, size, // Source slice — centered square
      0, 0, 1080, 1080            // Destination square
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas to Blob conversion failed'));
    }, 'image/jpeg', 0.9);
  });
}

/**
 * Crops the video frame to match the active AR reticle/bounding box before
 * sending to AI — the model only sees the product region, not background noise.
 *
 * @param videoElement - The live <video> element
 * @param boxRect      - DOMRect of the on-screen reticle (getBoundingClientRect())
 * @returns JPEG Blob of the cropped region at native video resolution
 */
export async function captureTargetBox(
  videoElement: HTMLVideoElement,
  boxRect: DOMRect
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Scale screen coordinates → actual video pixel coordinates
  const scaleX = videoElement.videoWidth / videoElement.clientWidth;
  const scaleY = videoElement.videoHeight / videoElement.clientHeight;

  canvas.width  = Math.round(boxRect.width  * scaleX);
  canvas.height = Math.round(boxRect.height * scaleY);

  if (ctx) {
    ctx.drawImage(
      videoElement,
      Math.round(boxRect.left * scaleX),  // Source x
      Math.round(boxRect.top  * scaleY),  // Source y
      canvas.width,                        // Source w
      canvas.height,                       // Source h
      0, 0, canvas.width, canvas.height   // Destination (1:1)
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Target box crop failed'));
      },
      'image/jpeg',
      0.85
    );
  });
}
