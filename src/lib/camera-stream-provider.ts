/**
 * Unified Camera Stream Provider & Singleton Instance
 * Shared across Lens AR Mode and Snap Studio Mode to eliminate hardware locks,
 * prevent "Camera unavailable or permission denied" errors, and provide 0ms instantaneous handoffs.
 */

export interface CameraAcquireOptions {
  mode: "lens" | "studio";
  facingMode?: "environment" | "user";
}

export type CameraSubscriber = (stream: MediaStream | null, error: string | null) => void;

class CameraStreamManager {
  private activeStream: MediaStream | null = null;
  private currentMode: "lens" | "studio" | null = null;
  private currentFacingMode: "environment" | "user" = "environment";
  private subscribers = new Set<CameraSubscriber>();
  private isAcquiring = false;
  private acquisitionPromise: Promise<MediaStream> | null = null;
  private releaseTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.stopHardware();
      });
    }
  }

  getActiveStream(): MediaStream | null {
    if (
      this.activeStream &&
      this.activeStream.active &&
      this.activeStream.getVideoTracks().some((t) => t.readyState === "live")
    ) {
      return this.activeStream;
    }
    return null;
  }

  getCurrentMode(): "lens" | "studio" | null {
    return this.currentMode;
  }

  getCurrentFacingMode(): "environment" | "user" {
    return this.currentFacingMode;
  }

  async acquireCamera(options: CameraAcquireOptions): Promise<MediaStream> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("navigator.mediaDevices is not available in this environment.");
    }

    // Cancel any scheduled graceful release timer immediately upon re-acquisition
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    const targetFacing = options.facingMode || "environment";

    // 1. Instant Stream Reuse Check:
    // If an active stream exists with matching facing mode and live tracks, reuse immediately (0ms latency, zero extra permission prompts)
    const existing = this.getActiveStream();
    if (existing && this.currentFacingMode === targetFacing) {
      this.currentMode = options.mode;
      this.notifySubscribers(existing, null);
      return existing;
    }

    // 2. Prevent concurrent overlapping getUserMedia calls
    if (this.isAcquiring && this.acquisitionPromise) {
      return this.acquisitionPromise;
    }

    this.isAcquiring = true;
    this.acquisitionPromise = (async () => {
      try {
        // Cleanly stop existing tracks if switching facingMode
        if (this.activeStream) {
          try {
            this.activeStream.getTracks().forEach((t) => {
              t.stop();
              t.enabled = false;
            });
          } catch {}
          this.activeStream = null;
        }

        let stream: MediaStream | null = null;

        // Primary: Back Camera (Environment Lens with Full HD 1080p & Continuous Autofocus)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              // @ts-ignore - Hardware hints for sharpest focus
              focusMode: { ideal: "continuous" },
            },
            audio: false,
          });
        } catch {
          // Fallback 1: Flexible Environment Mode
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: targetFacing,
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch {
            // Fallback 2: Any Available Video Source
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        this.activeStream = stream;
        this.currentMode = options.mode;
        this.currentFacingMode = targetFacing;
        this.notifySubscribers(stream, null);
        return stream;
      } catch (err: any) {
        const errMsg = err?.message || "Camera unavailable or permission denied";
        this.notifySubscribers(null, errMsg);
        throw err;
      } finally {
        this.isAcquiring = false;
        this.acquisitionPromise = null;
      }
    })();

    return this.acquisitionPromise;
  }

  releaseCamera(caller?: "lens" | "studio", force = false): void {
    if (caller && this.currentMode && caller !== this.currentMode && !force) {
      return; // Do not release if another component is now the active owner
    }

    if (force) {
      this.stopHardware();
      return;
    }

    // Graceful Handover: Schedule release in 1500ms so tab transitions (Lens <-> Studio)
    // hand over the live stream seamlessly with 0ms latency and no hardware lock drops
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
    }
    this.releaseTimer = setTimeout(() => {
      this.stopHardware();
    }, 1500);
  }

  stopHardware(): void {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      this.activeStream = null;
    }
    this.currentMode = null;
    this.notifySubscribers(null, null);
  }

  subscribe(callback: CameraSubscriber): () => void {
    this.subscribers.add(callback);
    if (this.activeStream) {
      callback(this.activeStream, null);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(stream: MediaStream | null, error: string | null) {
    this.subscribers.forEach((cb) => {
      try {
        cb(stream, error);
      } catch {}
    });
  }
}

export const cameraStreamManager = new CameraStreamManager();
