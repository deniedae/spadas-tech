/**
 * Spadas Scanner Acoustic Micro-Synthesizer
 * High-precision procedural audio feedback using the Web Audio API.
 * Zero external asset dependencies · 0ms network latency · Ultra-low CPU overhead.
 */

class ScannerAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("spadas_scanner_sound_enabled");
        if (stored !== null) {
          this.isMuted = stored === "false";
        }
      } catch {}

      // Mobile iOS/Android Safari audio unlock on first user gesture
      const unlock = () => {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            this.ctx = new AudioCtx();
          }
        }
        if (this.ctx && this.ctx.state === "suspended") {
          void this.ctx.resume();
        }
        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
      };
      window.addEventListener("click", unlock, { passive: true, once: true });
      window.addEventListener("touchstart", unlock, { passive: true, once: true });
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_scanner_sound_enabled", String(!this.isMuted));
      } catch {}
    }
    return !this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public play(
    type: "lock" | "strategy" | "loupe" | "ticket" | "tag" | "grail"
  ): void {
    if (this.isMuted) return;

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === "lock") {
        // Holographic detection lock (880Hz -> 1320Hz micro-sweep)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "strategy") {
        // Snappy frequency slide when adjusting pricing horizon
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "loupe") {
        // Crisp mechanical optical aperture shutter click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === "ticket") {
        // Digital thermal register print chirp
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.setValueAtTime(1318.51, now + 0.03); // E6

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.035);
        osc2.start(now + 0.03);
        osc2.stop(now + 0.08);
      } else if (type === "tag") {
        // In-store tag selector tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.025);
      } else if (type === "grail") {
        // Celestial major triad chord (C6 - E6 - G6) for high-margin grails
        [1046.5, 1318.51, 1567.98].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.03);
          gain.gain.setValueAtTime(0.05, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.03);
          osc.stop(now + idx * 0.03 + 0.2);
        });
      }
    } catch {
      // AudioContext failure should never disrupt UX
    }
  }
}

export const scannerAudio = new ScannerAudioEngine();
