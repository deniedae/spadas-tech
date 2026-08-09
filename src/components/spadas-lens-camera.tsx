"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Volume2, VolumeX, Sparkles, CheckCircle2, RefreshCw, Zap, ShieldAlert, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";

interface DetectedHit {
  id: string;
  name: string;
  category: string;
  condition: string;
  estimatedValue: number;
  estCost: number;
  estimatedProfit: number;
  estRoi: number;
  verdict: "BUY" | "CAUTION" | "PASS";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number }; // percentage coords
  timestamp: number;
}

// Stop-words list for debouncer filtering
const STOP_WORDS = new Set([
  "with", "in", "the", "and", "a", "an", "of", "for", "to", "on", "at", "by",
  "mens", "womens", "original", "box", "item", "used", "new", "style", "type",
  "authentic", "vintage", "retro", "brand", "edition", "set", "pack", "lot"
]);

// Keyword Similarity Checker with Stop-Word Filtering
function getKeywordSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/'s\b/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const words1 = normalize(str1);
  const words2 = normalize(str2);

  if (words1.length === 0 || words2.length === 0) {
    const raw1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length >= 2);
    const raw2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length >= 2);
    if (raw1.length === 0 || raw2.length === 0) return 0;
    const s1 = new Set(raw1);
    const s2 = new Set(raw2);
    let common = 0;
    s1.forEach((w) => { if (s2.has(w)) common++; });
    return common / Math.max(s1.size, s2.size);
  }

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  let common = 0;
  set1.forEach((w) => {
    if (set2.has(w)) common++;
  });

  const minSize = Math.min(set1.size, set2.size);
  const maxSize = Math.max(set1.size, set2.size);
  const dice = (2 * common) / (set1.size + set2.size);
  const minOverlap = common / minSize;
  const maxOverlap = common / maxSize;

  return Math.max(dice, minOverlap, maxOverlap);
}

// Strict Vacuum Cleaner Filter
function isVacuumCleaner(name: string, category: string): boolean {
  const text = `${name} ${category}`.toLowerCase();
  return /\b(vacuum|cleaner|hoover|roomba|dyson\s*v\d+|bissel|eureka|dustbuster|shop-vac|sweeper)\b/i.test(text);
}

// Strict Hardware & Electronics Filter
function isHardwareOrElectronics(name: string, category: string): boolean {
  const text = `${name} ${category}`.toLowerCase();
  return /\b(hardware|electronics|console|playstation|xbox|nintendo|gpu|graphics card|cpu|motherboard|laptop|computer|phone|tablet|headset|audio|amplifier|receiver|camera|gadget|appliance|power tool|drill|saw|monitor|display)\b/i.test(text);
}

export default function SpadasLensCamera() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScanActive, setAutoScanActive] = useState(true);
  const [analyzingRealFrame, setAnalyzingRealFrame] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [activeHits, setActiveHits] = useState<DetectedHit[]>([]);
  const [capturedLog, setCapturedLog] = useState<DetectedHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Track last chimed item for anti-spam loop prevention
  const lastChimedRef = useRef<{ name: string; time: number } | null>(null);

  // Selectable Hit Cards Helpers
  const toggleSelectHit = (id: string) => {
    setSelectedHitIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllHits = () => {
    if (selectedHitIds.length === capturedLog.length) {
      setSelectedHitIds([]);
    } else {
      setSelectedHitIds(capturedLog.map((h) => h.id));
    }
  };

  // Export Selected Hits to AI Listing Generator / Drafts
  const exportSelectedHits = async () => {
    const selectedHits = capturedLog.filter((h) => selectedHitIds.includes(h.id));
    if (selectedHits.length === 0) return;

    setExporting(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("spadas_lens_exported_drafts", JSON.stringify(selectedHits));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        for (const hit of selectedHits) {
          await createListing({
            userId: user.id,
            product: hit.name,
            price: hit.estimatedValue,
            cost: hit.estCost,
            status: "Draft",
            description: `Identified via Spadas Lens AR Scanner. Category: ${hit.category}. Condition: ${hit.condition}. Est. Net Profit: A$${hit.estimatedProfit.toFixed(2)}`,
          });
        }
      }

      toast.success(`Successfully exported ${selectedHits.length} hit(s) to Drafts!`);
      router.push(`/generator?fromLens=true&exportedCount=${selectedHits.length}`);
    } catch (err) {
      console.error("Export to drafts error:", err);
      toast.error("Failed to export drafts.");
    } finally {
      setExporting(false);
    }
  };

  // Bind stream to video element whenever stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.error("Video play error:", err));
    }
  }, [stream]);

  // Start Camera Stream with smooth 60fps raw video feed
  const startCamera = async () => {
    try {
      setCameraError(null);
      let mediaStream: MediaStream | null = null;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 60, min: 30 },
          },
          audio: false,
        });
      } catch {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 60 },
            },
            audio: false,
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      setStream(mediaStream);
      setScanning(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission blocked or unavailable. Please enable camera access in browser settings.");
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setScanning(false);
    setActiveHits([]);
  };

  // Speak Voice Cue
  const speakCue = (text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  // Lightweight AudioContext Chime for High-Signal ($20+ Profit) Hits
  const playHighProfitChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      osc2.frequency.setValueAtTime(880, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.22);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.04);
      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } catch (e) {
      console.error("AudioContext chime error:", e);
    }
  };

  // Frame scanner with Fail-Safe Async Lock Release & 1500ms Rate Limit Protection
  const processCurrentFrame = useCallback(async () => {
    if (!videoRef.current || analyzingRealFrame) return;
    setAnalyzingRealFrame(true);

    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const fullWidth = video.videoWidth || 640;
      const fullHeight = video.videoHeight || 480;

      const cropW = Math.round(fullWidth * 0.65);
      const cropH = Math.round(fullHeight * 0.75);
      const cropX = Math.round((fullWidth - cropW) / 2);
      const cropY = Math.round((fullHeight - cropH) / 2);

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(1280, cropW);
      canvas.height = Math.min(1280, cropH);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const res = await fetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: [frameDataUrl] }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        toast.error("API Rate Limit (429) - Retrying in 1.5s...", { id: "ar-rate-limit-toast" });
        setActiveHits([]);
        return;
      }

      if (!res.ok) throw new Error(`AI frame scan failed (${res.status}).`);

      setRateLimited(false);
      const data = await res.json();

      // 1. CENTER-WEIGHTED VISION: Drop frame if no clear centered subject is detected
      if (!data.analysis?.product_name || data.analysis.product_name === "NO_CENTER_ITEM") {
        setActiveHits([]);
        return;
      }

      const productName = data.analysis.product_name;
      const category = data.analysis.category || "Scanned Item";

      // 2. STRICT EXCLUSION: Ignore vacuum cleaners
      if (isVacuumCleaner(productName, category)) {
        setActiveHits([]);
        return;
      }

      // 3. STRICT CONDITION DEFAULT: Hardware/electronics assume untested/parts-only
      let rawMin = Number(data.suggested_price_min) || 20;
      let rawMax = Number(data.suggested_price_max) || rawMin;
      let baseVal = Math.round(((rawMin + rawMax) / 2) * 100) / 100;
      let itemCondition = data.analysis.condition || "Used";

      if (isHardwareOrElectronics(productName, category)) {
        itemCondition = "Untested / Faulty / Parts-Only";
        baseVal = Math.round(baseVal * 0.45 * 100) / 100;
      }

      let estCost = Math.max(2, Math.round(baseVal * 0.35));
      let estimatedProfit = Math.max(0, Math.round((baseVal - estCost) * 100) / 100);
      let estRoi = estCost > 0 ? Math.round((estimatedProfit / estCost) * 100) : 0;
      const now = Date.now();

      // Extract primary brand word (e.g. "EFM", "Sony", "JBL", "Nike")
      const getBrandWord = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase() || "";
      const primaryBrand = getBrandWord(productName);

      // Check if item matches a recently scanned item within 15s (>= 55% similarity OR exact brand match)
      const cachedMatch = capturedLog.find((item) => {
        const isWithin15s = now - (item.timestamp || 0) <= 15000;
        const similarity = getKeywordSimilarity(item.name, productName);
        const itemBrand = getBrandWord(item.name);
        const isSameBrand = primaryBrand && itemBrand && primaryBrand.length >= 2 && primaryBrand === itemBrand;
        return isWithin15s && (similarity >= 0.55 || isSameBrand);
      });

      // Price Caching & Lock-in: Inherit locked-in price, title, and stats if debounced match exists
      if (cachedMatch) {
        baseVal = cachedMatch.estimatedValue;
        estCost = cachedMatch.estCost;
        estimatedProfit = cachedMatch.estimatedProfit;
        estRoi = cachedMatch.estRoi;
      }

      const realHit: DetectedHit = {
        id: cachedMatch ? cachedMatch.id : `real-frame-${now}`,
        name: cachedMatch ? cachedMatch.name : productName,
        category,
        condition: itemCondition,
        estimatedValue: baseVal,
        estCost,
        estimatedProfit,
        estRoi,
        verdict: estimatedProfit > 15 ? "BUY" : "CAUTION",
        confidence: 0.98,
        bbox: {
          x: 20,
          y: 15,
          width: 60,
          height: 70,
        },
        timestamp: now,
      };

      setActiveHits([realHit]);

      // 4. DEBOUNCING: Update timestamp on existing hit or add new hit (55% threshold / brand lock, 15s window)
      setCapturedLog((prev) => {
        const existingIdx = prev.findIndex((item) => {
          const isWithin15s = now - (item.timestamp || 0) <= 15000;
          const similarity = getKeywordSimilarity(item.name, productName);
          const itemBrand = getBrandWord(item.name);
          const isSameBrand = primaryBrand && itemBrand && primaryBrand.length >= 2 && primaryBrand === itemBrand;
          return isWithin15s && (similarity >= 0.55 || isSameBrand);
        });

        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            timestamp: now,
            estimatedValue: baseVal,
            estCost,
            estimatedProfit,
            estRoi,
          };
          return updated;
        } else {
          return [realHit, ...prev].slice(0, 10);
        }
      });

      // 5. HIGH-SIGNAL AUDIO CUE ($20+ Net Profit Threshold & Anti-Spam Looping)
      if (estimatedProfit > 20) {
        const lastChimed = lastChimedRef.current;
        const isSameProduct = lastChimed && getKeywordSimilarity(lastChimed.name, productName) >= 0.55;
        const isCooldownActive = lastChimed && (now - lastChimed.time < 15000);

        if (!isSameProduct || !isCooldownActive) {
          playHighProfitChime();
          speakCue(`High profit hit: ${productName}. Profit ${fmtMoney(estimatedProfit)}.`);
          lastChimedRef.current = { name: productName, time: now };
        }
      }
    } catch (err: any) {
      console.error("Live camera Vision scan error:", err);
      setActiveHits([]);
      if (err?.message?.includes("429")) {
        setRateLimited(true);
        toast.error("API Rate Limit (429) - Retrying in 1.5s...", { id: "ar-rate-limit-toast" });
      }
    } finally {
      // GUARANTEED UNLOCK: Always release state lock regardless of API error or early exit
      setAnalyzingRealFrame(false);
    }
  }, [analyzingRealFrame, soundEnabled]);

  // Throttled Continuous AR Scanner Loop (1.5 seconds delay between frames)
  useEffect(() => {
    if (!scanning || !autoScanActive) return;

    let timeoutId: NodeJS.Timeout;

    const scheduleThrottledScan = () => {
      timeoutId = setTimeout(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          if (!analyzingRealFrame) {
            void processCurrentFrame().finally(() => {
              scheduleThrottledScan();
            });
          } else {
            scheduleThrottledScan();
          }
        } else {
          scheduleThrottledScan();
        }
      }, 1500); // 1.5s interval to prevent OpenAI 429 Rate Limits & reduce battery drain
    };

    scheduleThrottledScan();

    return () => clearTimeout(timeoutId);
  }, [scanning, autoScanActive, processCurrentFrame, analyzingRealFrame]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* Video Viewport Container */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-slate-950 shadow-2xl">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-3 text-slate-300">
            <ShieldAlert className="h-12 w-12 text-amber-400" />
            <p className="text-sm font-semibold">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white shadow-md hover:bg-cyan-500"
            >
              <RefreshCw className="h-4 w-4" /> Retry Camera Access
            </button>
          </div>
        ) : stream ? (
          <>
            {/* Raw Camera Video Stream running smooth at 60fps */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Target Framing Reticle */}
            <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
              <div className="relative w-[65%] h-[75%] max-w-[340px] max-h-[460px] rounded-2xl border border-cyan-400/50 flex flex-col justify-between p-3">
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br" />

                {/* Conditional Rendering: Hide helper text when hit evaluation is active */}
                {activeHits.length === 0 && (
                  <div className="w-full text-center mt-2">
                    <span className="inline-block rounded-full bg-slate-950/85 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-cyan-300 border border-cyan-400/40 shadow-lg">
                      🎯 CENTER ITEM INSIDE BOX & PRESS SCAN NOW
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ruthlessly Clean AR Bounding Box Overlays */}
            {activeHits.map((hit) => (
              <div
                key={hit.id}
                style={{
                  left: `${hit.bbox.x}%`,
                  top: `${hit.bbox.y}%`,
                  width: `${hit.bbox.width}%`,
                  height: `${hit.bbox.height}%`,
                }}
                className="absolute z-20 pointer-events-none transition-all duration-200 border-2 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
              >
                {/* Minimal High-Contrast Text Overlay Header */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-slate-950/95 text-white border border-emerald-400/80 rounded-md px-2.5 py-1 text-xs font-bold shadow-2xl whitespace-nowrap z-30">
                  <span className="text-slate-100 font-extrabold truncate max-w-[180px]">{hit.name}</span>
                  <span className="bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded text-[11px] font-black tracking-tight">
                    +${hit.estimatedProfit.toFixed(2)} Profit
                  </span>
                </div>
              </div>
            ))}
          </>
        ) : (
          /* Placeholder View before starting */
          <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <Camera className="h-8 w-8 text-cyan-400" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-xl font-bold">Start Spadas Lens Live Stream</h3>
              <p className="text-xs text-slate-300">
                Pan your camera across clothing racks or store shelves. Spadas Lens continuous scanner runs center-weighted frame processing throttled at 2-3 FPS.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-8 text-sm font-bold text-white shadow-xl hover:opacity-90 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" /> Launch Continuous AR Scanner
            </button>
          </div>
        )}

        {/* Camera Controls Bar */}
        {stream && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/85 backdrop-blur-md p-3 border border-white/20">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={`h-2 w-2 rounded-full animate-pulse ${rateLimited ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className={rateLimited ? "text-amber-300" : "text-cyan-300"}>
                {rateLimited
                  ? "API Rate Limit - Retrying in 1.5s..."
                  : analyzingRealFrame
                  ? "Analyzing Center Subject..."
                  : "Continuous AR Scanner (1.5s)"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoScanActive(!autoScanActive)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                  autoScanActive
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-white/10 text-white border border-white/20"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{autoScanActive ? "Auto-Scan: ON" : "Paused"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!analyzingRealFrame) {
                    void processCurrentFrame();
                  }
                }}
                disabled={analyzingRealFrame}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition ${
                  analyzingRealFrame
                    ? "bg-gray-600/50 text-gray-400"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                {analyzingRealFrame ? "Scanning..." : "Scan Now"}
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                <span>{soundEnabled ? "Audio Cues ON" : "Muted"}</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex h-9 items-center rounded-xl bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-500 cursor-pointer"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selectable Real-Time Hits Feed */}
      {capturedLog.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Real-Time Scanned Hits ({capturedLog.length})
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={selectAllHits}
                className="text-[11px] font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                {selectedHitIds.length === capturedLog.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-[11px] text-muted-foreground">Tap cards to select</span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {capturedLog.map((item) => {
              const isSelected = selectedHitIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectHit(item.id)}
                  className={`relative cursor-pointer transition-all rounded-lg border p-2.5 px-3 space-y-1 ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/15 shadow-[0_0_12px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400"
                      : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectHit(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                      />
                      <span className="text-[11px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 uppercase tracking-tight">
                        +${item.estimatedProfit.toFixed(2)} Profit
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      Updated
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate leading-snug">{item.name}</h4>
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-muted-foreground text-[10px]">{item.condition}</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{fmtMoney(item.estimatedValue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Bottom Export FAB */}
      {selectedHitIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <button
            type="button"
            onClick={exportSelectedHits}
            disabled={exporting}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-7 py-3 text-sm font-extrabold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <Sparkles className="h-4.5 w-4.5" />
            <span>{exporting ? "Exporting..." : `Export ${selectedHitIds.length} Hit${selectedHitIds.length > 1 ? "s" : ""} to Drafts`}</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}



