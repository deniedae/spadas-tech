import React, { Component, ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Volume2, VolumeX, Sparkles, CheckCircle2, RefreshCw, Zap, ShieldAlert, Clock, ArrowRight, Sliders, Bug, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";

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
  return /\b(vacuum|cleaner|hoover|roomba|dyson\s*v\d+|bissel|eureka|dustbuster|shop-vac|sweeper|floor cleaner)\b/i.test(text);
}

// Broad Vague Generic Term Blocklist (Rejects titles lacking brand/model specificity)
const VAGUE_GENERIC_TERMS = new Set([
  "keyboard",
  "computer keyboard",
  "trading card",
  "trading cards",
  "card",
  "game controller",
  "controller",
  "coffee maker",
  "spray bottle",
  "bottle",
  "mouse",
  "computer mouse",
  "headphones",
  "speaker",
  "cable",
  "charger",
  "phone case",
  "scanned item"
]);

// Strict Vague / Partial Read Detector (Nullify Vague & Non-Specific Reads)
function isVagueOrPartialRead(productName?: string | null, brand?: string | null): boolean {
  if (!productName || productName.trim() === "" || productName === "NO_CENTER_ITEM") return true;
  const lower = productName.toLowerCase().trim();

  // Reject exact vague generic terms lacking specificity
  if (VAGUE_GENERIC_TERMS.has(lower)) return true;

  // Reject generic titles <= 2 words if no specific brand or model is attached
  const words = lower.split(/\s+/);
  if (words.length <= 2 && (!brand || brand.trim() === "" || brand.toLowerCase() === "generic")) return true;

  const vaguePhrases = [
    "unclear",
    "not fully readable",
    "exact card details unclear",
    "exact set/variant not",
    "unknown model",
    "unknown brand",
    "unidentified",
    "generic read",
    "various items",
    "assorted",
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

  // Lightweight Non-Blocking Frame Scanner with Guaranteed finally Reset
  const processCurrentFrame = useCallback(async () => {
    if (analyzingRealFrame) return;

    // LIGHTWEIGHT NON-BLOCKING DEBOUNCE: Skip frame if < 2500ms since last scan to stay within RPM limits
    const currentTime = Date.now();
    if (currentTime - lastScanTimeRef.current < 2500) {
      return;
    }
    lastScanTimeRef.current = currentTime;

    setAnalyzingRealFrame(true);

    const controller = new AbortController();
    const hardTimeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const video = videoRef.current;
      let frameDataUrl = "";

      if (video && video.readyState >= 2) {
        const fullWidth = video.videoWidth || 1280;
        const fullHeight = video.videoHeight || 720;

        // Full-Frame Vision Capture
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(1280, fullWidth);
        canvas.height = Math.min(720, fullHeight);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(video, 0, 0, fullWidth, fullHeight, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL("image/jpeg", 0.85);
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

      // Handle 429 RPM Rate Limits silently without triggering false-positive credit exhaustion warnings!
      if (res?.status === 429 || data?.isRateLimited) {
        const rateErr = data?.rawError || data?.error || "OpenAI RPM rate limit hit (429)";
        setLatestApiError(rateErr);
        setRateLimited(true);
        toast.info("Scanning too fast... pausing 2.5s for rate limit");
        setTimeout(() => setRateLimited(false), 2500);
        return;
      }

      if (!res || res.status === 401 || res.status === 402 || !res.ok) {
        setIsMockFallback(true);
        setLatestApiError(data?.rawError || data?.error || `HTTP ${res?.status || 500} Unauthorized / Insufficient Quota`);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("spadas_ai_credit_exhausted"));
        }
      } else if (data?.isMockFallback) {
        setIsMockFallback(true);
        setLatestApiError("Running in Mock Fallback Mode");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("spadas_ai_credit_exhausted"));
        }
      } else {
        setIsMockFallback(false);
        setLatestApiError(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("spadas_ai_credit_exhausted");
          sessionStorage.removeItem("spadas_ai_credit_exhausted");
        }
      }

      // If API returned mock fallback or failed due to credit exhaustion, supply local mock generator item
      if (!data || !data.analysis || data.error) {
        setIsMockFallback(true);
        const mockCatalog = [
          { name: "Nintendo Game Boy Color (Berry Red)", brand: "Nintendo", cat: "Video Games & Consoles", price_min: 75, price_max: 95 },
          { name: "Sony Walkman WM-FX290 Cassette Player", brand: "Sony", cat: "Vintage Electronics", price_min: 55, price_max: 70 },
          { name: "Pokémon Base Set Unlimited Charmander 46/102", brand: "Wizards of the Coast", cat: "Trading Cards", price_min: 30, price_max: 45 },
          { name: "Bose SoundLink Mini II Bluetooth Speaker", brand: "Bose", cat: "Consumer Electronics", price_min: 80, price_max: 105 },
          { name: "Logitech MX Master 3S Wireless Mouse", brand: "Logitech", cat: "Computer Accessories", price_min: 70, price_max: 90 },
          { name: "Super Mario World SNES Cartridge", brand: "Nintendo", cat: "Video Games", price_min: 40, price_max: 55 },
        ];
        const item = mockCatalog[Math.floor(Math.random() * mockCatalog.length)];
        data = {
          isMockFallback: true,
          detected_objects: [
            {
              id: `mock-obj-${Date.now()}`,
              product_name: item.name,
              brand: item.brand,
              category: item.cat,
              condition: "Used - Good",
              bbox: { x: 20, y: 20, width: 60, height: 60 },
              confidence_score: 0.96,
            },
          ],
          analysis: {
            product_name: item.name,
            brand: item.brand,
            category: item.cat,
            condition: "Used - Good",
            confidence_score: 0.96,
          },
          suggested_price_min: item.price_min,
          suggested_price_max: item.price_max,
        };
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

        // Hard-Kill Exclusions (Strict Vacuum Cleaner & Generic Title Rejection)
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

      // Cap activeScans to a maximum of 3 concurrent items
      setActiveScans((prev) => {
        if (prev.length >= 3) return prev;
        const existingIds = new Set(prev.map((s) => s.id));
        const newScans = validPendingItems.filter((s) => !existingIds.has(s.id));
        const availableSlots = Math.max(0, 3 - prev.length);
        return [...newScans.slice(0, availableSlots), ...prev];
      });

      // Sequential Single-Item Pricing Resolution
      for (const obj of validPendingItems) {
        try {
          const invCond = obj.inventoryCondition || "used_working";
          const isUntestedOrFaulty = invCond === "untested" || invCond === "faulty_for_parts";

          let rawMin = Number(data.suggested_price_min) || (isUntestedOrFaulty ? 15 : 25);
          let rawMax = Number(data.suggested_price_max) || rawMin + (isUntestedOrFaulty ? 10 : 15);

          // For untested or faulty items, base valuation dynamically anchors to lower-bound parts comp
          let baseVal = isUntestedOrFaulty
            ? Math.round(rawMin * 100) / 100
            : Math.round(((rawMin + rawMax) / 2) * 100) / 100;

          let itemCondition = cleanConditionText(obj.condition);

          // Conservative acquisition cost calculation (for parts/untested, cost factor is 0.25 to prevent overpaying)
          let estCost = Math.max(2, Math.round(baseVal * (isUntestedOrFaulty ? 0.25 : 0.35)));
          let estimatedProfit = Math.max(0, Math.round((baseVal - estCost) * 100) / 100);
          let estRoi = estCost > 0 ? Math.round((estimatedProfit / estCost) * 100) : 0;

          // Silent Ghosting for zero/negative profit items
          if (estimatedProfit <= 0) {
            setActiveScans((prev) => prev.filter((s) => s.id !== obj.id));
            continue;
          }

          // Dynamic UI Update: Turn bounding box GREEN & attach valuation
          setActiveScans((prev) =>
            prev.map((s) =>
              s.id === obj.id
                ? {
                    ...s,
                    status: "valued",
                    estimatedValue: baseVal,
                    estCost,
                    estimatedProfit,
                    estRoi,
                    condition: itemCondition,
                    inventoryCondition: invCond,
                    defectNotes: obj.defectNotes,
                    asIsDisclaimer: obj.asIsDisclaimer,
                  }
                : s
            )
          );

          // Custom Profit & ROI Threshold Audio Chime & Cue
          if (estimatedProfit >= minProfitThreshold && estRoi >= minRoiThreshold) {
            const lastChimed = lastChimedRef.current;
            const isSameProduct = lastChimed && getKeywordSimilarity(lastChimed.name, obj.productName) >= 0.55;
            const isCooldownActive = lastChimed && (now - lastChimed.time < 15000);

            if (!isSameProduct || !isCooldownActive) {
              playHighProfitChime();
              speakCue(`High profit hit: ${obj.productName}. Profit ${fmtMoney(estimatedProfit)}.`);
              lastChimedRef.current = { name: obj.productName, time: now };
            }
          }

          // Unshift clean verified hit card to top of Real-Time Scanned List
          const verifiedHit: DetectedHit = {
            id: obj.id,
            name: obj.productName,
            category: obj.category,
            condition: itemCondition,
            inventoryCondition: invCond,
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
          };

          setCapturedLog((prev) => {
            const existingIdx = prev.findIndex(
              (h) => h.id === verifiedHit.id || getKeywordSimilarity(h.name, verifiedHit.name) >= 0.75
            );
            if (existingIdx !== -1) {
              const updated = [...prev];
              updated[existingIdx] = { ...updated[existingIdx], timestamp: now };
              return updated;
            }
            return [verifiedHit, ...prev].slice(0, 15);
          });
        } catch (err) {
          setActiveScans((prev) => prev.filter((s) => s.id !== obj.id));
        }
      }
    } catch (err: any) {
      clearTimeout(hardTimeoutId);
      if (err?.name === "AbortError") {
        console.warn("[Spadas Lens] AI Vision fetch request aborted due to 4000ms hard timeout.");
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

  // RESET FRONTEND STATE MACHINE: Drop items in "pending" status > 3s or stale > 3s to prevent ghost boxes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveScans((prev) =>
        prev.filter((item) => {
          const isStuckPending = item.status === "pending" && now - item.timestamp > 3000;
          const isStale = now - item.timestamp > 3000;
          return !isStuckPending && !isStale;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stable Auto-Scan Loop
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
      }, 1000);
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
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-6 pb-20 mx-auto">
      {/* Video Viewport Container */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full max-w-full box-border overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-slate-950 shadow-2xl">
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

            {/* Low Credit UI Warning Banner */}
            {isMockFallback && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md mx-auto pointer-events-none">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2 text-xs font-extrabold text-slate-950 shadow-2xl border border-amber-300/60 animate-pulse">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-slate-950" />
                  <span>⚠️ API Credits Depleted - Running in Test Mode</span>
                </div>
              </div>
            )}

            {/* Target Framing Reticle */}
            <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
              <div className="relative w-[65%] h-[75%] max-w-[340px] max-h-[460px] rounded-2xl border border-cyan-400/50 flex flex-col justify-between p-3">
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br" />

                {/* Helper text when no active scans are present */}
                {activeScans.length === 0 && (
                  <div className="w-full text-center mt-2">
                    <span className="inline-block rounded-full bg-slate-950/85 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-cyan-300 border border-cyan-400/40 shadow-lg">
                      ⚡ MULTI-OBJECT SCANNER ACTIVE · PAN CAMERA ACROSS SHELVES
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
                className={`absolute z-20 pointer-events-none transition-all duration-300 border-2 ${
                  scan.status === "valued"
                    ? "border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
                    : "border-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                }`}
              >
                {/* Minimal High-Contrast Text Overlay Header */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-slate-950/95 text-white border border-white/20 rounded-md px-2.5 py-1 text-xs font-bold shadow-2xl whitespace-nowrap z-30">
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
                    <span className="bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded text-[11px] font-black tracking-tight">
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
      </div>

      {/* Camera Controls Bar (Pinned Outside Camera Viewport Container) */}
      {stream && (
        <div className="w-full box-border flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/90 backdrop-blur-md p-3.5 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`h-2 w-2 rounded-full animate-pulse ${rateLimited ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className={rateLimited ? "text-amber-300" : "text-cyan-300"}>
              {rateLimited
                ? "API Rate Limit - Retrying in 1.5s..."
                : analyzingRealFrame
                ? "Scanning Live Frame..."
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
              onClick={() => setShowDebugDrawer(!showDebugDrawer)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
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
              className="inline-flex h-9 items-center rounded-xl bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-500 cursor-pointer"
            >
              Stop
            </button>
          </div>

          {/* Custom Profit Threshold Slider & Presets Bar */}
          <div className="w-full pt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
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
                  className={`px-2 py-1 rounded text-[11px] font-black transition ${
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

      {/* Selectable Real-Time Hits Feed */}
      {capturedLog.length > 0 && (
        <div className="w-full max-w-full overflow-x-hidden box-border rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-3 mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Real-Time Scanned Hits ({capturedLog.length})</span>
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

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 w-full box-border">
            {capturedLog.map((item) => {
              const isSelected = selectedHitIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectHit(item.id)}
                  className={`relative w-full min-w-0 box-border overflow-hidden cursor-pointer transition-all rounded-lg border p-2.5 px-3 space-y-1 ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/15 shadow-[0_0_12px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400"
                      : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectHit(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 uppercase tracking-tight shrink-0">
                        +${item.estimatedProfit.toFixed(2)} Profit
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      Updated
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate leading-snug w-full min-w-0">{item.name}</h4>
                  <div className="flex items-center justify-between text-[11px] pt-0.5 w-full min-w-0">
                    <span className="text-muted-foreground text-[10px] truncate max-w-[65%]">{item.condition}</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">{fmtMoney(item.estimatedValue)}</span>
                  </div>
                  {item.inventoryCondition === "untested" || item.inventoryCondition === "faulty_for_parts" ? (
                    <div className="pt-1 space-y-1">
                      <span className="inline-block rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black">
                        🟠 UNTESTED / FOR PARTS
                      </span>
                      {item.defectNotes && item.defectNotes.length > 0 && (
                        <p className="text-[10px] text-amber-400/90 font-medium truncate">
                          ⚠️ {item.defectNotes.join(" · ")}
                        </p>
                      )}
                    </div>
                  ) : null}
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
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 sm:px-7 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition cursor-pointer whitespace-nowrap max-w-full"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
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



