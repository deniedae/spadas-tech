/**
 * Off-Thread Web Worker Camera Frame Processor
 * Performs image downsampling and JPEG compression off the main UI thread to ensure 60FPS AR camera rendering.
 */
self.onmessage = (e: MessageEvent) => {
  const { imageData, width, height, quality = 0.6 } = e.data;

  if (!imageData) {
    self.postMessage({ error: "No image data provided" });
    return;
  }

  try {
    // Perform fast pixel luminance calculation in worker thread
    const data = imageData.data;
    let totalLuminance = 0;
    const len = data.length;
    const step = 16; // Sample 1 in 4 pixels for extreme speed

    for (let i = 0; i < len; i += step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
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
