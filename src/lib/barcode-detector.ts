/**
 * Spadas High-Speed Hardware Barcode & Hardware Acceleration Engine
 * Utilizes the native browser/WebView BarcodeDetector API when available (Chrome, Edge, Android WebView)
 * with zero JS overhead, 60 FPS GPU-accelerated frame analysis, Web Audio beep synthesis, and haptic feedback.
 */

// Format definitions for native BarcodeDetector
export const CORE_BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "qr_code",
] as const;

export const SUPPORTED_BARCODE_FORMATS = [
  ...CORE_BARCODE_FORMATS,
  "code_39",
  "code_93",
  "itf",
  "data_matrix",
  "aztec",
] as const;

export type BarcodeFormat = (typeof SUPPORTED_BARCODE_FORMATS)[number];

export interface DetectedBarcodeResult {
  rawValue: string;
  format: string;
  cornerPoints?: { x: number; y: number }[];
  boundingBox?: DOMRectReadOnly;
}

// Global ambient declaration for window.BarcodeDetector
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): {
        detect(image: ImageBitmapSource): Promise<DetectedBarcodeResult[]>;
      };
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

/**
 * Check if the browser or WebView supports the native BarcodeDetector API.
 */
export function isNativeBarcodeDetectorSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.BarcodeDetector === "function";
}

/**
 * High-frequency pleasant synth beep using Web Audio API (zero audio file latency).
 */
export function playScanBeep(frequency = 1800, durationMs = 70): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    // Slight pitch drop for a satisfying retail scanner beep
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.15, ctx.currentTime + durationMs / 1000);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, durationMs + 50);
  } catch {
    // AudioContext may be restricted by autoplay policy before user gesture
  }
}

/**
 * Tactile haptic vibration for successful scan recognition.
 */
export function triggerScanHaptic(pattern: number | number[] = [45, 25, 45]): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Haptics not supported or permission denied
  }
}

/**
 * Toggle native hardware torch/flashlight on the camera stream track.
 */
export async function toggleCameraTorch(stream: MediaStream | null, enable: boolean): Promise<boolean> {
  if (!stream) return false;

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return false;

  const capabilities = videoTrack.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;

  if (capabilities && capabilities.torch) {
    try {
      await (videoTrack as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: enable }],
      });
      return true;
    } catch (e) {
      console.warn("[BarcodeDetector] Failed to apply torch constraint:", e);
      return false;
    }
  }
  return false;
}

/**
 * Safely create a native BarcodeDetector instance with supported formats.
 */
async function getSafeNativeBarcodeDetector(requestedFormats?: string[]) {
  if (!isNativeBarcodeDetectorSupported()) return null;
  try {
    let formats = requestedFormats || (CORE_BARCODE_FORMATS as unknown as string[]);
    if (typeof window.BarcodeDetector?.getSupportedFormats === "function") {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (Array.isArray(supported) && supported.length > 0) {
          formats = formats.filter((f) => supported.includes(f));
        }
      } catch {
        // Fallback to core formats
      }
    }
    if (formats.length === 0) {
      return new window.BarcodeDetector!();
    }
    return new window.BarcodeDetector!({ formats });
  } catch (err) {
    console.warn("[BarcodeDetector] Custom formats initialization failed, falling back to default:", err);
    try {
      return new window.BarcodeDetector!();
    } catch {
      return null;
    }
  }
}

/**
 * Decode barcode from a single image/canvas/video source on demand.
 */
export async function decodeBarcodeFromImageSource(
  source: ImageBitmapSource
): Promise<DetectedBarcodeResult | null> {
  if (typeof window === "undefined") return null;

  // 1. Try native BarcodeDetector
  if (isNativeBarcodeDetectorSupported()) {
    try {
      const detector = await getSafeNativeBarcodeDetector();
      if (detector) {
        const barcodes = await detector.detect(source);
        if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
          return barcodes[0];
        }
      }
    } catch {
      // Continue to ZXing fallback
    }
  }

  // 2. Try ZXing fallback on canvas / video element
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/library");
    const reader = new BrowserMultiFormatReader();
    if (source instanceof HTMLVideoElement) {
      const result = await reader.decodeFromVideoElement(source);
      if (result && result.getText()) {
        return {
          rawValue: result.getText(),
          format: result.getBarcodeFormat() ? result.getBarcodeFormat().toString() : "barcode",
        };
      }
    } else if (source instanceof HTMLCanvasElement) {
      const dataUrl = source.toDataURL("image/jpeg", 0.95);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => {
        if (img.complete) res(null);
        else img.onload = () => res(null);
      });
      const result = await reader.decodeFromImageElement(img);
      if (result && result.getText()) {
        return {
          rawValue: result.getText(),
          format: result.getBarcodeFormat() ? result.getBarcodeFormat().toString() : "barcode",
        };
      }
    }
  } catch {
    // No barcode decoded
  }

  return null;
}

/**
 * Create and initialize a native hardware barcode detector session.
 */
export function createNativeBarcodeScanner(
  videoElement: HTMLVideoElement,
  onDetected: (result: DetectedBarcodeResult) => void,
  options?: {
    formats?: string[];
    fpsThrottle?: number;
    samplingIntervalMs?: number;
  }
): {
  start: () => void;
  stop: () => void;
} {
  let isRunning = false;
  let animFrameId: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastScanTime = 0;
  const throttleMs = options?.samplingIntervalMs || (options?.fpsThrottle ? 1000 / options.fpsThrottle : 180);

  const hasNative = isNativeBarcodeDetectorSupported();

  // 1. Native BarcodeDetector (Chrome, Edge, Android WebView)
  if (hasNative) {
    let detectorPromise = getSafeNativeBarcodeDetector(options?.formats);

    const scanLoop = async (now: number) => {
      if (!isRunning) return;

      if (now - lastScanTime >= throttleMs && videoElement.readyState >= 2 && !videoElement.paused) {
        lastScanTime = now;
        try {
          const detector = await detectorPromise;
          if (detector) {
            const barcodes = await detector.detect(videoElement);
            if (barcodes && barcodes.length > 0) {
              const first = barcodes[0];
              if (first && first.rawValue) {
                onDetected(first);
              }
            }
          }
        } catch {
          // Frame might be blank or video in transition, continue loop
        }
      }

      if (isRunning) {
        animFrameId = requestAnimationFrame(scanLoop);
      }
    };

    return {
      start: () => {
        if (isRunning) return;
        isRunning = true;
        lastScanTime = 0;
        animFrameId = requestAnimationFrame(scanLoop);
      },
      stop: () => {
        isRunning = false;
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      },
    };
  }

  // 2. Dynamic ZXing fallback (Safari, Firefox, legacy WebView)
  let zxingReader: any = null;

  const startZxingFallback = async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/library");
      zxingReader = new BrowserMultiFormatReader();

      intervalId = setInterval(async () => {
        if (!isRunning || !videoElement || videoElement.readyState < 2 || videoElement.paused) {
          return;
        }

        try {
          const vw = videoElement.videoWidth;
          const vh = videoElement.videoHeight;
          if (vw === 0 || vh === 0) return;

          const result = await zxingReader.decodeFromVideoElement(videoElement);
          if (result && result.getText()) {
            onDetected({
              rawValue: result.getText(),
              format: result.getBarcodeFormat() ? result.getBarcodeFormat().toString() : "barcode",
            });
          }
        } catch {
          // No barcode in frame, silently continue sampling loop
        }
      }, throttleMs);
    } catch (err) {
      console.warn("[BarcodeDetector] ZXing fallback failed to initialize:", err);
    }
  };

  return {
    start: () => {
      if (isRunning) return;
      isRunning = true;
      void startZxingFallback();
    },
    stop: () => {
      isRunning = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (zxingReader) {
        try {
          zxingReader.reset();
        } catch {}
      }
    },
  };
}
