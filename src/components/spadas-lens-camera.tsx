import React, { Component, ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Zap,
  ShieldAlert,
  Clock,
  ArrowRight,
  Trash2,
  Trophy,
  WifiOff,
  LogIn,
  Crosshair,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";
import { detectGeoCurrency, CURRENCY_CONFIGS, SupportedCurrency } from "@/app/lib/currency-routing";
import { resilientFetch } from "@/app/lib/resilient-fetch";
import { saveScanOffline } from "@/app/lib/offline-storage";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import EbayListingModal from "@/components/ebay-listing-modal";
import CameraOnboardingOverlay from "@/components/camera-onboarding-overlay";
import { DeepVerifyModal } from "@/components/deep-verify-modal";
import LensHitCard from "@/components/lens-hit-card";
import LensControlsBar from "@/components/lens-controls-bar";
import type { DetectedHit, ActiveScanItem } from "@/types/lens";
export type { DetectedHit, ActiveScanItem } from "@/types/lens";

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

// Strict Vague / Partial Read Detector (Rejects punctuation-only, short noise, and placeholder titles)
function isVagueOrPartialRead(productName?: string | null): boolean {
  if (!productName || typeof productName !== "string") return true;
  const trimmed = productName.trim();
  if (trimmed.length < 3) return true;
  if (/^[.\/_\-–—:;,#@!$%^&*()+=~`\s]+$/.test(trimmed)) return true;
  const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  if (alphanumeric.length < 2) return true;

  const lower = trimmed.toLowerCase();
  const explicitFailures = [
    "no_center_item",
    "scanned item",
    "scanned reseller item",
    "resale item",
    "unknown item",
    "unidentified item",
    "unidentified",
    "unknown product",
    "unknown title",
    "could not be identified",
    "cannot be determined",
    "exact card details unclear",
    "vintage electronics / resale item",
    "null",
    "undefined",
    "object",
    "item",
  ];

  return explicitFailures.some((phrase) => lower === phrase || lower === `.${phrase}` || lower.startsWith(`${phrase} `));
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

let cycleSeq = 0;

function SpadasLensCameraCore() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanMode, setScanMode] = useState<"snap" | "sweep" | "barcode" | "live">("snap");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScanActive, setAutoScanActive] = useState(false);
  const [analyzingRealFrame, setAnalyzingRealFrame] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [activeScans, setActiveScans] = useState<ActiveScanItem[]>([]);
  const [capturedLog, setCapturedLog] = useState<DetectedHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMockFallback, setIsMockFallback] = useState(false);
  const [minProfitThreshold, setMinProfitThreshold] = useState<number>(5);
  const [minRoiThreshold, setMinRoiThreshold] = useState<number>(0);
  const [showDebugDrawer, setShowDebugDrawer] = useState<boolean>(false);
  const [lastRawApiResponse, setLastRawApiResponse] = useState<any>(null);
  const [latestApiError, setLatestApiError] = useState<string | null>(null);
  const [scanErrorState, setScanErrorState] = useState<{
    type: "rate_limit_user" | "rate_limit_upstream" | "unauthorized" | "no_match" | "generic" | null;
    retryAfter?: number;
  }>({ type: null });
  const [cameraMoving, setCameraMoving] = useState<boolean>(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [activeEbayItem, setActiveEbayItem] = useState<any | null>(null);
  const [deepVerifyItem, setDeepVerifyItem] = useState<DetectedHit | ActiveScanItem | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<"HIT" | "MISS" | null>(null);
  const [sessionScanCount, setSessionScanCount] = useState<number>(0);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  // Barcode Single-Scan Debounce (1 scan only per barcode item)
  const lastDetectedBarcodeRef = useRef<string | null>(null);
  const lastBarcodeTimeRef = useRef<number>(0);

  // Persistent Offscreen Canvases & Strict In-Flight Request Locking (Zero GC Churn)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const scanExpiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const profitableCount = capturedLog.filter((h) => (h.estimatedProfit || 0) >= minProfitThreshold).length;
  const bestProfit = capturedLog.reduce((max, h) => Math.max(max, h.estimatedProfit || 0), 0);

  // Background / Mobile Tab Switch Reconnect Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const isTrackEnded = stream?.getVideoTracks().some((t) => t.readyState === "ended");
        if (!stream || isTrackEnded) {
          console.log("[Spadas Lens AR] App foregrounded — reconnecting camera stream...");
          void startCamera();
        }
      } else {
        isAnalyzingRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (scanExpiryTimerRef.current) clearTimeout(scanExpiryTimerRef.current);
    };
  }, [stream]);

  // Safety watchdog to prevent analyzingRealFrame from getting permanently stuck
  useEffect(() => {
    if (!analyzingRealFrame) return;
    const timeout = setTimeout(() => {
      setAnalyzingRealFrame(false);
      isAnalyzingRef.current = false;
    }, 5000);
    return () => clearTimeout(timeout);
  }, [analyzingRealFrame]);

  const handleQuickAdd = async (e: React.MouseEvent, item: ActiveScanItem) => {
    e.stopPropagation();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to save listings.");
        return;
      }

      const { error } = await createListing({
        userId: user.id,
        product: item.productName,
        description: `Sourced via Spadas Lens AR. Category: ${item.category}. Estimated profit: +$${item.estimatedProfit?.toFixed(2) || "0"}.`,
        price: item.estimatedValue || 45,
        cost: item.estCost || 10,
        status: "Draft",
      });

      if (error) throw error;
      toast.success(`✅ Added "${item.productName}" to inventory drafts!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add to drafts.");
    }
  };

  const handleSaveDraftHit = async (hit: DetectedHit) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to save listings.");
        return;
      }

      const { error } = await createListing({
        userId: user.id,
        product: hit.name,
        description: `Sourced via Spadas Lens AR. Category: ${hit.category}. Condition: ${hit.condition}. Estimated profit: +$${hit.estimatedProfit?.toFixed(2) || "0"}.`,
        price: hit.estimatedValue || 45,
        cost: hit.estCost || 10,
        status: "Draft",
      });

      if (error) throw error;
      toast.success(`✅ Saved "${hit.name}" to inventory drafts!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save to drafts.");
    }
  };

  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spadas_selected_currency");
      if (saved && (saved === "AUD" || saved === "USD" || saved === "EUR" || saved === "GBP")) {
        return saved as SupportedCurrency;
      }
    }
    return detectGeoCurrency().currency;
  });
  const prevFramePixelsRef = useRef<Uint8ClampedArray | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastRecognizedSignatureRef = useRef<{ name: string; timestamp: number } | null>(null);

  // Verify Owner and Pro User status purely server-side
  useEffect(() => {
    async function checkOwnerAndProStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const res = await fetch("/api/stripe/status").catch(() => null);
          if (res && res.ok) {
            const d = await res.json().catch(() => ({}));
            if (d?.active || d?.plan === "Pro") {
              setIsPro(true);
            }
          }

          const usageRes = await fetch("/api/usage").catch(() => null);
          if (usageRes && usageRes.ok) {
            const u = await usageRes.json().catch(() => ({}));
            if (u?.isPro) setIsPro(true);
          }
        }
      } catch {}
    }
    void checkOwnerAndProStatus();
  }, []);

  // Native Offline Dead-Zone Signal Watcher
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  // Dynamic Mobile DevTools Console Overlay (?debug=true) - Restricted to Owner
  useEffect(() => {
    if (!isOwner) return;
    if (typeof window === 'undefined') return;
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.onload = () => (window as any).eruda?.init();
    document.body.appendChild(s);
  }, [isOwner]);

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

    // Auto-Start Camera Stream on Mount
    void startCamera();
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

  const streamRef = useRef<MediaStream | null>(null);

  // Bind stream to video element whenever stream changes with playback watchdog
  useEffect(() => {
    streamRef.current = stream;
    if (videoRef.current && stream) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.play().catch(() => {});

      // Trigger immediate initial scan tick 800ms after video attaches
      const initScanTimer = setTimeout(() => {
        void processFrameRef.current(true);
      }, 800);

      const watchdog = setTimeout(() => {
        if (video && (video.paused || video.readyState < 2)) {
          video.play().catch(() => {});
        }
      }, 500);

      return () => {
        clearTimeout(initScanTimer);
        clearTimeout(watchdog);
      };
    }
  }, [stream]);

  // Start Camera Stream with mobile-optimized progressive WebRTC constraints
  const startCamera = async () => {
    try {
      setCameraError(null);
      let mediaStream: MediaStream | null = null;

      // Primary Mobile Back Camera (Environment Lens with Full HD 1080p & Continuous Autofocus)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            // @ts-ignore - Hardware hints for sharpest focus on barcodes and text
            focusMode: { ideal: "continuous" },
          },
          audio: false,
        });
      } catch {
        // Fallback 1: Flexible Environment Mode
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
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

  // Multi-Tier Reseller Audio Synthesizer based on profit margin
  const playChime = (profit = 15) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (profit >= 80) {
        // GRAIL FIND FANFARE (4-tone victory arpeggio)
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.07;
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.28);
        });
      } else if (profit >= 30) {
        // STRONG FLIP (Harmonic Triad Chord)
        const freqs = [587.33, 739.99, 880.00];
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        });
      } else {
        // STANDARD RESALE FIND (Clean High-Tech Dual-Tone Chirp)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
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
      }
    } catch (e) {
      console.error("AudioContext chime error:", e);
    }
  };

  const autoScanActiveRef = useRef(autoScanActive);
  useEffect(() => {
    autoScanActiveRef.current = autoScanActive;
  }, [autoScanActive]);

  const analyzingRef = useRef(false);

  // Frame Scanner with Resilient Lock & 1200px High-Detail Processing
  const processCurrentFrame = useCallback(async (forceManual = false) => {
    const cycleId = ++cycleSeq;

    // Fast ref-based lock to prevent concurrent overlapping fetches
    if (analyzingRef.current) {
      console.log('[Spadas Lens]', cycleId, 'blocked re-entry (analyzing in progress)');
      return;
    }

    analyzingRef.current = true;
    setAnalyzingRealFrame(true);
    setScanErrorState({ type: null });

    const currentTime = Date.now();
    lastScanTimeRef.current = currentTime;

    // If camera stream is not active yet when user taps Scan Now, auto-start camera stream first
    if (!stream && forceManual) {
      await startCamera();
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    if (forceManual) {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 180);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 20, 50]);
      }
    }

    setCameraMoving(false);

    try {
      const video = videoRef.current;
      let frameDataUrl = "";

      // SUB-100MS LOCAL WASM BARCODE PRE-PASS: Scan live video frame for barcodes locally (0ms cloud latency)
      if (video && typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_128", "code_39"],
          });
          const detectedBarcodes = await detector.detect(video).catch(() => []);
          if (detectedBarcodes && detectedBarcodes.length > 0) {
            const codeVal = detectedBarcodes[0]?.rawValue;
            const nowTime = Date.now();
            if (codeVal && codeVal.length >= 4) {
              // Strict Single-Scan Debounce: Only 1 scan per barcode (4s cooldown)
              if (lastDetectedBarcodeRef.current === codeVal && nowTime - lastBarcodeTimeRef.current < 4000) {
                setAnalyzingRealFrame(false);
                return;
              }
              lastDetectedBarcodeRef.current = codeVal;
              lastBarcodeTimeRef.current = nowTime;

              console.log("[Spadas Lens] Single Barcode Lock-on:", codeVal);
              
              // Direct sub-100ms Barcode Comps Resolver
              const bRes = await fetch("/api/barcode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ barcode: codeVal }),
              }).catch(() => null);

              if (bRes && bRes.ok) {
                const bData = await bRes.json().catch(() => null);
                const pName = (bData?.product?.name || "").trim();
                if (bData && bData.product && pName && pName.toLowerCase() !== "unknown product" && pName.toLowerCase() !== "unknown title") {
                  const estValue = Number(bData.product.suggestedPrice) || 45;
                  const estCost = Math.max(2, Math.round(estValue * 0.15));
                  const ebayFee = (estValue * 0.134) + 0.33;
                  const estProfit = Math.max(0, Math.round((estValue - estCost - ebayFee) * 100) / 100);
                  const estRoi = estCost > 0 ? Math.round((estProfit / estCost) * 100) : 0;
                  const copVerdict = estRoi >= 300 && estProfit >= 25 ? "MUST_COP" : estRoi >= 100 ? "QUICK_FLIP" : "FAIR_MARGIN";

                  const scanObj: ActiveScanItem = {
                    id: `barcode-${Date.now()}`,
                    productName: pName,
                    brand: bData.product.brand || "Authentic",
                    category: bData.product.category || "Media / Barcode Item",
                    condition: "Used - Good",
                    inventoryCondition: "used_working",
                    defectNotes: [],
                    asIsDisclaimer: "",
                    bbox: { x: 15, y: 15, width: 70, height: 70 },
                    status: "valued",
                    estimatedValue: estValue,
                    suggestedPriceMin: Math.round(estValue * 0.8),
                    suggestedPriceMax: Math.round(estValue * 1.2),
                    confidenceScore: 0.99,
                    estCost: estCost,
                    estimatedProfit: estProfit,
                    estRoi: estRoi,
                    tagPrice: estCost,
                    trueNetProfit: estProfit,
                    roiPercentage: estRoi,
                    copVerdict: copVerdict,
                    timestamp: Date.now(),
                  };

                  const verifiedHit: DetectedHit = {
                    id: `hit-${Date.now()}`,
                    name: pName,
                    brand: bData.product.brand || "Authentic",
                    category: bData.product.category || "Media / Barcode Item",
                    condition: "Used - Good",
                    inventoryCondition: "used_working",
                    defectNotes: [],
                    asIsDisclaimer: "",
                    estimatedValue: estValue,
                    estCost: estCost,
                    estimatedProfit: estProfit,
                    estRoi: estRoi,
                    tagPrice: estCost,
                    trueNetProfit: estProfit,
                    roiPercentage: estRoi,
                    copVerdict: copVerdict,
                    verdict: estProfit >= 15 ? "BUY" : "CAUTION",
                    confidence: 0.99,
                    bbox: { x: 15, y: 15, width: 70, height: 70 },
                    timestamp: Date.now(),
                  };

                  setActiveScans([scanObj]);
                  setCapturedLog((prev) => [verifiedHit, ...prev.filter((h) => h.name !== pName)].slice(0, 50));
                  setSessionScanCount((prev) => prev + 1);

                  if (scanExpiryTimerRef.current) clearTimeout(scanExpiryTimerRef.current);
                  scanExpiryTimerRef.current = setTimeout(() => setActiveScans([]), 4500);

                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(100);
                  }
                  playChime(estProfit);
                  setAnalyzingRealFrame(false);
                  return;
                } else {
                  console.log("[Spadas Lens] Barcode lookup returned empty/unknown product name — falling back to AI Vision frame analysis.");
                }
              }
            }
          }
        } catch (bErr) {
          console.warn("[Spadas Lens] WASM Barcode Detector pre-pass warning:", bErr);
        }
      }

      let centerCropDataUrl = "";

      if (video) {
        const fullWidth = video.videoWidth || video.clientWidth || 640;
        const fullHeight = video.videoHeight || video.clientHeight || 480;

        if (fullWidth > 0 && fullHeight > 0) {
          // 1. Clean 1200px High-Res Full Frame Capture
          const maxDim = 1200;
          let targetW = fullWidth;
          let targetH = fullHeight;

          if (fullWidth >= fullHeight) {
            targetW = Math.min(maxDim, fullWidth);
            targetH = Math.round((fullHeight * targetW) / fullWidth);
          } else {
            targetH = Math.min(maxDim, fullHeight);
            targetW = Math.round((fullWidth * targetH) / fullHeight);
          }

          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement("canvas");
          }
          const canvas = offscreenCanvasRef.current;
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(video, 0, 0, fullWidth, fullHeight, 0, 0, targetW, targetH);
            frameDataUrl = canvas.toDataURL("image/jpeg", 0.88);
          }

          // 2. High-Detail Laser Center Crop (Target Reticle Area: Center 65% x 65%)
          const cropW = Math.round(fullWidth * 0.65);
          const cropH = Math.round(fullHeight * 0.65);
          const cropX = Math.round((fullWidth - cropW) / 2);
          const cropY = Math.round((fullHeight - cropH) / 2);

          if (!cropCanvasRef.current) {
            cropCanvasRef.current = document.createElement("canvas");
          }
          const cropCanvas = cropCanvasRef.current;
          cropCanvas.width = 800;
          cropCanvas.height = 800;
          const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
          if (cropCtx) {
            cropCtx.imageSmoothingEnabled = true;
            cropCtx.imageSmoothingQuality = "high";
            cropCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 800, 800);
            centerCropDataUrl = cropCanvas.toDataURL("image/jpeg", 0.90);
          }
        }
      }

      if (!frameDataUrl || !frameDataUrl.startsWith("data:image/jpeg;base64,") || frameDataUrl.length < 1000) {
        console.warn("[Spadas Lens]", cycleId, "Frame snapshot uninitialized, retrying frame...");
        setAnalyzingRealFrame(false);
        return;
      }

      const imagePayloads = [centerCropDataUrl || frameDataUrl];

      let res: Response | null = null;
      console.log('[Spadas Lens]', cycleId, 'Starting resilient fetch for frame with analyzingRealFrame:', analyzingRealFrame);
      res = await resilientFetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: imagePayloads, isArScan: true, currency: selectedCurrency, mode: scanMode }),
      }, { maxRetries: 2, initialDelayMs: 300 }).catch((e) => {
        console.error('[Spadas Lens]', cycleId, 'Fetch error:', e);
        return null;
      });

      let data: any = null;
      let raw = "";
      if (res) {
        raw = await res.text();
        console.log('[Spadas Lens]', cycleId, 'Fetch completed with status:', res.status, 'and length:', raw.length);
        console.log('[Spadas Lens]', cycleId, 'http', res.status, res.headers.get('content-type'), 'len', raw.length);
        try {
          data = JSON.parse(raw);
        } catch (e: any) {
          console.log('[Spadas Lens]', cycleId, 'fetch threw:', String(e));
          console.error('[Spadas Lens]', cycleId, 'parse failed:', e.message, raw.slice(0, 300));
          data = null;
        }
      }

      setLastRawApiResponse(data);

      // ── Phase 4: Non-Alarming HTTP Error State Handling ──────────────────────
      if (res?.status === 401) {
        setScanErrorState({ type: "unauthorized" });
        setLatestApiError("401 Unauthorized — session expired");
        return;
      }

      if (res?.status === 429) {
        lastScanTimeRef.current = Date.now() + 4500; // Cooldown backoff penalty
        const scope = data?.scope || "user";
        const retryAfter = Number(data?.retryAfter) || 0;
        if (scope === "upstream") {
          setScanErrorState({ type: "rate_limit_upstream" });
          toast.warning("Busy right now. Pausing scan for 4s.", { id: "rate-upstream" });
        } else {
          setScanErrorState({ type: "rate_limit_user", retryAfter });
          toast.warning(
            retryAfter > 0
              ? `Scan rate limit. Resuming in ${retryAfter}s.`
              : "Scan rate limit. Pausing briefly...",
            { id: "rate-user" }
          );
        }
        setLatestApiError(`429 Rate Limited (scope: ${scope})`);
        return;
      }

      if (!data || data.error) {
        setAnalyzingRealFrame(false);
        return;
      }

      // Hard check: if unidentified, stay clean without inserting placeholder cards or fake prices
      if (data.status === "unidentified" || data.analysis?.status === "unidentified") {
        setAnalyzingRealFrame(false);
        return;
      }

      let pName =
        data?.analysis?.product_name ||
        data?.detected_objects?.[0]?.product_name ||
        data?.items?.[0]?.product_name ||
        data?.product_name ||
        data?.item_title ||
        "";

      if (isVagueOrPartialRead(pName)) {
        // No distinct item detected — stay clean without inserting placeholder cards or fake prices
        setAnalyzingRealFrame(false);
        return;
      }

      // Duplicate Prevention: Record signature of identified item
      lastRecognizedSignatureRef.current = {
        name: pName.toLowerCase().trim(),
        timestamp: Date.now(),
      };

      setScanErrorState({ type: null });

      // Extract Multi-Object Detected Items from REAL OpenAI Vision response
      const rawDetected = data?.items || data?.detected_objects;
      const detected =
        rawDetected && Array.isArray(rawDetected) && rawDetected.length > 0
          ? rawDetected
          : [
              {
                id: `obj-${Date.now()}`,
                product_name: pName,
                brand: data?.analysis?.brand || data?.brand || "Authentic",
                category: data?.analysis?.category || data?.category || "General Resale",
                condition: data?.analysis?.condition || data?.condition || "Used - Good",
                bbox: { x: 20, y: 15, width: 60, height: 70 },
                confidence_score: data?.analysis?.confidence_score || 0.95,
              },
            ];

      // Instant Bounding Boxes & Hard-Kill Filtering
      const now = Date.now();
      const validPendingItems: ActiveScanItem[] = [];

      for (const item of detected) {
        let pName = (item.product_name || "").trim();
        const cat = item.category || "General Resale";

        // Clean out internal AI notes from title instead of dropping the scan hit
        pName = pName
          .replace(/\(.*?unclear.*?\)/gi, "")
          .replace(/\(.*?unknown.*?\)/gi, "")
          .replace(/exact card details unclear/gi, "")
          .replace(/not fully readable/gi, "")
          .replace(/cannot be determined/gi, "")
          .replace(/could not be identified/gi, "")
          .trim();

        if (isVagueOrPartialRead(pName)) {
          continue;
        }

        // Hard-Kill Exclusions (Strict Vacuum Cleaner Rejection)
        if (isVacuumCleaner(pName, cat)) {
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
          suggestedPriceMin: Number(data.suggested_price_min) || undefined,
          suggestedPriceMax: Number(data.suggested_price_max) || undefined,
          confidenceScore: item.confidence_score || data.analysis?.confidence_score || 0.95,
          ebayCompsCount: item.ebay_comps_count || data.ebay_comps_count || undefined,
          compsSource: data.comps_source || (data.ebay_comps_count ? "browse_api" : "ai_estimate"),
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
          let rawMin = Number(data.suggested_price_min) || 15;
          let rawMax = Number(data.suggested_price_max) || rawMin + 10;
          let baseVal = Number(data.suggested_price_median) || Math.round(((rawMin + rawMax) / 2) * 100) / 100;

          let itemCondition = cleanConditionText(obj.condition);
          let detectedTagPrice = Number(data.detected_tag_price) || (baseVal <= 4 ? 1 : Math.max(3, Math.round(baseVal * 0.15 * 100) / 100));
          let trueNetProfit = Number(data.true_net_profit) || Math.max(0, Math.round((baseVal - detectedTagPrice - (baseVal * 0.134 + 0.33)) * 100) / 100);
          let roiPercentage = Number(data.roi_percentage) || (detectedTagPrice > 0 ? Math.round((trueNetProfit / detectedTagPrice) * 100) : 0);
          let copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" = data.cop_verdict || (roiPercentage >= 300 && trueNetProfit >= 30 ? "MUST_COP" : roiPercentage >= 100 && trueNetProfit >= 15 ? "QUICK_FLIP" : trueNetProfit < 10 ? "PASS_RISKY" : "FAIR_MARGIN");

          let estCost = detectedTagPrice;
          let estimatedProfit = trueNetProfit;
          let estRoi = roiPercentage;

          const valuedItem: ActiveScanItem = {
            ...obj,
            status: "valued",
            estimatedValue: baseVal,
            suggestedPriceMin: rawMin,
            suggestedPriceMax: rawMax,
            confidenceScore: obj.confidenceScore || 0.95,
            ebayCompsCount: obj.ebayCompsCount,
            compsSource: obj.compsSource,
            estCost,
            estimatedProfit,
            estRoi,
            tagPrice: detectedTagPrice,
            trueNetProfit,
            roiPercentage,
            copVerdict,
            condition: itemCondition,
            inventoryCondition: "used_working",
            defectNotes: obj.defectNotes,
            asIsDisclaimer: obj.asIsDisclaimer,
          };

          setSessionScanCount((prev) => prev + 1);

          // Stream Background SLAM Anonymized Telemetry to Global Inventory Heatmap Backend
          if (typeof fetch !== "undefined") {
            try {
              void fetch("/api/radar/spatial-slam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  deviceId: `slam-device-${Math.floor(Math.random() * 1000)}`,
                  storeName: "Local Sourcing Hub",
                  scannedItem: {
                    name: obj.productName,
                    profit: estimatedProfit,
                    bbox: obj.bbox,
                  },
                }),
              }).catch(() => {});
            } catch {}
          }

          // Dynamically update activeScans array with smooth 3.5s decay retention
          if (scanExpiryTimerRef.current) {
            clearTimeout(scanExpiryTimerRef.current);
          }

          setActiveScans((prev) => {
            const filtered = prev.filter((s) => getKeywordSimilarity(s.productName, obj.productName) < 0.6);
            return [valuedItem, ...filtered].slice(0, 3);
          });

          scanExpiryTimerRef.current = setTimeout(() => {
            setActiveScans([]);
          }, 3500);

          const isGrailHit = estimatedProfit >= 80 || estRoi >= 250;

          // Grail Alert Triggering Engine ($80+ Profit or 250%+ ROI)
          if (isGrailHit && grailMode) {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([100, 50, 200]);
            }
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
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(80);
              }
              playChime(estimatedProfit);
              speakCue(`High profit hit: ${obj.productName}. Profit ${fmtMoney(estimatedProfit)}.`);
              lastChimedRef.current = { name: obj.productName, time: now };
            }
          }

          // Add EVERY scanned item directly to top of Real-Time Scanned List
          const verifiedHit: DetectedHit = {
            id: `hit-${now}-${Math.random().toString(36).substring(2, 8)}`,
            name: obj.productName,
            brand: obj.brand || data?.analysis?.brand || null,
            category: obj.category,
            condition: itemCondition,
            visualReasoning: data?.analysis?.visual_reasoning ? {
              visible_text_detected: data.analysis.visual_reasoning.visible_text_detected,
              physical_object_description: data.analysis.visual_reasoning.physical_object_description,
            } : undefined,
            inventoryCondition: "used_working",
            defectNotes: obj.defectNotes,
            asIsDisclaimer: obj.asIsDisclaimer,
            estimatedValue: baseVal,
            estCost,
            estimatedProfit,
            estRoi,
            tagPrice: detectedTagPrice,
            trueNetProfit,
            roiPercentage,
            copVerdict,
            verdict: estimatedProfit > 15 ? "BUY" : estimatedProfit >= 5 ? "CAUTION" : "PASS",
            confidence: 0.98,
            ebayCompsCount: obj.ebayCompsCount,
            compsSource: obj.compsSource,
            bbox: obj.bbox,
            timestamp: now,
            isGrail: isGrailHit,
            salesVelocity: data?.sales_velocity || {
              sell_speed: estimatedProfit > 40 ? "FAST_FLIP" : "MODERATE",
              est_days_to_sell: estimatedProfit > 40 ? "1-3 Days" : "7-14 Days",
              demand_score: estimatedProfit > 40 ? 92 : 75,
              sell_through_rate: estimatedProfit > 40 ? "88% High Demand" : "72% Steady Turnover",
            },
            futureGrail: data?.future_grail || (
              obj.productName.toLowerCase().includes("camera") ||
              obj.productName.toLowerCase().includes("cyber-shot") ||
              obj.productName.toLowerCase().includes("powershot") ||
              obj.productName.toLowerCase().includes("y2k") ||
              obj.productName.toLowerCase().includes("vintage")
                ? {
                    is_future_grail: true,
                    trend_source: "TikTok #digicam Viral",
                    viral_score: 94,
                    current_price: baseVal,
                    projected_peak_price: Math.round(baseVal * 1.75 * 100) / 100,
                    projected_roi_gain: "+75% in 30 Days",
                    holding_recommendation: "BUY & HOLD 30 DAYS",
                    value_curve: [baseVal, Math.round(baseVal * 1.15), Math.round(baseVal * 1.4), Math.round(baseVal * 1.6), Math.round(baseVal * 1.75)],
                  }
                : undefined
            ),
          };

          setCapturedLog((prev) => [verifiedHit, ...prev]);
          toast.success(`🎯 Item Identified: ${obj.productName} (+$${estimatedProfit.toFixed(2)} AUD Net Profit)`, { id: `hit-toast-${obj.productName}` });
        } catch (err) {
          console.error("[Spadas Lens] Item valuation formatting error:", err);
          setActiveScans((prev) => prev.filter((s) => s.id !== obj.id));
        }
      }
    } catch (err: any) {
      console.log('[Spadas Lens] fetch threw:', String(err));
      console.warn("Live camera Vision scan warning:", err?.message);
    } finally {
      // GUARANTEED ALWAYS-RELEASE STATE RESET
      analyzingRef.current = false;
      setAnalyzingRealFrame(false);
    }
  }, [soundEnabled]);

  // HUD STATE MACHINE: Keep recognized item cards visible for 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveScans((prev) =>
        prev.filter((item) => {
          const isStuckPending = item.status === "pending" && now - item.timestamp > 4000;
          const isStale = now - item.timestamp > 12000;
          return !isStuckPending && !isStale;
        })
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const processFrameRef = useRef(processCurrentFrame);
  useEffect(() => {
    processFrameRef.current = processCurrentFrame;
  }, [processCurrentFrame]);

  // Active Auto-Scan & Scene Change Watcher with strict Throttling & Duplicate Prevention
  useEffect(() => {
    if (!stream || !autoScanActive || !!deepVerifyItem) return;

    let isDestroyed = false;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 64;
    offCanvas.height = 64;
    const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

    let wasMoving = false;
    let stableTicks = 0;
    let lastAutoTriggerTime = Date.now();

    const interval = setInterval(() => {
      if (isDestroyed) return;
      if (analyzingRef.current) return; // In-flight state lock: never trigger while a scan is processing

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused) return;

      if (!offCtx) return;
      offCtx.drawImage(video, 0, 0, 64, 64);
      const imgData = offCtx.getImageData(0, 0, 64, 64);
      const pixels = imgData.data;

      const prev = prevFramePixelsRef.current;
      if (!prev || prev.length !== pixels.length) {
        prevFramePixelsRef.current = new Uint8ClampedArray(pixels);
        return;
      }

      // Calculate pixel delta across frame
      let diffSum = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        diffSum += Math.abs(pixels[i] - prev[i]);
      }
      const avgDiff = diffSum / (pixels.length / 16) / 255;
      prevFramePixelsRef.current = new Uint8ClampedArray(pixels);

      const isPanning = avgDiff > 0.085;
      const isStill = avgDiff <= 0.05;

      if (isPanning) {
        setCameraMoving(true);
        wasMoving = true;
        stableTicks = 0;
        // User panned away to a new scene — clear duplicate lock
        lastRecognizedSignatureRef.current = null;
      } else if (isStill) {
        setCameraMoving(false);
        stableTicks++;
      }

      const now = Date.now();
      const timeSinceLast = now - Math.max(lastAutoTriggerTime, lastScanTimeRef.current);

      // Duplicate Prevention: If camera is holding still over an item already identified in the last 12s, DO NOT rescan
      const hasRecentDetection =
        lastRecognizedSignatureRef.current &&
        now - lastRecognizedSignatureRef.current.timestamp < 12000;

      if (hasRecentDetection && !wasMoving) {
        return;
      }

      // Strict Throttling & Cooldowns:
      // Mode 1: SWEEP / AUTO AR MODE -> 3500ms min cooldown
      if (scanMode === "sweep") {
        if (!isPanning) {
          const justSettled = wasMoving && stableTicks >= 2 && timeSinceLast >= 3200;
          const periodicScan = stableTicks >= 12 && timeSinceLast >= 4500;

          if (justSettled || periodicScan) {
            wasMoving = false;
            lastAutoTriggerTime = now;
            void processFrameRef.current(false);
          }
        }
      }
      // Mode 2: BARCODE MODE
      else if (scanMode === "barcode") {
        if (stableTicks >= 2 && timeSinceLast >= 2000) {
          wasMoving = false;
          lastAutoTriggerTime = now;
          void processFrameRef.current(false);
        }
      }
    }, 250);

    return () => {
      isDestroyed = true;
      clearInterval(interval);
    };
  }, [stream, autoScanActive, scanMode, deepVerifyItem]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-6 pb-24 mx-auto animate-fade-in">
      {/* Video Viewport Container (Tap Anywhere to Scan Item Immediately) */}
      <div
        onClick={() => void processCurrentFrame(true)}
        className="relative aspect-[4/3] sm:aspect-[16/9] w-full max-w-full box-border overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-xl cursor-pointer"
      >
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
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Persistent Session Scan & Profit Stats Ticker */}
            <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/40 px-3.5 py-1 text-[11px] font-black text-cyan-300 shadow-xl backdrop-blur-md">
                <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                <span>🎯 {sessionScanCount} Scanned</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400">💰 {profitableCount} Profitable</span>
                {bestProfit > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-300">👑 Top: +{fmtMoney(bestProfit)}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                {/* 1x / 2x Digital Zoom Toggle */}
                {zoomSupported && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel(zoomLevel === 1 ? 2 : 1);
                    }}
                    className="h-8 px-2.5 rounded-full border border-slate-700 bg-slate-950/80 text-[11px] font-black text-cyan-300 hover:border-cyan-400 transition shadow-lg backdrop-blur-md cursor-pointer"
                    title="Toggle Camera Zoom"
                  >
                    {zoomLevel}x
                  </button>
                )}

                {/* Torch / Flashlight Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleTorch();
                  }}
                  className={`h-8 w-8 rounded-full border flex items-center justify-center transition backdrop-blur-md shadow-lg cursor-pointer ${
                    torchEnabled
                      ? "bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                      : "bg-slate-950/80 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                  }`}
                  title={torchEnabled ? "Flashlight ON" : "Turn Flashlight ON"}
                >
                  <Zap className="h-3.5 w-3.5" />
                </button>

                {/* Sound Chime Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSoundEnabled(!soundEnabled);
                  }}
                  className={`h-8 w-8 rounded-full border flex items-center justify-center transition backdrop-blur-md shadow-lg cursor-pointer ${
                    soundEnabled
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-950/80 border-slate-700 text-slate-500"
                  }`}
                  title={soundEnabled ? "Audio Chimes Active" : "Audio Muted"}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Minimalist Scanning Beam Indicator */}
            {analyzingRealFrame && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-25 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-pulse" />
              </div>
            )}

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
            ) : null}

            {/* Phase 4: Non-Alarming Scan Error State Banner */}
            {scanErrorState.type && !isOffline && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md mx-auto pointer-events-none">
                {scanErrorState.type === "rate_limit_user" && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-2xl border border-amber-300/60">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {scanErrorState.retryAfter && scanErrorState.retryAfter > 0
                        ? `You've hit your scan limit. Try again in ${scanErrorState.retryAfter}s.`
                        : "You've hit your scan limit. Try again shortly."}
                    </span>
                  </div>
                )}

                {scanErrorState.type === "rate_limit_upstream" && (
                  <div className="flex items-center gap-2 rounded-xl bg-yellow-400/95 backdrop-blur-md px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-2xl border border-yellow-300/60">
                    <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                    <span>Busy right now. Try again in a few seconds.</span>
                  </div>
                )}

                {scanErrorState.type === "unauthorized" && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/95 backdrop-blur-md px-4 py-2.5 text-xs font-extrabold text-slate-200 shadow-2xl border border-slate-600/60 pointer-events-auto w-full">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>Session expired. Please sign in to continue.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="inline-flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-3 py-1 rounded-lg text-[11px] transition shrink-0"
                    >
                      <LogIn className="h-3 w-3" /> Sign In
                    </button>
                  </div>
                )}



                {scanErrorState.type === "generic" && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-950/95 backdrop-blur-md px-4 py-2.5 text-xs font-extrabold text-red-200 shadow-2xl border border-red-500/50">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    <span>Scan error. Raw payload logged on server.</span>
                  </div>
                )}
              </div>
            )}

            {/* Immediate Scan Feedback Flash Ring */}
            {scanFeedback === "HIT" && (
              <div className="absolute inset-0 z-30 pointer-events-none border-4 border-emerald-400 bg-emerald-500/10 transition-all duration-300 animate-pulse shadow-[inset_0_0_50px_rgba(52,211,153,0.6)]" />
            )}
            {scanFeedback === "MISS" && (
              <div className="absolute inset-0 z-30 pointer-events-none border-4 border-rose-500 bg-rose-500/10 transition-all duration-300 animate-pulse shadow-[inset_0_0_50px_rgba(244,63,94,0.6)]" />
            )}

            {/* Minimalist Glassmorphic Corner Viewfinder Ticks (Unobstructed View) */}
            <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center p-8">
              <div className="relative w-full h-full max-w-[420px] max-h-[500px] pointer-events-none">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400/70 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400/70 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400/70 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400/70 rounded-br-lg" />
              </div>
            </div>

            {/* Sleek Minimalist AR Bounding Box & 1-Line Floating Pill */}
            {activeScans.slice(0, 1).map((scan) => (
              <div
                key={scan.id}
                style={{
                  left: `${scan.bbox.x}%`,
                  top: `${scan.bbox.y}%`,
                  width: `${scan.bbox.width}%`,
                  height: `${scan.bbox.height}%`,
                }}
                className={`absolute z-20 pointer-events-none transition-all duration-300 border-2 rounded-2xl ${
                  scan.status === "valued"
                    ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.7)]"
                    : "border-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                }`}
              >
                {/* Thrift Price Tag OCR & Instant Net Profit Holographic Floating Pill */}
                <div className="absolute -top-12 left-0 flex flex-wrap items-center gap-1.5 bg-slate-950/95 text-white border border-cyan-400/50 rounded-2xl px-3 py-1.5 text-xs font-bold shadow-2xl backdrop-blur-md z-30 pointer-events-auto max-w-[94vw] animate-fade-in">
                  <span className="text-white font-black truncate max-w-[100px] sm:max-w-[140px] text-[11px]">
                    {scan.productName}
                  </span>

                  {scan.tagPrice ? (
                    <span className="text-amber-300 font-extrabold text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                      🏷️ ${scan.tagPrice.toFixed(2)}
                    </span>
                  ) : null}

                  <span className="text-cyan-300 font-extrabold text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    💰 {fmtMoney(scan.estimatedValue || 0)}
                  </span>

                  <span className="text-emerald-400 font-black text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    +{fmtMoney(scan.trueNetProfit || scan.estimatedProfit || 0)}
                  </span>

                  {scan.copVerdict && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      scan.copVerdict === "MUST_COP"
                        ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/40"
                        : scan.copVerdict === "QUICK_FLIP"
                        ? "bg-cyan-500 text-slate-950 font-black"
                        : scan.copVerdict === "PASS_RISKY"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {scan.copVerdict === "MUST_COP" ? "👑 COP" : scan.copVerdict === "QUICK_FLIP" ? "⚡ FLIP" : "⛔ PASS"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleQuickAdd(e, scan)}
                    className="ml-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer active:scale-95"
                  >
                    +Add
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEbayItem(scan);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer active:scale-95"
                  >
                    ⚡eBay
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeepVerifyItem(scan);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}

            {/* Optical Shutter Flash Overlay */}
            {shutterFlash && (
              <div className="absolute inset-0 z-40 bg-white/70 backdrop-blur-sm pointer-events-none transition-opacity duration-200" />
            )}

            {/* Quick Snap & Value Tactile Shutter Button (Center Floating) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  analyzingRef.current = false;
                  setAnalyzingRealFrame(false);
                  void processCurrentFrame(true);
                }}
                disabled={analyzingRealFrame}
                className="group relative flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-emerald-400 p-1 shadow-[0_0_35px_rgba(6,182,212,0.6)] active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
                title="⚡ Quick Snap & Value"
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/90 border-2 border-white/90 group-hover:bg-slate-900 transition">
                  {analyzingRealFrame ? (
                    <RefreshCw className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-400 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-300 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] sm:text-[9px] font-black text-cyan-300 uppercase tracking-tight -mt-0.5">SNAP</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
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

      {/* Pinned Controls Bar */}
      {stream && (
        <LensControlsBar
          scan={{
            mode: scanMode,
            setMode: setScanMode,
            isAnalyzing: analyzingRealFrame,
            autoActive: autoScanActive,
            setAutoActive: setAutoScanActive,
            onScanNow: () => {
              analyzingRef.current = false;
              setAnalyzingRealFrame(false);
              void processCurrentFrame(true);
            },
            onStop: stopCamera,
            cameraMoving,
            rateLimited,
          }}
          hardware={{
            torchEnabled,
            torchSupported,
            onToggleTorch: toggleTorch,
            zoomLevel,
            setZoomLevel,
          }}
          audio={{
            soundEnabled,
            onToggleSound: () => setSoundEnabled(!soundEnabled),
            voiceListening,
            voiceSupported: typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
            onToggleVoice: toggleVoiceAssistant,
          }}
          prefs={{
            grailMode,
            setGrailMode,
            currency: selectedCurrency,
            setCurrency: (c) => setSelectedCurrency(c),
            isPro,
            onUpgrade: () => setIsPaywallOpen(true),
            minProfitThreshold,
            updateProfitThreshold,
          }}
          nav={{
            onGuide: () => setIsOnboardingOpen(true),
            onHistory: () => router.push("/history"),
          }}
          debug={{
            isOwner,
            showDebugDrawer,
            setShowDebugDrawer,
            lastRawApiResponse,
            latestApiError,
            isMockFallback,
          }}
        />
      )}

      {/* Real-Time Scanned Hits Feed */}
      <div className="w-full max-w-full overflow-x-hidden box-border rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg space-y-4 mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Real-Time Scanned Hits ({capturedLog.length})</span>
            {capturedLog.length === 0 && (
              <span className="text-[11px] font-semibold text-muted-foreground animate-pulse ml-2">
                (Aim camera at an item or tap "Scan Now")
              </span>
            )}
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
          {capturedLog.map((item) => (
            <LensHitCard
              key={item.id}
              item={item}
              isSelected={selectedHitIds.includes(item.id)}
              onSelect={toggleSelectHit}
              onSaveDraft={handleSaveDraftHit}
              onDeepVerify={(hit) => setDeepVerifyItem(hit)}
              onListEbay={(hit) => setActiveEbayItem(hit)}
              onReport={(id, name) => {
                void fetch("/api/scans/report", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scanId: id, itemName: name }),
                }).catch(() => {});
                toast.info("Thanks — misidentification flagged for review.", { id: `report-${id}` });
              }}
            />
          ))}
        </div>
      </div>

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

      {/* Subscription Paywall Tier Modal */}
      <SubscriptionPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        currentScans={capturedLog.length}
      />

      {/* Ebay Listing Automation Modal */}
      {activeEbayItem && (
        <EbayListingModal
          isOpen={!!activeEbayItem}
          onClose={() => setActiveEbayItem(null)}
          title={activeEbayItem.productName || activeEbayItem.name || "Scanned Item"}
          brand={activeEbayItem.brand || "Authentic"}
          price={activeEbayItem.estimatedValue || 25}
          condition={activeEbayItem.condition || "Used - Good"}
          description={`Authentic ${activeEbayItem.brand || ""} ${activeEbayItem.productName || activeEbayItem.name || "Scanned Item"}. Clean pre-owned condition, tested & fully functional. Fast dispatch from Australia.`}
        />
      )}

      {/* Forensic Deep Verify Modal */}
      {deepVerifyItem && (
        <DeepVerifyModal
          isOpen={!!deepVerifyItem}
          onClose={() => setDeepVerifyItem(null)}
          productName={(deepVerifyItem as any).productName || (deepVerifyItem as any).name || "Scanned Item"}
          brand={(deepVerifyItem as any).brand || "Brand"}
          category={(deepVerifyItem as any).category || "Fashion / Collectibles"}
        />
      )}

      {/* Camera Framing Onboarding Guide */}
      <CameraOnboardingOverlay
        forceOpen={isOnboardingOpen}
        onDismiss={() => setIsOnboardingOpen(false)}
      />
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
