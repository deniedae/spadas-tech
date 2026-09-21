/**
 * Spadas Client-Side Pre-Processing: Focal Cropping & WebP Compression Pipeline
 * 
 * 1. Center 60% reticle focal bounding crop: extracts only framed target merchandise.
 * 2. Constrains dimensions to maximum 768x768px (ideal token-to-accuracy ratio for Gemini Vision).
 * 3. High-contrast (+10%) & adaptive low-light exposure normalization for faded tags and hallmarks.
 * 4. Ultra-lightweight WebP export (0.82 quality) compressing raw 2.5MB frames to < 120KB.
 */

export interface FocalCropOptions {
  /** Crop factor relative to camera viewport dimensions (default: 0.60 for center 60%) */
  cropFactor?: number;
  /** Maximum pixel dimension for width/height (default: 768px) */
  maxDimension?: number;
  /** Compression quality (default: 0.82) */
  quality?: number;
  /** Contrast multiplier (default: 1.10 for +10% boost) */
  contrastBoost?: number;
  /** Enable adaptive exposure normalization for dark thrift environments (default: true) */
  normalizeExposure?: boolean;
}

export interface FocalCropResult {
  dataUrl: string;
  width: number;
  height: number;
  format: "image/webp" | "image/jpeg";
  sizeBytesApprox: number;
}

/**
 * Extracts the center 60% reticle bounding crop from an active video element,
 * rescales it to <= 768px, applies contrast/gamma normalization, and compresses to WebP.
 */
export async function processFocalCrop(
  video: HTMLVideoElement,
  options: FocalCropOptions = {}
): Promise<FocalCropResult> {
  const {
    cropFactor = 0.60,
    maxDimension = 768,
    quality = 0.82,
    contrastBoost = 1.10,
    normalizeExposure = true,
  } = options;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (!vw || !vh || vw <= 0 || vh <= 0) {
    throw new Error("[image-processing] Video element has invalid dimensions or is not ready.");
  }

  // 1. Center 60% reticle focal bounding crop
  const cropWidth = Math.round(vw * cropFactor);
  const cropHeight = Math.round(vh * cropFactor);
  const cropX = Math.round((vw - cropWidth) / 2);
  const cropY = Math.round((vh - cropHeight) / 2);

  // 2. Constrain target dimensions to max 768x768px while strictly preserving aspect ratio
  let targetWidth = cropWidth;
  let targetHeight = cropHeight;

  if (cropWidth > maxDimension || cropHeight > maxDimension) {
    if (cropWidth >= cropHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round((cropHeight * maxDimension) / cropWidth);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((cropWidth * maxDimension) / cropHeight);
    }
  }

  // 3. Draw cropped region onto offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("[image-processing] Failed to initialize 2D canvas context.");
  }

  ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

  // 4. High-Contrast & Gamma / Exposure Normalization
  try {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    let exposureLift = 0;
    if (normalizeExposure) {
      let totalLum = 0;
      const sampleStep = 8;
      let sampleCount = 0;
      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sampleCount++;
      }
      const avgLum = sampleCount > 0 ? totalLum / sampleCount : 128;
      // In low-light thrift store environments (avgLum < 110), apply subtle exposure lift
      if (avgLum < 110) {
        exposureLift = Math.min(15, Math.round((110 - avgLum) * 0.22));
      }
    }

    const cFactor = contrastBoost;
    for (let i = 0; i < data.length; i += 4) {
      // Contrast stretch formula: ((pixel - 128) * contrast) + 128 + exposureLift
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * cFactor + 128 + exposureLift));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * cFactor + 128 + exposureLift));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * cFactor + 128 + exposureLift));
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (procErr) {
    console.warn("[image-processing] Pixel normalization skipped:", procErr);
  }

  // 5. WebP export with 0.82 quality (< 120KB payload target)
  let dataUrl = "";
  let format: "image/webp" | "image/jpeg" = "image/webp";

  try {
    const webp = canvas.toDataURL("image/webp", quality);
    if (webp && webp.startsWith("data:image/webp")) {
      dataUrl = webp;
      format = "image/webp";
    } else {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
      format = "image/jpeg";
    }
  } catch {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    format = "image/jpeg";
  }

  const sizeBytesApprox = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    format,
    sizeBytesApprox,
  };
}
