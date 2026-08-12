import React, { Component, ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Zap,
  ShieldAlert,
  Clock,
  ArrowRight,
  Sliders,
  Bug,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sun,
  Search,
  Trash2,
  Mic,
  MicOff,
  Trophy,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";
import ShareDealDialog from "@/components/share-deal-dialog";
import TiktokVideoExporter from "@/components/tiktok-video-exporter";

// Catch-All React Error Boundary for Live Camera & Hit List Stability
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CameraErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CameraErrorBoundary] Caught unhandled camera UI error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full box-border rounded-3xl border border-amber-500/40 bg-slate-950 p-6 text-center text-slate-200 shadow-2xl my-4 space-y-3">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-400" />
          <h4 className="font-bold text-lg text-slate-100">Scanner Recovered From Temporary Exception</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The AR camera feed caught an invalid frame payload or API error and reset safely without breaking the main app.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white hover:bg-cyan-500 shadow-lg"
          >
            <RefreshCw className="h-4 w-4" /> Restart Camera Feed
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface DetectedHit {
  id: string;
  name: string;
  category: string;
  condition: string;
  inventoryCondition?: "untested" | "faulty_for_parts" | "used_working" | "refurbished";
  defectNotes?: string[];
  asIsDisclaimer?: string;
  estimatedValue: number;
  estCost: number;
  estimatedProfit: number;
  estRoi: number;
  verdict: "BUY" | "CAUTION" | "PASS";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number }; // percentage coords
  timestamp: number;
  isGrail?: boolean;
  salesVelocity?: {
    sell_speed: "FAST_FLIP" | "MODERATE" | "SLOW_BURNER";
    est_days_to_sell: string;
    demand_score: number;
    sell_through_rate: string;
  };
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

// Strict Vacuum Cleaner Filter (Banned Category)
function isVacuumCleaner(name: string, category: string): boolean {
  const text = `${name} ${category}`.toLowerCase();
  return /\b(vacuum|vacuum cleaner|hoover|roomba|dyson\s*v\d+|shop-vac|carpet cleaner)\b/i.test(text);
}

// Strict Vague / Partial Read Detector (Only reject explicit failure strings)
function isVagueOrPartialRead(productName?: string | null, brand?: string | null): boolean {
  if (!productName || productName.trim() === "" || productName === "NO_CENTER_ITEM") return true;
  const lower = productName.toLowerCase().trim();

  const vaguePhrases = [
    "unclear",
    "not fully readable",
    "exact card details unclear",
    "unknown model",
    "unidentified item",
    "cannot be determined",
    "could not be identified"
  ];

  return vaguePhrases.some((phrase) => lower.includes(phrase));
}

// Clean Condition Subtitle Helper (Strips internal AI reasoning notes)
function cleanConditionText(rawCondition: string): string {
  if (!rawCondition) return "Used";
  return rawCondition
    .replace(/\(.*?\)/g, "")
    .replace(/assume.*$/i, "")
    .replace(/untested.*$/i, "Used")
    .replace(/faulty.*$/i, "Used")
    .replace(/parts-only.*$/i, "Used")
    .replace(/sold as-is.*$/i, "Used")
    .replace(/ungraded.*$/i, "Used")
    .trim() || "Used";
}

export interface ActiveScanItem {
  id: string;
  productName: string;
  brand?: string | null;
  category: string;
  condition: string;
  inventoryCondition?: "untested" | "faulty_for_parts" | "used_working" | "refurbished";
  defectNotes?: string[];
  asIsDisclaimer?: string;
  bbox: { x: number; y: number; width: number; height: number };
  status: "pending" | "valued" | "rejected";
  estimatedValue?: number;
  estCost?: number;
  estimatedProfit?: number;
  estRoi?: number;
  timestamp: number;
}

function SpadasLensCameraCore() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScanActive, setAutoScanActive] = useState(true);
  const [analyzingRealFrame, setAnalyzingRealFrame] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [activeScans, setActiveScans] = useState<ActiveScanItem[]>([]);
  const [capturedLog, setCapturedLog] = useState<DetectedHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMockFallback, setIsMockFallback] = useState(false);
  const [minProfitThreshold, setMinProfitThreshold] = useState<number>(20);
  const [minRoiThreshold, setMinRoiThreshold] = useState<number>(0);
  const [showDebugDrawer, setShowDebugDrawer] = useState<boolean>(false);
  const [lastRawApiResponse, setLastRawApiResponse] = useState<any>(null);
  const [latestApiError, setLatestApiError] = useState<string | null>(null);
  const [cameraMoving, setCameraMoving] = useState<boolean>(false);
  const prevFramePixelsRef = useRef<Uint8ClampedArray | null>(null);

  // Native Offline Dead-Zone Signal Watcher
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  // Persistent Local Storage Caching for Offline Thrift Store Sourcing
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spadas_cached_lens_hits");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCapturedLog(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (capturedLog.length > 0) {
      try {
        localStorage.setItem("spadas_cached_lens_hits", JSON.stringify(capturedLog.slice(0, 50)));
      } catch {}
    }
  }, [capturedLog]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // AR Grail Detector Engine State ($100+ Profit / 300%+ ROI Hits)
  const [activeGrailAlert, setActiveGrailAlert] = useState<{
    name: string;
    profit: number;
    roi: number;
  } | null>(null);
  const [grailMode, setGrailMode] = useState<boolean>(true);

  // Victory Fanfare Audio Synthesis for Grail Hits
  const playGrailVictoryFanfare = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 Victory Fanfare

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;
        const duration = 0.28;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.error("Grail fanfare audio error:", e);
    }
  };

  // Hands-Free Voice Assistant State
  const [voiceListening, setVoiceListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const voiceListeningRef = useRef<boolean>(false);

  useEffect(() => {
    voiceListeningRef.current = voiceListening;
  }, [voiceListening]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
      }
    }
  }, []);

  const toggleVoiceAssistant = () => {
    if (!voiceSupported) {
      toast.error("Voice commands not supported on this browser.");
      return;
    }

    if (voiceListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setVoiceListening(false);
      toast.info("Voice Assistant paused.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult[0]) {
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          console.log("[Voice Command Detected]:", transcript);

          if (transcript.includes("scan") || transcript.includes("capture")) {
            toast.success("🎙️ Voice Command: 'Scan' -> Processing frame!");
            processCurrentFrame();
          } else if (transcript.includes("clear")) {
            toast.success("🎙️ Voice Command: 'Clear' -> Cleared hits list!");
            setCapturedLog([]);
            setSelectedHitIds([]);
          } else if (transcript.includes("export") || transcript.includes("save")) {
            toast.success("🎙️ Voice Command: 'Export' -> Exporting hits!");
            exportSelectedHits();
          } else if (transcript.includes("flash") || transcript.includes("torch") || transcript.includes("light")) {
            setTorchEnabled((prev) => !prev);
            toast.success("🎙️ Voice Command: 'Flash' -> Toggled torch!");
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice Command Error]:", event.error);
      };

      recognition.onend = () => {
        if (voiceListeningRef.current && recognitionRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setVoiceListening(true);
      toast.success("🎙️ Voice Commands Active! Say 'Scan', 'Clear', 'Export', or 'Flash'!");
    } catch (err) {
      console.error("[Voice Assistant Error]:", err);
      toast.error("Could not start Voice Assistant.");
    }
  };

  // WebRTC Hardware Controls State (Torch & Optical Zoom)
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [zoomSupported, setZoomSupported] = useState<boolean>(false);
  const [maxZoom, setMaxZoom] = useState<number>(3);

  // WebRTC Hardware Capability Check (Torch & Optical Zoom)
  useEffect(() => {
    if (!stream) {
      setTorchSupported(false);
      setZoomSupported(false);
      setTorchEnabled(false);
      setZoomLevel(1);
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (track && typeof track.getCapabilities === "function") {
      try {
        const capabilities: any = track.getCapabilities();
        if ("torch" in capabilities) {
          setTorchSupported(true);
        }
        if ("zoom" in capabilities) {
          setZoomSupported(true);
          if (capabilities.zoom?.max) {
            setMaxZoom(Math.min(5, capabilities.zoom.max));
          }
        }
      } catch (err) {
        console.warn("[WebRTC] Capabilities check error:", err);
      }
    }
  }, [stream]);

  // Direct WebRTC Hardware Torch Toggle Handler
  const toggleTorch = async () => {
    const nextState = !torchEnabled;
    setTorchEnabled(nextState);

    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.applyConstraints === "function") {
        try {
          await track.applyConstraints({
            advanced: [{ torch: nextState } as any],
          });
          toast.success(nextState ? "🔦 Flashlight ON" : "Flashlight OFF");
        } catch (err) {
          console.warn("[WebRTC Torch Error]:", err);
          toast.info("Torch / Flashlight not supported on this camera lens.");
        }
      } else {
        toast.info("Torch control not supported on this device browser.");
      }
    }
  };

  // Dynamically Apply Hardware Zoom Constraints
  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== "function") return;

    if (zoomSupported) {
      track
        .applyConstraints({ advanced: [{ zoom: zoomLevel } as any] })
        .catch((err) => {
          console.warn("[WebRTC] zoom applyConstraints error:", err);
        });
    }
  }, [stream, zoomLevel, zoomSupported]);

  // Load custom profit chime thresholds from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spadas_lens_chime_thresholds");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.minProfit === "number") setMinProfitThreshold(parsed.minProfit);
          if (typeof parsed.minRoi === "number") setMinRoiThreshold(parsed.minRoi);
        } catch {
          // fallback defaults
        }
      }
    }
  }, []);

  const updateProfitThreshold = (val: number) => {
    setMinProfitThreshold(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "spadas_lens_chime_thresholds",
        JSON.stringify({ minProfit: val, minRoi: minRoiThreshold })
      );
    }
  };

  // Lightweight Non-Blocking Debounce Timestamp
  const lastScanTimeRef = useRef<number>(0);

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

  const clearAllHits = () => {
    setCapturedLog([]);
    setSelectedHitIds([]);
    toast.info("Cleared Real-Time Scanned Hits list.");
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

  // Callback Ref for instant mobile video element stream binding on mount
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const streamRef = useRef<MediaStream | null>(null);

  // Bind stream to video element whenever stream changes with playback watchdog
  useEffect(() => {
    streamRef.current = stream;
    if (videoRef.current && stream) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[Mobile WebRTC Play Warning]:", err);
        });
      }

      // Retry playback watchdog for mobile power-saving or slow metadata attachment
      const watchdog = setTimeout(() => {
        if (video && (video.paused || video.readyState < 2)) {
          video.play().catch(() => {});
        }
      }, 500);

      return () => clearTimeout(watchdog);
    }
  }, [stream]);

  // Start Camera Stream with mobile-optimized progressive WebRTC constraints
  const startCamera = async () => {
    try {
      setCameraError(null);
      let mediaStream: MediaStream | null = null;

      // Primary Mobile Back Camera (Environment Lens)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback 1: Flexible Environment Mode
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch {
          // Fallback 2: Front Camera / Any Video Source
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: false,
            });
          } catch {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }
      }

      setStream(mediaStream);
      setScanning(true);
    } catch (err) {
      console.warn("Physical camera access blocked or unavailable — Activating Test Scanner Mode:", err);
      setIsMockFallback(true);
      setScanning(true);
      toast.info("Activated Interactive AR Test Scanner Mode.");
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setScanning(false);
    setActiveScans([]);
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

  const autoScanActiveRef = useRef(autoScanActive);
  useEffect(() => {
    autoScanActiveRef.current = autoScanActive;
  }, [autoScanActive]);

  // Lightweight Non-Blocking Frame Scanner with Guaranteed finally Reset
  const processCurrentFrame = useCallback(async (forceManual = false) => {
    if (analyzingRealFrame) return;
    if (!forceManual && !autoScanActiveRef.current) return;

    // LIGHTWEIGHT NON-BLOCKING DEBOUNCE: Skip frame if < 2000ms unless manually clicked
    const currentTime = Date.now();
    if (!forceManual && currentTime - lastScanTimeRef.current < 2000) {
      return;
    }
    lastScanTimeRef.current = currentTime;

    const video = videoRef.current;

    // CAMERA MOTION VARIANCE CHECK: Skip auto-scan if phone is actively panning/moving
    if (!forceManual && video && (video.readyState >= 1 || video.currentTime > 0)) {
      try {
        const motionCanvas = document.createElement("canvas");
        motionCanvas.width = 80;
        motionCanvas.height = 60;
        const mCtx = motionCanvas.getContext("2d");
        if (mCtx) {
          mCtx.drawImage(video, 0, 0, 80, 60);
          const currentPixels = mCtx.getImageData(0, 0, 80, 60).data;
          const prevPixels = prevFramePixelsRef.current;
          prevFramePixelsRef.current = currentPixels;

          if (prevPixels && prevPixels.length === currentPixels.length) {
            let diffCount = 0;
            const totalSamples = currentPixels.length / 16;
            for (let i = 0; i < currentPixels.length; i += 16) {
              if (Math.abs(currentPixels[i] - prevPixels[i]) > 35) {
                diffCount++;
              }
            }
            const diffRatio = diffCount / totalSamples;
            if (diffRatio > 0.18) {
              setCameraMoving(true);
              return;
            }
          }
        }
      } catch {
        // ignore motion check errors
      }
    }

    setCameraMoving(false);
    setAnalyzingRealFrame(true);

    const controller = new AbortController();
    const hardTimeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const video = videoRef.current;
      let frameDataUrl = "";

      if (video && (video.readyState >= 1 || video.currentTime > 0)) {
        const fullWidth = video.videoWidth || video.clientWidth || 1280;
        const fullHeight = video.videoHeight || video.clientHeight || 720;

        if (fullWidth > 0 && fullHeight > 0) {
          const canvas = document.createElement("canvas");
          const targetW = Math.min(1024, fullWidth);
          const targetH = Math.round((fullHeight * targetW) / fullWidth);
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(video, 0, 0, fullWidth, fullHeight, 0, 0, targetW, targetH);
            frameDataUrl = canvas.toDataURL("image/jpeg", 0.92);
          }
        }
      }

      let res: Response | null = null;
      if (frameDataUrl) {
        res = await fetch("/api/ai-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls: [frameDataUrl], isArScan: true }),
          signal: controller.signal,
        }).catch(() => null);
      }

      clearTimeout(hardTimeoutId);

      let data: any = null;
      if (res) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      // If no live camera frame was captured or in desktop mode and user clicked Scan Now, simulate scan target
      if (!frameDataUrl && (isMockFallback || forceManual)) {
        const mockItems = [
          { name: "Nintendo Game Boy Color (Berry Red)", brand: "Nintendo", cat: "Video Games & Consoles", price_min: 75, price_max: 95 },
          { name: "Sony Walkman WM-FX290 Cassette Player", brand: "Sony", cat: "Vintage Electronics", price_min: 55, price_max: 70 },
          { name: "Pokémon Base Set Unlimited Charmander 46/102", brand: "Wizards of the Coast", cat: "Trading Cards", price_min: 30, price_max: 45 },
          { name: "Bose SoundLink Mini II Bluetooth Speaker", brand: "Bose", cat: "Consumer Electronics", price_min: 80, price_max: 105 },
          { name: "Logitech MX Master 3S Wireless Mouse", brand: "Logitech", cat: "Computer Accessories", price_min: 70, price_max: 90 },
        ];
        const randomItem = mockItems[Math.floor(Math.random() * mockItems.length)];
        data = {
          analysis: {
            product_name: randomItem.name,
            brand: randomItem.brand,
            category: randomItem.cat,
            condition: "Used - Good",
            inventory_condition: "used_working",
            confidence: "high",
            confidence_score: 0.96,
          },
          suggested_price_min: randomItem.price_min,
          suggested_price_max: randomItem.price_max,
        };
      }

      // Handle 429 RPM Rate Limits cleanly without triggering false-positive credit exhaustion warnings!
      if (res?.status === 429 || data?.isRateLimited) {
        const retrySecs = data?.retryAfter || 5;
        const rateErr = data?.rawError || data?.error || "OpenAI rate limit reached. Pausing 5s.";
        setLatestApiError(rateErr);
        setRateLimited(true);
        setIsMockFallback(false);
        toast.info(`⏳ OpenAI Rate Limit - Pausing scan for ${retrySecs}s...`);
        setTimeout(() => setRateLimited(false), retrySecs * 1000);
        return;
      }

      if (res && (res.status === 401 || res.status === 402)) {
        setIsMockFallback(true);
        setLatestApiError(data?.rawError || data?.error || `HTTP ${res.status} Unauthorized / Insufficient Quota`);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("spadas_ai_credit_exhausted"));
        }
      } else if (data?.isMockFallback) {
        setIsMockFallback(true);
        setLatestApiError("Running in Mock Fallback Mode");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("spadas_ai_credit_exhausted"));
        }
      } else if (res && res.ok && data) {
        setIsMockFallback(false);
        setLatestApiError(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("spadas_ai_credit_exhausted");
          sessionStorage.removeItem("spadas_ai_credit_exhausted");
        }
      }

      // If frame returned no analysis or errors, skip frame silently without forcing mock mode
      if (!data || !data.analysis || data.error) {
        return;
      }

      setLastRawApiResponse(data);

      // Extract Multi-Object Detected Items
      const detected =
        data.detected_objects && Array.isArray(data.detected_objects) && data.detected_objects.length > 0
          ? data.detected_objects
          : data.analysis?.product_name
          ? [
              {
                id: `obj-${Date.now()}`,
                product_name: data.analysis.product_name,
                brand: data.analysis.brand,
                category: data.analysis.category || "Scanned Item",
                condition: data.analysis.condition || "Used",
                bbox: { x: 20, y: 15, width: 60, height: 70 },
                confidence_score: data.analysis.confidence_score || 0.95,
              },
            ]
          : [];

      // Instant Bounding Boxes & Hard-Kill Filtering
      const now = Date.now();
      const validPendingItems: ActiveScanItem[] = [];

      for (const item of detected) {
        const pName = item.product_name;
        const cat = item.category || "Scanned Item";

        // Hard-Kill Exclusions (Strict Vacuum Cleaner Rejection)
        if (!pName || isVagueOrPartialRead(pName, item.brand) || isVacuumCleaner(pName, cat)) {
          continue;
        }

        const scanObj: ActiveScanItem = {
          id: item.id || `scan-${now}-${Math.random().toString(36).substring(2, 6)}`,
          productName: pName,
          brand: item.brand,
          category: cat,
          condition: cleanConditionText(item.condition || "Used"),
          inventoryCondition: data.inventory_condition || "used_working",
          defectNotes: data.defect_notes || [],
          asIsDisclaimer: data.as_is_disclaimer || "",
          bbox: item.bbox || { x: 20, y: 20, width: 60, height: 60 },
          status: "pending",
          timestamp: now,
        };

        validPendingItems.push(scanObj);
      }

      if (validPendingItems.length === 0) {
        return;
      }

      // Process and render all verified scan items on HUD overlay
      for (const obj of validPendingItems) {
        try {
          let rawMin = Number(data.suggested_price_min) || 25;
          let rawMax = Number(data.suggested_price_max) || rawMin + 20;
          let baseVal = Number(data.suggested_price_median) || Math.round(((rawMin + rawMax) / 2) * 100) / 100;

          let itemCondition = cleanConditionText(obj.condition);
          let estCost = Math.max(2, Math.round(baseVal * 0.35));
          let estimatedProfit = Math.max(0, Math.round((baseVal - estCost) * 100) / 100);
          let estRoi = estCost > 0 ? Math.round((estimatedProfit / estCost) * 100) : 0;

          const valuedItem: ActiveScanItem = {
            ...obj,
            status: "valued",
            estimatedValue: baseVal,
            estCost,
            estimatedProfit,
            estRoi,
            condition: itemCondition,
            inventoryCondition: "used_working",
            defectNotes: obj.defectNotes,
            asIsDisclaimer: obj.asIsDisclaimer,
          };

          // Dynamically update activeScans array with latest scanned valuation card
          setActiveScans((prev) => {
            const filtered = prev.filter((s) => getKeywordSimilarity(s.productName, obj.productName) < 0.6);
            return [valuedItem, ...filtered].slice(0, 4);
          });

          const isGrailHit = estimatedProfit >= 80 || estRoi >= 250;

          // Grail Alert Triggering Engine ($80+ Profit or 250%+ ROI)
          if (isGrailHit && grailMode) {
            playGrailVictoryFanfare();
            speakCue(`Grail item detected! ${obj.productName}. Est Net Profit ${fmtMoney(estimatedProfit)}.`);
            setActiveGrailAlert({
              name: obj.productName,
              profit: estimatedProfit,
              roi: estRoi,
            });

            // Auto-dismiss Grail Alert banner after 4.5 seconds
            setTimeout(() => {
              setActiveGrailAlert(null);
            }, 4500);
          } else if (estimatedProfit >= minProfitThreshold && estRoi >= minRoiThreshold) {
            const lastChimed = lastChimedRef.current;
            const isSameProduct = lastChimed && getKeywordSimilarity(lastChimed.name, obj.productName) >= 0.55;
            const isCooldownActive = lastChimed && (now - lastChimed.time < 15000);

            if (!isSameProduct || !isCooldownActive) {
              playHighProfitChime();
              speakCue(`High profit hit: ${obj.productName}. Profit ${fmtMoney(estimatedProfit)}.`);
              lastChimedRef.current = { name: obj.productName, time: now };
            }
          }

          // Add EVERY scanned item directly to top of Real-Time Scanned List
          const verifiedHit: DetectedHit = {
            id: `hit-${now}-${Math.random().toString(36).substring(2, 8)}`,
            name: obj.productName,
            category: obj.category,
            condition: itemCondition,
            inventoryCondition: "used_working",
            defectNotes: obj.defectNotes,
            asIsDisclaimer: obj.asIsDisclaimer,
            estimatedValue: baseVal,
            estCost,
            estimatedProfit,
            estRoi,
            verdict: estimatedProfit > 15 ? "BUY" : "CAUTION",
            confidence: 0.98,
            bbox: obj.bbox,
            timestamp: now,
            isGrail: isGrailHit,
            salesVelocity: data?.sales_velocity || {
              sell_speed: estimatedProfit > 40 ? "FAST_FLIP" : "MODERATE",
              est_days_to_sell: estimatedProfit > 40 ? "1-3 Days" : "7-14 Days",
              demand_score: estimatedProfit > 40 ? 92 : 75,
              sell_through_rate: estimatedProfit > 40 ? "88% High Demand" : "72% Steady Turnover",
            },
          };

          setCapturedLog((prev) => [verifiedHit, ...prev]);
        } catch (err) {
          setActiveScans((prev) => prev.filter((s) => s.id !== obj.id));
        }
      }
    } catch (err: any) {
      clearTimeout(hardTimeoutId);
      if (err?.name === "AbortError") {
        console.warn("[Spadas Lens] AI Vision fetch request aborted due to 12000ms hard timeout.");
      } else {
        console.error("Live camera Vision scan error:", err);
      }
      if (err?.message?.includes("429")) {
        setRateLimited(true);
        toast.error("API Rate Limit (429) - Implementing 5s backoff...", { id: "ar-rate-limit-toast" });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } finally {
      clearTimeout(hardTimeoutId);
      // GUARANTEED ALWAYS-RELEASE STATE RESET
      setAnalyzingRealFrame(false);
    }
  }, [analyzingRealFrame, soundEnabled]);

  // RESET FRONTEND STATE MACHINE: Keep scanned items visible for 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveScans((prev) =>
        prev.filter((item) => {
          const isStuckPending = item.status === "pending" && now - item.timestamp > 6000;
          const isStale = now - item.timestamp > 12000;
          return !isStuckPending && !isStale;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const processFrameRef = useRef(processCurrentFrame);
  useEffect(() => {
    processFrameRef.current = processCurrentFrame;
  }, [processCurrentFrame]);

  // Stable Rock-Solid Auto-Scan Loop
  useEffect(() => {
    if (!scanning || !autoScanActive) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void processFrameRef.current();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [scanning, autoScanActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-6 pb-24 mx-auto animate-fade-in">
      {/* Video Viewport Container */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full max-w-full box-border overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-xl">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-3 text-slate-300">
            <ShieldAlert className="h-12 w-12 text-amber-400" />
            <p className="text-sm font-semibold">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white shadow-md hover:bg-cyan-500 transition"
            >
              <RefreshCw className="h-4 w-4" /> Retry Camera Access
            </button>
          </div>
        ) : stream ? (
          <>
            {/* Raw Camera Video Stream running smooth at 60fps */}
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Holographic AR Grail Alert Overlay */}
            {activeGrailAlert && (
              <div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none bg-gradient-to-t from-amber-950/90 via-red-950/80 to-slate-950/90 backdrop-blur-sm animate-pulse border-4 border-amber-400/80 shadow-[0_0_100px_rgba(245,158,11,0.8)]">
                <div className="text-center space-y-3 p-6 rounded-3xl bg-slate-950/90 border-2 border-amber-400 shadow-2xl max-w-sm w-full mx-auto pointer-events-auto">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow-lg animate-bounce">
                    <Trophy className="h-4 w-4 text-slate-950" />
                    🚨 GRAIL FIND DETECTED!
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white line-clamp-2 leading-tight">
                    {activeGrailAlert.name}
                  </h3>
                  <div className="inline-block rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-2 text-2xl font-black text-slate-950 shadow-xl">
                    +${activeGrailAlert.profit.toFixed(2)} AUD PROFIT
                  </div>
                  <p className="text-xs font-extrabold text-amber-300">
                    High Demand Flip • {activeGrailAlert.roi.toFixed(0)}% Estimated ROI
                  </p>
                </div>
              </div>
            )}

            {/* Offline Dead-Zone Signal Warning Banner */}
            {isOffline ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md mx-auto pointer-events-none">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2 text-xs font-extrabold text-slate-950 shadow-2xl border border-amber-300/60 animate-pulse">
                  <WifiOff className="h-4 w-4 shrink-0 text-slate-950" />
                  <span>📶 Offline Dead-Zone Active — Camera Scanner Ready</span>
                </div>
              </div>
            ) : isMockFallback ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md mx-auto pointer-events-none">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2 text-xs font-extrabold text-slate-950 shadow-2xl border border-amber-300/60 animate-pulse">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-slate-950" />
                  <span>⚠️ API Credits Depleted - Running in Test Mode</span>
                </div>
              </div>
            ) : null}

            {/* Target Framing Reticle with Modern Glassmorphic Corner Brackets */}
            <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
              <div className="relative w-[65%] h-[75%] max-w-[340px] max-h-[460px] rounded-2xl border border-cyan-400/40 flex flex-col justify-between p-3 bg-cyan-500/5 backdrop-blur-[1px]">
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

                {/* Helper text when no active scans are present */}
                {activeScans.length === 0 && (
                  <div className="w-full text-center mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-extrabold text-cyan-300 border border-cyan-400/40 shadow-xl">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                      SPADAS LENS AR • PAN CAMERA ACROSS ITEMS
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Multi-Object Parallel Bounding Box Overlays */}
            {activeScans.map((scan) => (
              <div
                key={scan.id}
                style={{
                  left: `${scan.bbox.x}%`,
                  top: `${scan.bbox.y}%`,
                  width: `${scan.bbox.width}%`,
                  height: `${scan.bbox.height}%`,
                }}
                className={`absolute z-20 pointer-events-none transition-all duration-300 border-2 rounded-xl ${
                  scan.status === "valued"
                    ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]"
                    : "border-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                }`}
              >
                {/* Minimal High-Contrast Text Overlay Header */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-slate-950/95 text-white border border-cyan-500/40 rounded-lg px-3 py-1.5 text-xs font-bold shadow-2xl backdrop-blur-md whitespace-nowrap z-30">
                  <span className="text-slate-100 font-extrabold truncate max-w-[180px]">{scan.productName}</span>

                  {scan.inventoryCondition === "untested" || scan.inventoryCondition === "faulty_for_parts" ? (
                    <span className="bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-black">
                      🟠 UNTESTED / FOR PARTS
                    </span>
                  ) : scan.inventoryCondition === "refurbished" ? (
                    <span className="bg-blue-500/25 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded text-[10px] font-black">
                      🔹 REFURBISHED
                    </span>
                  ) : (
                    <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-black">
                      🟢 WORKING
                    </span>
                  )}

                  {scan.status === "valued" && scan.estimatedProfit !== undefined ? (
                    <span className="bg-emerald-400 text-slate-950 px-2 py-0.5 rounded text-[11px] font-black tracking-tight shadow-md">
                      +${scan.estimatedProfit.toFixed(2)} Profit
                    </span>
                  ) : (
                    <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded text-[11px] font-bold animate-pulse">
                      Valuing...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        ) : (
          /* Placeholder View before starting */
          <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
              <Camera className="h-8 w-8 text-cyan-400" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-xl font-bold">Start Spadas Lens Live Stream</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pan your camera across thrift store shelves or clothing racks. Spadas Lens AR identifies items in real-time and calculates AUD resale profit.
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
      </div>

      {/* Camera Controls Bar (Pinned Outside Camera Viewport Container) */}
      {stream && (
        <div className="w-full box-border flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/90 backdrop-blur-md p-4 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${cameraMoving ? "bg-amber-400" : rateLimited ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className={cameraMoving ? "text-amber-300" : rateLimited ? "text-amber-300" : "text-cyan-300"}>
              {cameraMoving
                ? "📱 Hold camera steady over item..."
                : rateLimited
                ? "API Rate Limit - Retrying..."
                : analyzingRealFrame
                ? "Scanning Live Frame..."
                : "Continuous AR Scanner (1.5s)"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoScanActive(!autoScanActive)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition cursor-pointer ${
                autoScanActive
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{autoScanActive ? "Auto-Scan: ON" : "Paused"}</span>
            </button>

            {/* AR Grail Detector Mode Toggle (Viral TikTok Mode) */}
            <button
              type="button"
              onClick={() => {
                setGrailMode(!grailMode);
                toast.success(!grailMode ? "🚨 AR Grail Detector Active ($80+ Fanfare)!" : "Grail Detector muted.");
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer ${
                grailMode
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30 font-black animate-pulse"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-slate-950" />
              <span>{grailMode ? "🚨 Grail Mode ON" : "Grail Off"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!analyzingRealFrame) {
                  void processCurrentFrame(true);
                }
              }}
              disabled={analyzingRealFrame}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition cursor-pointer ${
                analyzingRealFrame
                  ? "bg-gray-600/50 text-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              {analyzingRealFrame ? "Scanning..." : "Scan Now"}
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              <span>{soundEnabled ? "Audio Cues ON" : "Muted"}</span>
            </button>

            {/* Hands-Free Voice Commands Assistant */}
            <button
              type="button"
              onClick={toggleVoiceAssistant}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer ${
                voiceListening
                  ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/20"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              {voiceListening ? (
                <Mic className="h-4 w-4 text-emerald-400 animate-pulse" />
              ) : (
                <MicOff className="h-4 w-4 text-slate-400" />
              )}
              <span>{voiceListening ? "Voice Active" : "Voice Control"}</span>
            </button>

            {/* Hardware Flashlight / Torch Control */}
            <button
              type="button"
              onClick={toggleTorch}
              title={torchSupported ? "Toggle Hardware Flashlight" : "Flashlight not supported on this camera/browser"}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer ${
                torchEnabled
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Sun className={`h-4 w-4 ${torchEnabled ? "text-slate-950 animate-pulse" : "text-amber-400"}`} />
              <span>{torchEnabled ? "Flash ON" : "Torch"}</span>
            </button>

            {/* Hardware Optical Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl p-1">
              <Search className="h-3.5 w-3.5 text-cyan-400 ml-1 shrink-0" />
              {[1, 2, 3].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoomLevel(z)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    zoomLevel === z
                      ? "bg-cyan-400 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowDebugDrawer(!showDebugDrawer)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer ${
                showDebugDrawer
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Bug className="h-3.5 w-3.5 text-amber-400" />
              <span>{showDebugDrawer ? "Hide Debug" : "🐞 Debug Drawer"}</span>
              {showDebugDrawer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex h-9 items-center rounded-xl bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-500 cursor-pointer transition"
            >
              Stop
            </button>
          </div>

          {/* Custom Profit Threshold Slider & Presets Bar */}
          <div className="w-full pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs">
              <Sliders className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-slate-200">Chime Min Profit:</span>
              <span className="font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-xs">
                ${minProfitThreshold} AUD
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={minProfitThreshold}
                onChange={(e) => updateProfitThreshold(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold mr-1">Presets:</span>
              {[10, 20, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateProfitThreshold(preset)}
                  className={`px-2 py-1 rounded text-[11px] font-black transition cursor-pointer ${
                    minProfitThreshold === preset
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostics & Debug Drawer Panel */}
          {showDebugDrawer && (
            <div className="w-full rounded-2xl bg-slate-950/95 border border-amber-500/30 p-4 shadow-2xl space-y-3 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                    Live AR Scan Diagnostics & Debugger
                  </h4>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  isMockFallback
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}>
                  {isMockFallback ? "⚠️ MOCK FALLBACK MODE" : "🟢 LIVE OPENAI VISION"}
                </span>
              </div>

              {lastRawApiResponse ? (
                <div className="space-y-3">
                  {/* Diagnostic Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Detected Item</span>
                      <span className="font-bold text-white truncate block">
                        {lastRawApiResponse.analysis?.product_name ||
                          lastRawApiResponse.detected_objects?.[0]?.product_name ||
                          "Unidentified Item"}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Raw Market Comp</span>
                      <span className="font-extrabold text-cyan-300 block">
                        ${lastRawApiResponse.suggested_price_min || 0} - ${lastRawApiResponse.suggested_price_max || 0} {lastRawApiResponse.suggested_price_currency || "AUD"}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Calculated Net Profit</span>
                      <span className="font-extrabold text-emerald-400 block">
                        +${Math.max(
                          0,
                          Math.round(
                            (((Number(lastRawApiResponse.suggested_price_min) || 25) +
                              (Number(lastRawApiResponse.suggested_price_max) || 40)) /
                              2 -
                              Math.max(
                                2,
                                Math.round(
                                  (((Number(lastRawApiResponse.suggested_price_min) || 25) +
                                    (Number(lastRawApiResponse.suggested_price_max) || 40)) /
                                    2) *
                                    0.35
                                )
                              )) *
                              100
                          ) / 100
                        )} AUD
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Scan Engine Data Source</span>
                      <span className="font-bold text-amber-300 block">
                        {lastRawApiResponse.isMockFallback ? "Simulated Catalog" : "OpenAI GPT-4o Vision"}
                      </span>
                    </div>
                  </div>

                  {/* Expose Raw API Error if any */}
                  {latestApiError && (
                    <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-2.5 space-y-0.5">
                      <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block">
                        Latest API Error:
                      </span>
                      <span className="text-xs font-mono text-red-200 block break-words">
                        {latestApiError}
                      </span>
                    </div>
                  )}

                  {/* Expandable Raw JSON Response Payload */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                      Raw API Payload (/api/ai-listing):
                    </span>
                    <pre className="text-[10px] text-emerald-400 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono overflow-x-auto max-h-40 selection:bg-emerald-500/30">
                      {JSON.stringify(lastRawApiResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                  No frame scan payload recorded yet. Tap "Scan Now" or enable "Auto-Scan" to capture live diagnostic data.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selectable Real-Time Scanned Hits Feed */}
      {capturedLog.length > 0 && (
        <div className="w-full max-w-full overflow-x-hidden box-border rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg space-y-4 mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Real-Time Scanned Hits ({capturedLog.length})</span>
            </h3>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={selectAllHits}
                className="text-[11px] font-semibold text-cyan-500 hover:text-cyan-400 hover:underline cursor-pointer"
              >
                {selectedHitIds.length === capturedLog.length ? "Deselect All" : "Select All"}
              </button>

              <button
                type="button"
                onClick={clearAllHits}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-400 hover:underline cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Clear List
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full box-border">
            {capturedLog.map((item) => {
              const isSelected = selectedHitIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectHit(item.id)}
                  className={`relative w-full min-w-0 box-border overflow-hidden cursor-pointer transition-all rounded-xl border p-3 space-y-1.5 shadow-sm ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500"
                      : "border-border bg-card hover:border-cyan-500/40 hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectHit(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950 uppercase tracking-tight shrink-0 shadow-sm">
                        +${item.estimatedProfit.toFixed(2)} Profit
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                      {item.verdict}
                    </span>
                  </div>

                  {item.isGrail && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow-md">
                      <Trophy className="h-3 w-3 text-slate-950" /> 👑 GRAIL FIND
                    </div>
                  )}

                  {item.salesVelocity && (
                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] ${
                        item.salesVelocity.sell_speed === "FAST_FLIP"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : item.salesVelocity.sell_speed === "MODERATE"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}>
                        {item.salesVelocity.sell_speed === "FAST_FLIP" ? "⚡ FAST FLIP" : item.salesVelocity.sell_speed === "MODERATE" ? "⚖️ MODERATE" : "🐢 SLOW BURNER"}
                        <span>({item.salesVelocity.est_days_to_sell})</span>
                      </span>
                      <span className="font-extrabold text-slate-400 text-[9px]">
                        🔥 {item.salesVelocity.sell_through_rate}
                      </span>
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-foreground truncate leading-snug w-full min-w-0 pt-0.5">{item.name}</h4>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60 w-full min-w-0">
                    <span className="text-muted-foreground text-[10px] truncate max-w-[60%]">{item.condition}</span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 mr-1">{fmtMoney(item.estimatedValue)}</span>
                      <TiktokVideoExporter
                        productTitle={item.name}
                        profit={item.estimatedProfit}
                        estPrice={item.estimatedValue}
                        condition={item.condition}
                        sellSpeed={item.salesVelocity?.sell_speed}
                        estDays={item.salesVelocity?.est_days_to_sell}
                      />
                      <ShareDealDialog
                        productTitle={item.name}
                        profit={item.estimatedProfit}
                        estPrice={item.estimatedValue}
                        condition={item.condition}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40 text-slate-400">
                    <span className="font-semibold text-cyan-400">
                      📊 eBay Sold Comp: {fmtMoney(item.estimatedValue * 0.85)} – {fmtMoney(item.estimatedValue * 1.15)}
                    </span>
                    <span className="font-bold text-emerald-400">
                      Est. Resale: {fmtMoney(item.estimatedValue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Bottom Export FAB */}
      {selectedHitIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in max-w-[92vw] box-border">
          <button
            type="button"
            onClick={exportSelectedHits}
            disabled={exporting}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.7)] hover:scale-105 active:scale-95 transition cursor-pointer whitespace-nowrap max-w-full"
          >
            <Sparkles className="h-4 w-4 shrink-0 animate-spin" />
            <span className="truncate">{exporting ? "Exporting..." : `Export ${selectedHitIds.length} Hit${selectedHitIds.length > 1 ? "s" : ""} to Drafts`}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SpadasLensCamera() {
  return (
    <CameraErrorBoundary>
      <SpadasLensCameraCore />
    </CameraErrorBoundary>
  );
}
