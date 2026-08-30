/**
 * Spadas High-Speed Hardware Barcode & Hardware Acceleration Engine
 * Utilizes the native browser/WebView BarcodeDetector API when available (Chrome, Edge, Android WebView)
 * with zero JS overhead, 60 FPS GPU-accelerated frame analysis, Web Audio beep synthesis, and haptic feedback.
 */

// Format definitions for native BarcodeDetector
export const SUPPORTED_BARCODE_FORMATS = [
  "qr_code",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
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
 * Create and initialize a native hardware barcode detector session.
 */
export function createNativeBarcodeScanner(
  videoElement: HTMLVideoElement,
  onDetected: (result: DetectedBarcodeResult) => void,
  options?: {
    formats?: string[];
    fpsThrottle?: number;
  }
): {
  start: () => void;
  stop: () => void;
} {
  let isRunning = false;
  let animFrameId: number | null = null;
  let lastScanTime = 0;
  const throttleMs = 1000 / (options?.fpsThrottle || 45);

  if (!isNativeBarcodeDetectorSupported()) {
    return {
      start: () => console.warn("[BarcodeDetector] Native API not supported in this browser."),
      stop: () => {},
    };
  }

  const detector = new window.BarcodeDetector!({
    formats: options?.formats || (SUPPORTED_BARCODE_FORMATS as unknown as string[]),
  });

  const scanLoop = async (now: number) => {
    if (!isRunning) return;

    if (now - lastScanTime >= throttleMs && videoElement.readyState >= 2 && !videoElement.paused) {
      lastScanTime = now;
      try {
        const barcodes = await detector.detect(videoElement);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          if (first && first.rawValue) {
            onDetected(first);
          }
        }
      } catch (err) {
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
