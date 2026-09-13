/**
 * Spadas Tactile Audio & Hardware Haptic Feedback Engine
 * Ultra-low-latency synthesized soundscapes using Web Audio API (0ms audio asset latency)
 * paired with synchronized multi-stage hardware haptics for native instrument feel.
 */

// Singleton AudioContext cache
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * 1. Mechanical Shutter Sound
 * Simulates a high-end physical camera shutter:
 * Dual-stage mechanical blade click + physical aperture mirror recoil + spring dampening.
 */
export function playMechanicalShutterSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Stage 1: Initial Shutter Blade Click (White Noise Burst through high-pass filter)
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1200, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // Stage 2: Mechanical Mirror Recoil (Low Thump + Metallic Ring)
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = "triangle";
    thumpOsc.frequency.setValueAtTime(160, now + 0.015);
    thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.065);

    thumpGain.gain.setValueAtTime(0, now);
    thumpGain.gain.setValueAtTime(0.4, now + 0.015);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(now + 0.015);
    thumpOsc.stop(now + 0.08);

    // Stage 3: Secondary Shutter Release Click
    const releaseOsc = ctx.createOscillator();
    const releaseGain = ctx.createGain();
    releaseOsc.type = "sine";
    releaseOsc.frequency.setValueAtTime(2400, now + 0.05);
    releaseOsc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

    releaseGain.gain.setValueAtTime(0, now);
    releaseGain.gain.setValueAtTime(0.18, now + 0.05);
    releaseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    releaseOsc.connect(releaseGain);
    releaseGain.connect(ctx.destination);
    releaseOsc.start(now + 0.05);
    releaseOsc.stop(now + 0.09);
  } catch {}
}

/**
 * 2. Optical Target Lock Chime
 * Resonant dual-frequency harmonic tone when an object or text is acquired.
 */
export function playLockOnChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [1046.5, 2093.0]; // C6 & C7 harmonic

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.15, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.13);
    });
  } catch {}
}

/**
 * 3. Cop / Grail Cash Chime
 * Multi-frequency harmonic chord (C6 - E6 - G6 - C7) for high-profit "MUST COP" / "QUICK FLIP" hits.
 */
export function playCashCopChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const chord = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.18, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.36);
    });
  } catch {}
}

/**
 * 4. Rotary Dial & Instrument Micro-Tick
 * Ultra-crisp mechanical micro-tick for zoom switching, mode changes, and tool toggles.
 */
export function playTactileClickSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.012);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.015);
  } catch {}
}

/**
 * 5. Level Snapped Chime
 * Subtle affirmative tick when gyro horizon level locks green (0° roll).
 */
export function playLevelLockSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now); // A5

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  } catch {}
}

/* ==========================================================================
   Tactile Hardware Haptic Vibration Patterns
   ========================================================================== */

export function triggerShutterHaptic(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([15, 25, 35]); // Dual-stage mechanical recoil
    }
  } catch {}
}

export function triggerLockOnHaptic(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([20, 30, 20]); // Double-tap lock
    }
  } catch {}
}

export function triggerGrailHaptic(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([40, 25, 40, 25, 80]); // Celebratory flourish
    }
  } catch {}
}

export function triggerDialTickHaptic(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(8); // Ultra-light micro-tick
    }
  } catch {}
}

export function triggerLevelLockHaptic(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  } catch {}
}
