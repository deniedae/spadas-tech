/**
 * Spadas AI Studio Lightbox Engine
 * High-speed client-side canvas engine that transforms messy thrift-store photos
 * into 100% compliant, high-converting eBay & marketplace studio catalog photos.
 *
 * Capabilities:
 * - Intelligent background segmentation & pure white (#FFFFFF) isolation
 * - Contact drop-shadow grounding (prevents floating cutout look)
 * - Auto white-balance color correction (eliminates thrift store yellow light casts)
 * - Contrast & edge clarity enhancement (makes textures, hallmarks, and logos pop)
 */

import { loadImageElement } from "./image-enhancer";

export type StudioPreset = "pure_white" | "luxury_slate" | "transparent" | "warm_minimal";

export interface StudioLightboxOptions {
  preset?: StudioPreset;
  addShadow?: boolean;
  enhanceLighting?: boolean;
  autoCenter?: boolean;
  maxDimension?: number;
  sensitivity?: number; // 0.1 to 1.0 (default: 0.42)
}

/**
 * Calculates Euclidean color distance between two RGB triplets
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Samples perimeter pixels around the edges of the image to build
 * an accurate background color profile.
 */
function sampleBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  const sampleMargin = Math.max(2, Math.floor(Math.min(width, height) * 0.04));

  // Sample top and bottom rows
  for (let y = 0; y < sampleMargin; y++) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;

      const bIdx = ((height - 1 - y) * width + x) * 4;
      rSum += data[bIdx];
      gSum += data[bIdx + 1];
      bSum += data[bIdx + 2];
      count++;
    }
  }

  // Sample left and right columns
  for (let x = 0; x < sampleMargin; x++) {
    for (let y = sampleMargin; y < height - sampleMargin; y += 4) {
      const idx = (y * width + x) * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;

      const rIdx = (y * width + (width - 1 - x)) * 4;
      rSum += data[rIdx];
      gSum += data[rIdx + 1];
      bSum += data[rIdx + 2];
      count++;
    }
  }

  if (count === 0) return { r: 240, g: 240, b: 240 };
  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

/**
 * Transforms any item photo into a professional studio catalog photo
 */
export async function processStudioLightbox(
  source: string | Blob | HTMLImageElement,
  options: StudioLightboxOptions = {}
): Promise<string> {
  const {
    preset = "pure_white",
    addShadow = true,
    enhanceLighting = true,
    autoCenter = true,
    maxDimension = 1600,
    sensitivity = 0.45,
  } = options;

  let img: HTMLImageElement;
  if (typeof source === "string" || source instanceof Blob) {
    img = await loadImageElement(source);
  } else {
    img = source;
  }

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (!origWidth || !origHeight) {
    throw new Error("Invalid image dimensions.");
  }

  // Downscale to maxDimension keeping aspect ratio
  let targetWidth = origWidth;
  let targetHeight = origHeight;
  if (origWidth > maxDimension || origHeight > maxDimension) {
    if (origWidth > origHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round((origHeight / origWidth) * maxDimension);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((origWidth / origHeight) * maxDimension);
    }
  }

  // Source work canvas
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = targetWidth;
  srcCanvas.height = targetHeight;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Could not initialize 2D canvas context.");

  srcCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const srcImageData = srcCtx.getImageData(0, 0, targetWidth, targetHeight);
  const data = srcImageData.data;

  // 1. Identify Background Color
  const bg = sampleBackgroundColor(data, targetWidth, targetHeight);

  // 2. Compute Foreground Alpha Mask with Soft Edge Feathers
  const alphaMask = new Uint8Array(targetWidth * targetHeight);
  const threshLow = 255 * (1 - sensitivity);
  const threshHigh = threshLow + 45;

  let minX = targetWidth;
  let maxX = 0;
  let minY = targetHeight;
  let maxY = 0;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const dist = colorDistance(r, g, b, bg.r, bg.g, bg.b);

      let alpha = 0;
      if (dist >= threshHigh) {
        alpha = 255;
      } else if (dist <= threshLow) {
        alpha = 0;
      } else {
        // Linear smoothstep feather
        const t = (dist - threshLow) / (threshHigh - threshLow);
        alpha = Math.round(t * 255);
      }

      alphaMask[y * targetWidth + x] = alpha;

      if (alpha > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Bounds fallback if item covers whole image
  if (minX >= maxX || minY >= maxY) {
    minX = 0;
    maxX = targetWidth - 1;
    minY = 0;
    maxY = targetHeight - 1;
  }

  // 3. Isolated Foreground Canvas
  const fgCanvas = document.createElement("canvas");
  fgCanvas.width = targetWidth;
  fgCanvas.height = targetHeight;
  const fgCtx = fgCanvas.getContext("2d");
  if (!fgCtx) throw new Error("Could not initialize foreground canvas.");

  const fgImageData = fgCtx.createImageData(targetWidth, targetHeight);
  const fgData = fgImageData.data;

  for (let i = 0; i < targetWidth * targetHeight; i++) {
    const srcIdx = i * 4;
    let r = data[srcIdx];
    let g = data[srcIdx + 1];
    let b = data[srcIdx + 2];
    const a = alphaMask[i];

    // Lighting Enhancement & Studio White-Balance Pass
    if (enhanceLighting && a > 0) {
      // Remove yellow thrift incandescent cast by slightly boosting blue & leveling greens
      b = Math.min(255, b * 1.05);
      // Contrast stretch
      r = Math.min(255, Math.max(0, (r - 128) * 1.12 + 132));
      g = Math.min(255, Math.max(0, (g - 128) * 1.12 + 132));
      b = Math.min(255, Math.max(0, (b - 128) * 1.12 + 132));
    }

    fgData[srcIdx] = r;
    fgData[srcIdx + 1] = g;
    fgData[srcIdx + 2] = b;
    fgData[srcIdx + 3] = a;
  }

  fgCtx.putImageData(fgImageData, 0, 0);

  // 4. Final Output Canvas Assembly
  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetWidth;
  outCanvas.height = targetHeight;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Could not initialize output canvas.");

  // Apply Background Preset
  if (preset === "pure_white") {
    outCtx.fillStyle = "#FFFFFF";
    outCtx.fillRect(0, 0, targetWidth, targetHeight);
  } else if (preset === "luxury_slate") {
    // Sleek deep vignette for watches and luxury items
    const grad = outCtx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.1,
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.8
    );
    grad.addColorStop(0, "#161B26");
    grad.addColorStop(1, "#090C13");
    outCtx.fillStyle = grad;
    outCtx.fillRect(0, 0, targetWidth, targetHeight);
  } else if (preset === "warm_minimal") {
    outCtx.fillStyle = "#F7F5F0";
    outCtx.fillRect(0, 0, targetWidth, targetHeight);
  }
  // If transparent: do not fill background

  // Calculate centered position
  let drawX = 0;
  let drawY = 0;

  if (autoCenter) {
    const itemWidth = maxX - minX;
    const itemHeight = maxY - minY;
    const targetCenterX = targetWidth / 2;
    const targetCenterY = targetHeight / 2;
    const currentCenterX = minX + itemWidth / 2;
    const currentCenterY = minY + itemHeight / 2;

    drawX = targetCenterX - currentCenterX;
    drawY = targetCenterY - currentCenterY;
  }

  // 5. Contact Drop-Shadow Grounding
  if (addShadow && preset !== "transparent") {
    const shadowY = maxY + drawY + 2;
    const shadowX = (minX + maxX) / 2 + drawX;
    const shadowRadiusX = (maxX - minX) * 0.42;
    const shadowRadiusY = Math.max(6, (maxY - minY) * 0.04);

    outCtx.save();
    outCtx.beginPath();
    outCtx.ellipse(shadowX, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    outCtx.fillStyle = preset === "luxury_slate" ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.08)";
    outCtx.filter = "blur(8px)";
    outCtx.fill();
    outCtx.restore();
  }

  // 6. Draw Isolated Foreground onto Studio Background
  outCtx.drawImage(fgCanvas, drawX, drawY);

  // Return Base64
  const mimeType = preset === "transparent" ? "image/png" : "image/jpeg";
  const quality = preset === "transparent" ? undefined : 0.92;
  return outCanvas.toDataURL(mimeType, quality);
}
