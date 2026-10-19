/**
 * Spadas Off-Thread Camera Frame Worker Engine
 * 
 * Offloads hardware camera frame extraction, focal cropping, pixel exposure/contrast
 * normalization, and WebP compression to a dedicated Web Worker via ImageBitmap and OffscreenCanvas.
 * 
 * Eliminates main-thread UI hitching and keeps the viewfinder locked at 60 FPS during shutter
 * capture and auto-scan cycles.
 */

import type { FocalCropOptions, FocalCropResult } from "./image-processing";

export interface FrameWorkerMessageRequest {
  type: "PROCESS_FRAME";
  id: string;
  bitmap: ImageBitmap;
  targetWidth: number;
  targetHeight: number;
  quality: number;
  contrastBoost: number;
  normalizeExposure: boolean;
}

export interface FrameWorkerMessageResponse {
  id: string;
  status: "success" | "error";
  dataUrl?: string;
  blob?: Blob;
  width?: number;
  height?: number;
  format?: "image/webp" | "image/jpeg";
  sizeBytesApprox?: number;
  avgLuminance?: number;
  error?: string;
}

/**
 * Validates whether the current environment natively supports hardware ImageBitmap transfer
 * and OffscreenCanvas in Web Workers without polyfills.
 */
export function isFrameWorkerSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof Blob !== "undefined"
  );
}

/**
 * Self-contained Worker script string. Running as an inline Blob worker ensures
 * zero network fetches, instant startup, and 100% reliability across Next.js, PWAs,
 * and Android TWA WebViews.
 */
const FRAME_WORKER_SCRIPT = `
self.onmessage = async function(e) {
  const data = e.data;
  if (!data || data.type !== "PROCESS_FRAME") return;

  const { id, bitmap, targetWidth, targetHeight, quality = 0.82, contrastBoost = 1.10, normalizeExposure = true } = data;

  try {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
      self.postMessage({ id, status: "error", error: "Failed to initialize OffscreenCanvas 2D context" });
      return;
    }

    // 1. Draw hardware bitmap to offscreen canvas and immediately release GPU texture
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    if (bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }

    // 2. High-contrast & low-light exposure normalization (performed off main thread)
    let avgLuminance = 128;
    try {
      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const pixels = imgData.data;
      const len = pixels.length;

      let totalLum = 0;
      const step = 8;
      let count = 0;
      for (let i = 0; i < len; i += 4 * step) {
        totalLum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        count++;
      }
      avgLuminance = count > 0 ? totalLum / count : 128;

      let exposureLift = 0;
      if (normalizeExposure && avgLuminance < 110) {
        exposureLift = Math.min(15, Math.round((110 - avgLuminance) * 0.22));
      }

      const cFactor = contrastBoost;
      for (let i = 0; i < len; i += 4) {
        pixels[i] = Math.min(255, Math.max(0, (pixels[i] - 128) * cFactor + 128 + exposureLift));
        pixels[i + 1] = Math.min(255, Math.max(0, (pixels[i + 1] - 128) * cFactor + 128 + exposureLift));
        pixels[i + 2] = Math.min(255, Math.max(0, (pixels[i + 2] - 128) * cFactor + 128 + exposureLift));
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (normErr) {
      // Non-fatal, continue with drawn frame
    }

    // 3. Compress to WebP or JPEG Blob
    let blob = null;
    let format = "image/webp";
    try {
      blob = await canvas.convertToBlob({ type: "image/webp", quality });
      if (!blob || blob.size < 100) {
        throw new Error("WebP blob conversion returned empty payload");
      }
    } catch (webpErr) {
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: Math.min(0.85, quality) });
      format = "image/jpeg";
    }

    if (!blob) {
      throw new Error("OffscreenCanvas convertToBlob failed to produce a valid image blob");
    }

    // 4. Convert to dataUrl off-thread if FileReaderSync is available
    let dataUrl = "";
    if (typeof FileReaderSync !== "undefined") {
      try {
        const reader = new FileReaderSync();
        dataUrl = reader.readAsDataURL(blob);
      } catch (readErr) {
        // Fallback to FileReader below
      }
    }

    if (!dataUrl && typeof FileReader !== "undefined") {
      dataUrl = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result || "");
        fr.onerror = () => resolve("");
        fr.readAsDataURL(blob);
      });
    }

    const sizeBytesApprox = dataUrl ? Math.round((dataUrl.length * 3) / 4) : blob.size;

    self.postMessage({
      id,
      status: "success",
      dataUrl,
      blob,
      width: targetWidth,
      height: targetHeight,
      format,
      sizeBytesApprox,
      avgLuminance,
    });
  } catch (err) {
    if (bitmap && typeof bitmap.close === "function") {
      try { bitmap.close(); } catch (_) {}
    }
    self.postMessage({
      id,
      status: "error",
      error: err && err.message ? err.message : String(err),
    });
  }
};
`;

let singletonWorker: Worker | null = null;
let workerBlobUrl: string | null = null;
let requestIdSeq = 0;
const pendingRequests = new Map<
  string,
  {
    resolve: (res: FocalCropResult) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  }
>();

function getOrCreateWorker(): Worker {
  if (singletonWorker) return singletonWorker;

  const blob = new Blob([FRAME_WORKER_SCRIPT], { type: "application/javascript" });
  workerBlobUrl = URL.createObjectURL(blob);
  singletonWorker = new Worker(workerBlobUrl);

  singletonWorker.onmessage = async (event: MessageEvent<FrameWorkerMessageResponse>) => {
    const res = event.data;
    if (!res || !res.id) return;

    const handler = pendingRequests.get(res.id);
    if (!handler) return;

    pendingRequests.delete(res.id);
    clearTimeout(handler.timer);

    if (res.status === "success") {
      let finalDataUrl = res.dataUrl || "";
      if (!finalDataUrl && res.blob) {
        try {
          finalDataUrl = await blobToDataUrl(res.blob);
        } catch {
          // If fallback fails, empty string will trigger outer fallback
        }
      }

      handler.resolve({
        dataUrl: finalDataUrl,
        width: res.width || 0,
        height: res.height || 0,
        format: res.format || "image/webp",
        sizeBytesApprox: res.sizeBytesApprox || 0,
      });
    } else {
      handler.reject(new Error(res.error || "Frame processing worker reported failure"));
    }
  };

  singletonWorker.onerror = (err) => {
    console.warn("[FrameWorkerEngine] Worker encountered error, resetting pool:", err);
    terminateFrameWorker();
  };

  return singletonWorker;
}

/**
 * Converts a Blob to a Data URL on the main thread as a fallback if the worker
 * environment lacks FileReaderSync.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("blobToDataUrl conversion failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Tears down and terminates the singleton worker instance and revokes blob URLs.
 */
export function terminateFrameWorker(): void {
  if (singletonWorker) {
    try {
      singletonWorker.terminate();
    } catch (_) {}
    singletonWorker = null;
  }
  if (workerBlobUrl) {
    try {
      URL.revokeObjectURL(workerBlobUrl);
    } catch (_) {}
    workerBlobUrl = null;
  }

  // Reject all pending tasks on abnormal worker termination
  for (const [id, req] of pendingRequests.entries()) {
    clearTimeout(req.timer);
    req.reject(new Error("Frame worker terminated before task completion"));
  }
  pendingRequests.clear();
}

/**
 * Executes a zero-copy hardware crop and async compression on an off-thread Web Worker.
 * 
 * 1. Takes an instantaneous ImageBitmap hardware snapshot (< 2ms on main thread).
 * 2. Transfers bitmap ownership to the worker via transferable array (zero memory copy).
 * 3. Normalizes contrast/exposure and compresses to WebP off the main thread.
 * 4. Yields 60 FPS uninterrupted viewfinder playback.
 */
export async function executeOffThreadFocalCrop(
  video: HTMLVideoElement,
  options: FocalCropOptions = {}
): Promise<FocalCropResult> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (!vw || !vh || vw <= 0 || vh <= 0) {
    throw new Error("[FrameWorkerEngine] Video element has invalid dimensions or is not ready.");
  }

  const {
    cropFactor = 0.60,
    maxDimension = 768,
    quality = 0.82,
    contrastBoost = 1.10,
    normalizeExposure = true,
  } = options;

  // 1. Calculate center 60% reticle focal bounding crop
  const cropWidth = Math.round(vw * cropFactor);
  const cropHeight = Math.round(vh * cropFactor);
  const cropX = Math.round((vw - cropWidth) / 2);
  const cropY = Math.round((vh - cropHeight) / 2);

  // 2. Constrain dimensions to maximum maxDimension while preserving aspect ratio
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

  // 3. Hardware-accelerated GPU frame snapshot and resize (< 2ms main-thread cost)
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(video, cropX, cropY, cropWidth, cropHeight, {
      resizeWidth: targetWidth,
      resizeHeight: targetHeight,
      resizeQuality: "medium",
    });
  } catch (bitmapErr) {
    throw new Error(`[FrameWorkerEngine] createImageBitmap failed: ${bitmapErr}`);
  }

  // 4. Dispatch to Web Worker pool
  const worker = getOrCreateWorker();
  const requestId = `fw_${Date.now()}_${++requestIdSeq}`;

  return new Promise<FocalCropResult>((resolve, reject) => {
    // 2500ms safety timeout protects camera loop against stalled workers
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("[FrameWorkerEngine] Task timed out waiting for worker response (2500ms)"));
    }, 2500);

    pendingRequests.set(requestId, { resolve, reject, timer });

    try {
      const msg: FrameWorkerMessageRequest = {
        type: "PROCESS_FRAME",
        id: requestId,
        bitmap,
        targetWidth,
        targetHeight,
        quality,
        contrastBoost,
        normalizeExposure,
      };

      // Transfer bitmap object to worker thread without memory duplication
      worker.postMessage(msg, [bitmap]);
    } catch (postErr) {
      clearTimeout(timer);
      pendingRequests.delete(requestId);
      try { bitmap.close(); } catch (_) {}
      reject(new Error(`[FrameWorkerEngine] postMessage failed: ${postErr}`));
    }
  });
}
