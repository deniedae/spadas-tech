/**
 * Off-Thread Web Worker Camera Frame Processor
 * Performs ImageBitmap focal cropping, pixel contrast/exposure normalization,
 * and WebP/JPEG compression off the main UI thread to ensure 60FPS AR camera rendering.
 */
self.onmessage = async (e: MessageEvent) => {
  const data = e.data;
  if (!data) return;

  // 1. OffscreenCanvas + ImageBitmap pipeline
  if (data.type === "PROCESS_FRAME") {
    const { id, bitmap, targetWidth, targetHeight, quality = 0.82, contrastBoost = 1.10, normalizeExposure = true } = data;

    try {
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        if (bitmap && typeof bitmap.close === "function") bitmap.close();
        self.postMessage({ id, status: "error", error: "Failed to initialize OffscreenCanvas context" });
        return;
      }

      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      if (bitmap && typeof bitmap.close === "function") {
        bitmap.close();
      }

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
      } catch (_) {}

      let blob: Blob | null = null;
      let format = "image/webp";
      try {
        blob = await canvas.convertToBlob({ type: "image/webp", quality });
        if (!blob || blob.size < 100) throw new Error("Empty WebP blob");
      } catch (_) {
        blob = await canvas.convertToBlob({ type: "image/jpeg", quality: Math.min(0.85, quality) });
        format = "image/jpeg";
      }

      let dataUrl = "";
      const SyncReader = (globalThis as any).FileReaderSync;
      if (typeof SyncReader !== "undefined" && blob) {
        try {
          const reader = new SyncReader();
          dataUrl = reader.readAsDataURL(blob);
        } catch (_) {}
      }

      const sizeBytesApprox = dataUrl ? Math.round((dataUrl.length * 3) / 4) : (blob?.size || 0);

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
    } catch (err: any) {
      if (bitmap && typeof bitmap.close === "function") {
        try { bitmap.close(); } catch (_) {}
      }
      self.postMessage({ id, status: "error", error: err?.message || String(err) });
    }
    return;
  }

  // 2. Legacy luminance calculation fallback
  const { imageData, width, height } = data;
  if (!imageData) {
    self.postMessage({ error: "No image data provided" });
    return;
  }

  try {
    const pixels = imageData.data;
    let totalLuminance = 0;
    const len = pixels.length;
    const step = 16;

    for (let i = 0; i < len; i += step) {
      totalLuminance += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    }

    const avgLuminance = totalLuminance / (len / step);

    self.postMessage({
      status: "success",
      avgLuminance,
      width,
      height,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    self.postMessage({ error: err?.message || "Worker processing error" });
  }
};
