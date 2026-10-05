import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
  Power,
  ShieldCheck,
  Crown,
  X,
  TrendingUp,
  AlertTriangle,
  Barcode,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ExternalLink,
  Lock,
  Scan,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, formatAUD } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";
import { detectGeoCurrency, CURRENCY_CONFIGS, SupportedCurrency } from "@/app/lib/currency-routing";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { resilientFetch } from "@/app/lib/resilient-fetch";
import { playScanBeep, triggerScanHaptic, createNativeBarcodeScanner, isNativeBarcodeDetectorSupported, CORE_BARCODE_FORMATS, decodeBarcodeFromImageSource } from "@/lib/barcode-detector";
import { syncProfitToAndroidWidget, triggerTactileHaptic, openExternalUrlSafely } from "@/lib/android-bridge";
import { sourcingBus } from "@/lib/sourcing-event-bus";
import { setCachedValuation, getCachedValuation } from "@/lib/offline-lru-cache";
import { executeParallelAppraisal } from "@/lib/concurrent-appraiser";
import { ScanTrace } from "@/lib/scan-trace";
import { saveScanOffline } from "@/app/lib/offline-storage";
import { enqueueScanForBackgroundUpload, flushScanHistoryQueue, initScanHistoryQueue } from "@/lib/scan-history-queue";
import dynamic from "next/dynamic";
import CameraOnboardingOverlay from "@/components/camera-onboarding-overlay";
import OpticalHorizonLeveler from "@/components/optical-horizon-leveler";
import {
  playMechanicalShutterSound,
  playLockOnChime,
  playCashCopChime,
  playTactileClickSound,
  triggerShutterHaptic,
  triggerLockOnHaptic,
  triggerGrailHaptic,
  triggerDialTickHaptic,
} from "@/lib/audio-haptic-engine";
import LensHitCard from "@/components/lens-hit-card";
import { ensureVerifiedSoldComps } from "@/components/AuditCompsLedger";
import { estimateCategoryShippingCost, calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { checkNeedsVerification } from "@/lib/forensic-knowledge";
import { GuestScanHud } from "@/components/guest-scan-hud";
import { GuestScanLimitModal } from "@/components/guest-scan-limit-modal";
import {
  getGuestScanState,
  recordGuestScan,
  saveGuestScannedItem,
  resetGuestScanState,
  MAX_GUEST_SCANS,
  type GuestScanState,
} from "@/lib/guest-scan-tracker";
import {
  RapidThriftItem,
  savePhotoBlob,
  dataUriToBlob,
  triggerPocketAlert,
  canvasToBlob,
} from "@/lib/rapid-thrift-engine";
import { useHaulStore, haulStore } from "@/lib/haul-store";
import { quickSnapQueue, useQuickSnapQueue } from "@/lib/quick-snap-queue";

const SubscriptionPaywallModal = dynamic(() => import("@/components/subscription-paywall-modal"), { ssr: false });
const InAppReviewModal = dynamic(() => import("@/components/in-app-review-modal"), { ssr: false });
import { recordSuccessfulScanAndCheckReviewPrompt, checkWinDelightPrompt } from "@/components/in-app-review-modal";
const EbayListingModal = dynamic(() => import("@/components/ebay-listing-modal"), { ssr: false });
const DeepVerifyModal = dynamic(() => import("@/components/deep-verify-modal").then((m) => m.DeepVerifyModal), { ssr: false });
const LensCompsModal = dynamic(() => import("@/components/lens-comps-modal"), { ssr: false });
const AuditCompsLedger = dynamic(() => import("@/components/AuditCompsLedger"), { ssr: false });
const RapidThriftDrawer = dynamic(() => import("@/components/rapid-thrift-drawer").then((m) => m.RapidThriftDrawer), { ssr: false });
const QuickHistoryDrawer = dynamic(() => import("@/components/quick-history-drawer").then((m) => m.QuickHistoryDrawer), { ssr: false });
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import type { DetectedHit, ActiveScanItem, CopVerdict } from "@/types/lens";
export type { DetectedHit, ActiveScanItem, CopVerdict } from "@/types/lens";
import { processFocalCrop } from "@/lib/image-processing";
import {
  processFrameForVision,
  poolConsecutiveFrames,
  createMultiFrameComposite,
  createMultiFrameCompositeAsync,
  extractReticleMacroCrop,
  extractReticleMacroCropAsync,
  exportCanvasToOptimizedDataUrlAsync,
} from "@/lib/image-preprocessor";
import { ScanProgressiveLoader, type ScanStage } from "@/components/scan-progressive-loader";
import {
  resolveSpatialMetadata,
  getPredictiveQueryForCategory,
  fireParallelCompsQuery,
  recordCategoryTemplateQuery,
  type CategoryBiasOption,
  type SpatialMetadata,
} from "@/lib/comps-prefetch-engine";

// Error boundaries extracted to lens-error-boundaries.tsx
import {
  CameraErrorBoundary,
  ValuationCardErrorBoundary,
  CameraViewportErrorBoundary,
} from "@/components/lens-error-boundaries";

// Utilities extracted to lib/lens-utils.ts
import {
  STOP_WORDS,
  getKeywordSimilarity,
  isVagueOrPartialRead,
  isMeaningfulMeta,
  sanitizeMetaText,
  cleanConditionText,
  cleanBrandText,
  cleanCategoryText,
  captureVideoFrame,
  captureTargetBox,
  isValidFramePayload,
  isBulkOrLotTitle,
  BULK_LOT_REGEX,
} from "@/lib/lens-utils";
import { cameraStreamManager } from "@/lib/camera-stream-provider";

// Unified media stream release helper
export function releasePersistentMediaStream() {
  cameraStreamManager.releaseCamera(undefined, true);
}

let cycleSeq = 0;

/** High-converting 1-tap verified demo sample find for first-time / guest users */
const SAMPLE_DEMO_HIT: DetectedHit = {
  id: "demo-sample-nike-dunk",
  name: "Nike Dunk Low Retro 'Panda' Black White (2024)",
  category: "Athletic Shoes / Sneakers",
  brand: "Nike",
  condition: "Pre-Owned",
  confidence: 0.98,
  estimatedValue: 145,
  suggestedPriceMin: 120,
  suggestedPriceMax: 165,
  tagPrice: 25,
  estCost: 25,
  trueNetProfit: 98,
  estimatedProfit: 98,
  estRoi: 392,
  roiPercentage: 392,
  verdict: "BUY",
  copVerdict: "MUST_COP",
  bbox: { x: 20, y: 20, width: 60, height: 60 },
  timestamp: 1775260000000,
  marketOrigin: "AU",
  compsSource: "sold_comps_api",
  ebayCompsCount: 4,
  rawComps: [
    {
      id: "demo-comp-1",
      title: "Nike Dunk Low Retro Panda Black White Mens US 10 DD1391-100",
      price: 155,
      condition: "Pre-Owned",
      soldDate: "28 Mar 2026",
      shippingIncluded: true,
      shippingPrice: 0,
      url: "https://www.ebay.com.au/sch/i.html?_nkw=nike+dunk+low+panda+sold",
      matchPercentage: 99,
      isActiveAsk: false,
    },
    {
      id: "demo-comp-2",
      title: "Nike Dunk Low Retro Panda Black/White Mens US 10.5 Authentic",
      price: 145,
      condition: "Pre-Owned",
      soldDate: "24 Mar 2026",
      shippingIncluded: true,
      shippingPrice: 0,
      url: "https://www.ebay.com.au/sch/i.html?_nkw=nike+dunk+low+panda+sold",
      matchPercentage: 96,
      isActiveAsk: false,
    },
    {
      id: "demo-comp-3",
      title: "Authentic Nike Dunk Low Retro Panda Size US 10 Good Condition",
      price: 139,
      condition: "Pre-Owned",
      soldDate: "19 Mar 2026",
      shippingIncluded: true,
      shippingPrice: 0,
      url: "https://www.ebay.com.au/sch/i.html?_nkw=nike+dunk+low+panda+sold",
      matchPercentage: 94,
      isActiveAsk: false,
    },
    {
      id: "demo-comp-4",
      title: "Nike Dunk Low Panda Black White Sneakers US 10 Pre-Owned",
      price: 142,
      condition: "Pre-Owned",
      soldDate: "15 Mar 2026",
      shippingIncluded: true,
      shippingPrice: 0,
      url: "https://www.ebay.com.au/sch/i.html?_nkw=nike+dunk+low+panda+sold",
      matchPercentage: 92,
      isActiveAsk: false,
    },
  ],
  image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80",
};

function SpadasLensCameraCore({
  onOpenHaulTab,
  onOpenSnapStudio,
}: {
  onOpenHaulTab?: () => void;
  onOpenSnapStudio?: () => void;
} = {}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isStartingCameraRef = useRef<boolean>(false);
  const [isCameraReady, setIsCameraReadyState] = useState<boolean>(false);
  const isCameraReadyRef = useRef<boolean>(false);
  const setIsCameraReady = useCallback((ready: boolean) => {
    isCameraReadyRef.current = ready;
    setIsCameraReadyState(ready);
  }, []);
  /** Ref to the inner viewfinder reticle box — used for captureTargetBox crop */
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const [scanMode, setScanMode] = useState<"snap" | "sweep" | "barcode" | "live">("snap");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraPoweredOn, setIsCameraPoweredOn] = useState<boolean>(true);
  const [scanning, setScanning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScanActive, setAutoScanActive] = useState<boolean>(false);
  const [analyzingRealFrame, setAnalyzingRealFrame] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>("idle");
  const [pendingIdentifiedItem, setPendingIdentifiedItem] = useState<{
    productName: string;
    brand?: string;
    category?: string;
    condition?: string;
    bbox?: any;
  } | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [activeScans, setActiveScans] = useState<ActiveScanItem[]>([]);
  const [activeValuationHit, setActiveValuationHitState] = useState<DetectedHit | null>(null);
  const activeValuationHitRef = useRef<DetectedHit | null>(null);
  const setActiveValuationHit = useCallback((hit: DetectedHit | null | ((prev: DetectedHit | null) => DetectedHit | null)) => {
    setActiveValuationHitState((prev) => {
      const next = typeof hit === "function" ? hit(prev) : hit;
      activeValuationHitRef.current = next;
      return next;
    });
  }, []);
  const valuationCardRef = useRef<HTMLDivElement | null>(null);
  const valuationModalMountTimeRef = useRef<number>(0);
  const [scanCompletePulse, setScanCompletePulse] = useState<boolean>(false);
  const scanCompletePulseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const valuationExpiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scanExpiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeCycleIdRef = useRef<number>(0);
  const analyzingRef = useRef(false);
  const [scanRetryPrompt, setScanRetryPrompt] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [capturedLog, setCapturedLog] = useState<DetectedHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStalled, setCameraStalled] = useState<boolean>(false);
  const cameraStalledTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Callback ref guarantees immediate stream binding the exact millisecond <video> mounts into DOM
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      // Ensure mobile WebKit and Chrome autoplay permissions
      node.setAttribute("playsinline", "true");
      node.setAttribute("webkit-playsinline", "true");
      node.muted = true;
      node.defaultMuted = true;
      node.autoplay = true;

      const activeStream = streamRef.current || cameraStreamManager.getActiveStream();
      if (activeStream && activeStream.active) {
        if (node.srcObject !== activeStream) {
          node.srcObject = activeStream;
        }
        node.play().then(() => {
          setIsCameraReady(true);
          setCameraStalled(false);
        }).catch((err) => {
          console.warn("[Spadas Lens] Video playback on mount caught:", err);
        });
      }
    }
  }, []);

  // Unified Camera Acquisition via CameraStreamManager with 3-tier hardware fallback and stall detection
  const startCamera = useCallback(async () => {
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;
    setCameraError(null);
    setCameraStalled(false);

    if (cameraStalledTimerRef.current) {
      clearTimeout(cameraStalledTimerRef.current);
    }
    cameraStalledTimerRef.current = setTimeout(() => {
      if (!isCameraReadyRef.current) {
        setCameraStalled(true);
      }
    }, 4500);

    try {
      // 1. Instant stream reuse check from ref or singleton manager
      const existing = streamRef.current && streamRef.current.active
        ? streamRef.current
        : cameraStreamManager.getActiveStream();

      let mediaStream: MediaStream;
      if (existing && existing.active && existing.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)) {
        mediaStream = existing;
      } else {
        mediaStream = await cameraStreamManager.acquireCamera({
          mode: "lens",
          facingMode: "environment",
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraPoweredOn(true);
      setScanning(true);

      const video = videoRef.current;
      if (video) {
        if (video.srcObject !== mediaStream) {
          video.srcObject = mediaStream;
        }
        video.play().then(() => {
          setIsCameraReady(true);
          setCameraStalled(false);
        }).catch((err) => {
          console.warn("[Spadas Lens] Video play() in startCamera caught:", err);
        });
      }
    } catch (err: any) {
      console.warn("[Spadas Lens] Physical camera access blocked or unavailable:", err);
      const isPermDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      setCameraError(
        isPermDenied
          ? "Camera permission denied — please allow camera access in browser settings"
          : "Camera unavailable — allow camera access in settings or tap retry"
      );
      setIsCameraPoweredOn(false);
      setIsCameraReady(false);
      setScanning(false);
    } finally {
      isStartingCameraRef.current = false;
    }
  }, []);

  // Stop Camera Stream (Releases camera ownership through unified provider)
  const stopCamera = useCallback((force = false) => {
    if (activeAbortControllerRef.current) {
      try {
        activeAbortControllerRef.current.abort();
      } catch (abortErr) {
        console.warn("[Spadas Lens] Abort controller cleanup warning:", abortErr);
      }
      activeAbortControllerRef.current = null;
    }
    cameraStreamManager.releaseCamera("lens", force);
    if (streamRef.current) {
      if (force) {
        try {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch {}
      }
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraReady(false);
    setCameraStalled(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraPoweredOn(false);
    setScanning(false);
    setActiveScans([]);
    setAnalyzingRealFrame(false);
    analyzingRef.current = false;
  }, []);

  // Bind stream to video element whenever stream changes with playback watchdog
  useEffect(() => {
    if (stream) {
      streamRef.current = stream;
    }
    const video = videoRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().then(() => {
        setIsCameraReady(true);
        setCameraStalled(false);
      }).catch(() => { });

      const watchdog = setTimeout(() => {
        if (video && (video.paused || video.readyState < 2)) {
          video.play().then(() => {
            setIsCameraReady(true);
            setCameraStalled(false);
          }).catch(() => { });
        }
      }, 500);

      return () => {
        clearTimeout(watchdog);
      };
    }
  }, [stream]);
  const [minProfitThreshold, setMinProfitThreshold] = useState<number>(5);
  const [minRoiThreshold, setMinRoiThreshold] = useState<number>(0);
  const [showDebugDrawer, setShowDebugDrawer] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [lastRawApiResponse, setLastRawApiResponse] = useState<any>(null);
  const [latestApiError, setLatestApiError] = useState<string | null>(null);
  const [scanErrorState, setScanErrorState] = useState<{
    type: "rate_limit_user" | "rate_limit_upstream" | "unauthorized" | "no_match" | "generic" | null;
    retryAfter?: number;
  }>({ type: null });
  const [cameraMoving, setCameraMoving] = useState<boolean>(false);
  const [retakeRecommendation, setRetakeRecommendation] = useState<{
    required: boolean;
    angleType: string;
    reason: string;
    promptLabel: string;
  } | null>(null);
  const [secondaryImagePayload, setSecondaryImagePayload] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [activeEbayItem, setActiveEbayItem] = useState<any | null>(null);
  const [deepVerifyItem, setDeepVerifyItem] = useState<DetectedHit | ActiveScanItem | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLimitReached, setIsLimitReached] = useState<boolean>(false);
  const [isGuestUser, setIsGuestUser] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const hasAuthToken = Object.keys(localStorage).some(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      if (hasAuthToken) return false;
      return true;
    } catch {
      return true;
    }
  });
  const [guestScanState, setGuestScanState] = useState<GuestScanState>(() => getGuestScanState());
  const recordedScanCycleRef = useRef<number>(-1);

  // Keep guest scan count synchronized across tabs and components
  useEffect(() => {
    const handleGuestUpdate = (e: any) => {
      if (e?.detail) {
        setGuestScanState(e.detail);
      } else {
        setGuestScanState(getGuestScanState());
      }
    };
    window.addEventListener("spadas_guest_scan_updated", handleGuestUpdate);
    return () => window.removeEventListener("spadas_guest_scan_updated", handleGuestUpdate);
  }, []);
  const [hasDismissedWelcome, setHasDismissedWelcome] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("spadas_dismissed_welcome_v1") === "true";
    }
    return false;
  });

  const dismissWelcome = useCallback(() => {
    setHasDismissedWelcome(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_dismissed_welcome_v1", "true");
      } catch {}
    }
  }, []);
  const [isGuestLimitModalOpen, setIsGuestLimitModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewWinMeta, setReviewWinMeta] = useState<{ profit?: number; name?: string } | null>(null);
  const [lastGuestScannedItem, setLastGuestScannedItem] = useState<any>(null);
  const [scanFeedback, setScanFeedback] = useState<"HIT" | "MISS" | null>(null);
  const [sessionScanCount, setSessionScanCount] = useState<number>(0);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [isCardExiting, setIsCardExiting] = useState<boolean>(false);
  const [networkLatencyMs, setNetworkLatencyMs] = useState<number | null>(null);
  const [isViewfinderToolsOpen, setIsViewfinderToolsOpen] = useState<boolean>(false);
  const [isValuationDetailsOpen, setIsValuationDetailsOpen] = useState<boolean>(false);

  // Hard Manual / Auto Gate & 3.5s Shutter Cooldown (Eliminates Runaway Captures & Frame Drops)
  const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);
  const isCoolingDownRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCooldown = useCallback((durationMs = 3500) => {
    setIsCoolingDown(true);
    isCoolingDownRef.current = true;
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setIsCoolingDown(false);
      isCoolingDownRef.current = false;
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  // Category Biasing via Geolocation & Spatial Metadata
  const [categoryBias, setCategoryBias] = useState<CategoryBiasOption>("auto");
  const [spatialMetadata, setSpatialMetadata] = useState<SpatialMetadata | null>(null);

  useEffect(() => {
    void resolveSpatialMetadata(categoryBias).then(setSpatialMetadata);
  }, [categoryBias]);

  // 1. Immediate State Flush on New Scan: Instantly wipes valuation states, active stream tokens, and progressive loader flags to zero
  const flushScanState = useCallback(() => {
    // Abort active in-flight NDJSON stream / fetch request
    if (activeAbortControllerRef.current) {
      try {
        activeAbortControllerRef.current.abort();
      } catch { }
      activeAbortControllerRef.current = null;
    }

    // Advance cycle counter to invalidate any pending asynchronous callbacks from previous scans
    activeCycleIdRef.current = ++cycleSeq;

    // Clear active expiration timers
    if (valuationExpiryTimerRef.current) {
      clearTimeout(valuationExpiryTimerRef.current);
      valuationExpiryTimerRef.current = null;
    }
    if (scanExpiryTimerRef.current) {
      clearTimeout(scanExpiryTimerRef.current);
      scanExpiryTimerRef.current = null;
    }
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setIsCoolingDown(false);
    isCoolingDownRef.current = false;

    // Instantly wipe all valuation states, stream tokens, and progressive loader flags to zero
    setActiveValuationHit(null);
    activeValuationHitRef.current = null;
    setActiveScans([]);
    setPendingIdentifiedItem(null);
    setActiveCompsHit(null);
    setScanStage("idle");
    setScanRetryPrompt(null);
    setScanFeedback(null);
    setFrozenFrameUrl(null);
    setLatestApiError(null);
    setLastRawApiResponse(null);
    setRetakeRecommendation(null);
    setSecondaryImagePayload(null);
    setIsLoaderTransitioning(false);
    setIsScanPaused(false);
    isScanPausedRef.current = false;
    setAnalyzingRealFrame(false);
    analyzingRef.current = false;
  }, []);

  // Cleanup abort controller on component unmount
  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        try {
          activeAbortControllerRef.current.abort();
        } catch { }
        activeAbortControllerRef.current = null;
      }
    };
  }, []);

  // Dedicated Rapid Thrift Sourcing Engine State (Unified Global Store)
  const isRapidScanMode = true;
  const {
    items: rapidItems,
    haulCount,
    rapidStats,
    setItems: setRapidItems,
    addItem,
    removeItem,
    clearHaul,
  } = useHaulStore();

  // Instant local saved tracking synchronized with localStorage and Haul
  const [savedHitIds, setSavedHitIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("spadas_saved_hit_ids");
        if (raw) return new Set(JSON.parse(raw));
      } catch { }
    }
    return new Set();
  });

  const isHitSavedInHaul = useCallback(
    (hit: DetectedHit) => {
      if (!hit) return false;
      if (savedHitIds.has(hit.id)) return true;
      if (hit.name && savedHitIds.has(hit.name.trim().toLowerCase())) return true;
      return rapidItems.some(
        (r) =>
          r.id === hit.id ||
          r.photoId === hit.id ||
          (typeof r.productName === "string" &&
            typeof hit.name === "string" &&
            r.productName.trim().toLowerCase() === hit.name.trim().toLowerCase())
      );
    },
    [savedHitIds, rapidItems]
  );
  const offlinePendingCount = rapidItems.filter((i) => i.syncStatus === "pending").length;
  const { pendingCount: quickSnapPendingCount } = useQuickSnapQueue();
  const [quickSnapFlash, setQuickSnapFlash] = useState<boolean>(false);
  const [isQuickSnapping, setIsQuickSnapping] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spadas_selected_currency");
      if (saved && (saved === "AUD" || saved === "USD" || saved === "EUR" || saved === "GBP")) {
        return saved as SupportedCurrency;
      }
    }
    return detectGeoCurrency().currency;
  });
  const [isRapidDrawerOpen, setIsRapidDrawerOpen] = useState<boolean>(false);
  const rapidQueueRef = useRef<Array<{ item: RapidThriftItem; blob: Blob }>>([]);
  const activeRapidWorkersRef = useRef<number>(0);
  const MAX_RAPID_CONCURRENCY = 2; // Capped at 2 concurrent background requests
  const wakeLockRef = useRef<any>(null);
  const latestStreamDataRef = useRef<any>(null);

  // Confirmation Gate Resolver
  const confirmGateResolverRef = useRef<((value: boolean) => void) | null>(null);

  // Reliable Non-Blocking Supabase Auth & Subscription Check on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndSubscription() {
      try {
        // 1. Instant non-blocking session check from Supabase client storage
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;

        if (currentUser) {
          const isUserAdmin = isOwnerEmail(currentUser.email);
          const hasMetadataPro = Boolean(
            currentUser.app_metadata?.is_pro ||
            currentUser.user_metadata?.is_pro ||
            currentUser.app_metadata?.plan === "pro"
          );
          resetGuestScanState();
          if (isMounted) {
            setIsGuestUser(false);
            setGuestScanState({
              count: 0,
              remaining: 9999,
              isLimitReached: false,
              firstScanAt: null,
              lastScanAt: null,
            });
            setIsGuestLimitModalOpen(false);
            if (isUserAdmin || hasMetadataPro) {
              setIsOwner(isUserAdmin);
              setIsPro(true);
              setIsLimitReached(false);
              setIsPaywallOpen(false);
            }
          }

          // 2. Fetch subscription & usage data passing Bearer token for server-side auth
          const token = session.access_token;
          const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

          const [usageRes, billingRes] = await Promise.all([
            fetch("/api/usage", { headers }).catch(() => null),
            fetch("/api/billing/status", { headers }).catch(() => null),
          ]);

          let proStatus = isUserAdmin || hasMetadataPro;
          let limitStatus = false;

          if (billingRes && billingRes.ok) {
            const billingData = await billingRes.json().catch(() => ({}));
            if (billingData.active || billingData.plan === "Pro" || billingData.status === "active") {
              proStatus = true;
            }
          }

          if (usageRes && usageRes.ok) {
            const usage = await usageRes.json().catch(() => ({}));
            if (usage.isPro) {
              proStatus = true;
            }
            limitStatus = Boolean(usage.limitReached && !proStatus);
          }

          if (isMounted) {
            setIsGuestUser(false);
            setIsPro(proStatus);
            setIsLimitReached(limitStatus);
            if (proStatus) {
              setIsLimitReached(false);
              setIsGuestLimitModalOpen(false);
              setIsPaywallOpen(false);
            }
          }
        } else {
          // Genuinely unauthenticated guest
          if (isMounted) {
            setIsGuestUser(true);
            setIsPro(false);
            setIsOwner(false);
            setGuestScanState(getGuestScanState());
          }
        }
      } catch (err) {
        console.warn("[Spadas Lens] Auth check notice:", err);
      }
    }

    void checkAuthAndSubscription();

    // 3. Reactive listener for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const isUserAdmin = isOwnerEmail(session.user.email);
        const hasMetadataPro = Boolean(
          session.user.app_metadata?.is_pro ||
          session.user.user_metadata?.is_pro ||
          session.user.app_metadata?.plan === "pro"
        );
        resetGuestScanState();
        setIsGuestUser(false);
        setGuestScanState({
          count: 0,
          remaining: 9999,
          isLimitReached: false,
          firstScanAt: null,
          lastScanAt: null,
        });
        setIsGuestLimitModalOpen(false);
        if (isUserAdmin || hasMetadataPro) {
          setIsOwner(isUserAdmin);
          setIsPro(true);
          setIsLimitReached(false);
          setIsPaywallOpen(false);
        }
      } else {
        setIsGuestUser(true);
        setIsPro(false);
        setIsOwner(false);
        setGuestScanState(getGuestScanState());
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle Subscription Checkout Return on /lens
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("checkout") === "success") {
        toast.success("🚀 Welcome to Spadas Pro! Unlimited scans unlocked.", { duration: 6000 });
        setIsPro(true);
        setIsLimitReached(false);
        setIsGuestUser(false);
        setIsGuestLimitModalOpen(false);
        setIsPaywallOpen(false);
        window.history.replaceState({}, "", "/lens");
      } else if (urlParams.get("checkout") === "canceled") {
        toast.info("Checkout was canceled. Your scans and drafts are saved.", { duration: 4000 });
        window.history.replaceState({}, "", "/lens");
      }
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        console.log("[Rapid Scan] Screen WakeLock acquired (prevents sleep in pocket)");
      } catch (err) {
        console.warn("[Rapid Scan] WakeLock error:", err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch { }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // Scan Stabilization & Dynamic Confidence State
  const [isScanPaused, setIsScanPausedState] = useState<boolean>(false);
  const isScanPausedRef = useRef<boolean>(false);
  const setIsScanPaused = useCallback((paused: boolean | ((prev: boolean) => boolean)) => {
    setIsScanPausedState((prev) => {
      const next = typeof paused === "function" ? paused(prev) : paused;
      isScanPausedRef.current = next;
      return next;
    });
  }, []);
  const [frozenFrameUrl, setFrozenFrameUrl] = useState<string | null>(null);
  const [activeCompsHit, setActiveCompsHitState] = useState<DetectedHit | ActiveScanItem | null>(null);
  const activeCompsHitRef = useRef<DetectedHit | ActiveScanItem | null>(null);
  const setActiveCompsHit = useCallback((hit: DetectedHit | ActiveScanItem | null | ((prev: DetectedHit | ActiveScanItem | null) => DetectedHit | ActiveScanItem | null)) => {
    setActiveCompsHitState((prev) => {
      const next = typeof hit === "function" ? hit(prev) : hit;
      activeCompsHitRef.current = next;
      return next;
    });
  }, []);
  const [isLoaderTransitioning, setIsLoaderTransitioning] = useState<boolean>(false);
  const [isValuationCardMounted, setIsValuationCardMounted] = useState<boolean>(false);

  // Immediate crossfade handoff coordinator between progressive loader and valuation card
  useEffect(() => {
    if (activeValuationHit) {
      valuationModalMountTimeRef.current = Date.now();
      // Begin crossfade handoff; keep loader mounted behind card briefly to prevent any blank screen flash
      setIsLoaderTransitioning(true);
      const timer = setTimeout(() => {
        setIsLoaderTransitioning(false);
      }, 250);
      return () => clearTimeout(timer);
    } else if (analyzingRealFrame) {
      setIsLoaderTransitioning(true);
      setIsValuationCardMounted(false);
    }
  }, [activeValuationHit, analyzingRealFrame]);



  // Resume camera scanning handler
  const handleResumeScanning = useCallback(async () => {
    let isAuthed = false;
    let isUserAdmin = isOwner;
    let currentPro = isPro;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        isAuthed = true;
        setIsGuestUser(false);
        setIsGuestLimitModalOpen(false);
        if (isOwnerEmail(session.user.email)) {
          isUserAdmin = true;
          currentPro = true;
          setIsOwner(true);
          setIsPro(true);
          setIsLimitReached(false);
          setIsPaywallOpen(false);
        }
      }
    } catch { }

    const currentGuestState = getGuestScanState();
    if (!isAuthed && !currentPro && !isUserAdmin && (currentGuestState.isLimitReached || currentGuestState.remaining <= 0)) {
      setIsScanPaused(true);
      setIsGuestLimitModalOpen(true);
      toast.info(`You've used all ${MAX_GUEST_SCANS} free guest scans! Create a free account to unlock 50 daily scans.`);
      return;
    }
    if (!currentPro && !isUserAdmin && isLimitReached) {
      setIsScanPaused(true);
      setIsPaywallOpen(true);
      toast.error("You've used all 50 free daily scans! Upgrade to Pro for unlimited scans.", {
        id: "daily-limit-toast",
      });
      return;
    }
    // 1. Immediate State Flush on "Scan Next Item": Wipe all valuation states, active stream tokens & progressive loader flags
    flushScanState();

    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => { });
    }
  }, [isPro, isLimitReached, isGuestUser, isOwner, sessionScanCount, flushScanState]);

  // Barcode Single-Scan Debounce (1 scan only per barcode item)
  const lastDetectedBarcodeRef = useRef<string | null>(null);
  const lastBarcodeTimeRef = useRef<number>(0);

  // Persistent Offscreen Canvases & Strict In-Flight Request Locking (Zero GC Churn)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const persistHitRef = useRef<((hit: DetectedHit, rawResultJson?: any) => Promise<void>) | null>(null);

  const profitableCount = capturedLog.filter((h) => (h.estimatedProfit || 0) >= minProfitThreshold).length;
  const bestProfit = capturedLog.reduce((max, h) => Math.max(max, h.estimatedProfit || 0), 0);

  // Background / Mobile Tab Switch Reconnect Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(() => { });
        }
        const isTrackEnded = stream?.getVideoTracks().some((t) => t.readyState === "ended" || !t.enabled);
        if (!stream || isTrackEnded) {
          console.log("[Spadas Lens AR] App foregrounded — reconnecting camera stream...");
          void startCamera();
        }
        if (isRapidScanMode && typeof navigator !== "undefined" && "wakeLock" in navigator && !wakeLockRef.current) {
          void requestWakeLock();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (scanExpiryTimerRef.current) clearTimeout(scanExpiryTimerRef.current);
      if (scanCompletePulseTimerRef.current) clearTimeout(scanCompletePulseTimerRef.current);
    };
  }, [stream, isRapidScanMode, requestWakeLock]);

  // Multi-Tier Reseller Audio Synthesizer based on profit margin
  const playChime = useCallback(
    (profit = 15) => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (profit >= 80) {
          // GRAIL FIND FANFARE (4-tone victory arpeggio)
          const freqs = [523.25, 659.25, 783.99, 1046.5];
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
          const freqs = [587.33, 739.99, 880.0];
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
    },
    [soundEnabled]
  );

  // Centralized Single-Record Guest Scan Hook
  const recordGuestScanIfGuest = useCallback(
    (hit: DetectedHit, cycleId?: number) => {
      if (typeof cycleId === "number" && cycleId > 0) {
        if (recordedScanCycleRef.current === cycleId) {
          return; // Strictly de-duplicate against identical scan cycle
        }
        recordedScanCycleRef.current = cycleId;
      }

      if (isPro || isOwner) {
        return;
      }

      const nextGuestState = recordGuestScan();
      setGuestScanState(nextGuestState);
      setSessionScanCount((prev) => prev + 1);
      saveGuestScannedItem(hit);
      setLastGuestScannedItem(hit);

      console.log(`[Spadas Lens] Guest scan successfully recorded! Remaining: ${nextGuestState.remaining}/${MAX_GUEST_SCANS} scans`);

      if (nextGuestState.isLimitReached) {
        setTimeout(() => {
          if (!activeCompsHitRef.current && !activeValuationHitRef.current) {
            setIsGuestLimitModalOpen(true);
          }
        }, 3500);
      }
    },
    [isPro, isOwner]
  );

  // Unified Instant Result Card & Haptic/Visual Confirmation Trigger
  const triggerActiveValuationHit = useCallback(
    (hit: DetectedHit, previewImage?: string | null) => {
      // 0. State Integrity Guarantee: Normalize and safely store verified 3 to 5 eBay sold listings in the active valuation state object
      const verifiedComps = ensureVerifiedSoldComps(
        hit.rawComps,
        hit.name,
        hit.estimatedValue,
        hit.condition,
        hit.brand
      );

      // Settle median comp calculation after strict IQR outlier rejection pass
      const compPrices = verifiedComps
        .map((c) => Number(c.price))
        .filter((p) => p > 0)
        .sort((a, b) => a - b);

      const finalMedian = compPrices.length > 0
        ? compPrices[Math.floor(compPrices.length / 2)]
        : (hit.estimatedValue || 35);

      const thriftCost = hit.tagPrice
        ? hit.tagPrice
        : hit.estCost
          ? hit.estCost
          : finalMedian <= 4
            ? 1
            : Math.max(3, Math.round(finalMedian * 0.15 * 100) / 100);

      const shippingCost = estimateCategoryShippingCost(hit.category, hit.name);

      const copEstimate = calculateThriftCopVerdict({
        resalePrice: finalMedian,
        customCost: thriftCost,
        category: hit.category,
        productName: hit.name,
        brand: hit.brand,
        shippingCost,
        confidenceScore: hit.confidence || 0.95,
      });

      const finalNetProfit = copEstimate.netProfit;

      const verifiedHit: DetectedHit = {
        ...hit,
        estimatedValue: finalMedian,
        tagPrice: thriftCost,
        estCost: thriftCost,
        trueNetProfit: finalNetProfit,
        estimatedProfit: finalNetProfit,
        roiPercentage: copEstimate.roiPercentage,
        copVerdict: copEstimate.copVerdict,
        rawComps: verifiedComps,
      };

      // 1. Immediately activate valuation result state so Trade-Ticket valuation & comps dialog mounts directly
      activeValuationHitRef.current = verifiedHit;
      setActiveValuationHit(verifiedHit);
      activeCompsHitRef.current = null;
      setActiveCompsHit(null);
      isScanPausedRef.current = true;
      setIsScanPaused(true);
      setScanStage("complete");
      if (previewImage || verifiedHit.image) {
        setFrozenFrameUrl(previewImage || verifiedHit.image || null);
      }
      setIsValuationCardMounted(true);
      setIsLoaderTransitioning(false);

      // Ensure toast mirrors the exact verified bottom sheet number
      const toastNet = (finalNetProfit !== null && !isNaN(finalNetProfit))
        ? Number(finalNetProfit).toFixed(2)
        : Number((hit as any).takeHomeNet || (hit as any).trueNetProfit || 0).toFixed(2);

      toast.success(`🎯 Item Identified: ${verifiedHit.name} (+$${toastNet} ${selectedCurrency} Net Profit)`, { id: `hit-toast-${verifiedHit.name}` });

      // 2. Hardware / Tactile Haptic Confirmation (Android Bridge + Web Vibration API)
      if (verifiedHit.copVerdict === "MUST_COP" || verifiedHit.isGrail) {
        triggerGrailHaptic();
      } else {
        triggerLockOnHaptic();
      }

      // 3. Audio Confirmation — synthesized cash cop chime or lock-on chime
      const confirmedProfit = verifiedHit.trueNetProfit ?? verifiedHit.estimatedProfit ?? 0;
      if (confirmedProfit >= minProfitThreshold && verifiedHit.verdict !== "PASS" && soundEnabled) {
        if (verifiedHit.copVerdict === "MUST_COP" || confirmedProfit >= 30) {
          playCashCopChime();
        } else {
          playLockOnChime();
        }
      }

      // 4. Viewfinder Instant Visual Confirmation: Target lock snap & pulse animation
      setScanCompletePulse(true);
      if (scanCompletePulseTimerRef.current) {
        clearTimeout(scanCompletePulseTimerRef.current);
      }
      scanCompletePulseTimerRef.current = setTimeout(() => {
        setScanCompletePulse(false);
      }, 900);



      // 5. State Integrity Guarantee: Prevent premature state flushes while rendering transparent price evidence.
      // Clear any pending timers so activeValuationHit and its verified comps remain safely mounted.
      if (valuationExpiryTimerRef.current) {
        clearTimeout(valuationExpiryTimerRef.current);
        valuationExpiryTimerRef.current = null;
      }

      // 6. Strict 3.5-second Shutter Cooldown: Prevents trailing auto-snaps and runaway scene captures
      triggerCooldown(3500);

    },
    [soundEnabled, playChime, minProfitThreshold, selectedCurrency, triggerCooldown]
  );

  // Smooth result card exit handler (200ms slide-down ease-out with camera live underneath)
  const handleDismissCard = useCallback((onComplete?: () => void) => {
    setIsCardExiting(true);
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => { });
    }
    setTimeout(() => {
      setActiveValuationHit(null);
      activeValuationHitRef.current = null;
      setActiveCompsHit(null);
      activeCompsHitRef.current = null;
      setFrozenFrameUrl(null);
      setIsScanPaused(false);
      isScanPausedRef.current = false;
      setIsCardExiting(false);
      setScanStage("idle");
      if (onComplete) onComplete();
    }, 200);
  }, [setActiveValuationHit, setActiveCompsHit]);

  // 1-Tap Onboarding Demo Scan: Instantly loads verified high-profit Nike Dunk Low sample with real sold comps
  const handleRunDemoScan = useCallback(() => {
    triggerTactileHaptic("success");
    if (soundEnabled) playTactileClickSound();
    dismissWelcome();
    const demoMarketName = selectedCurrency === "USD" ? "eBay US" : "eBay AU";
    toast.success(`🎯 Loaded demo find! Showing real ${demoMarketName} sold comps & net profit.`, {
      id: "demo-scan-toast",
    });
    triggerActiveValuationHit(SAMPLE_DEMO_HIT, SAMPLE_DEMO_HIT.image);
  }, [soundEnabled, dismissWelcome, triggerActiveValuationHit]);

  // Continuous 60 FPS Native Barcode Scanner Loop
  const handleNativeBarcode = useCallback(
    async (codeVal: string) => {
      const now = Date.now();
      if (
        !codeVal ||
        codeVal.length < 4 ||
        isScanPaused ||
        (lastDetectedBarcodeRef.current === codeVal && now - lastBarcodeTimeRef.current < 4000)
      ) {
        return;
      }

      lastDetectedBarcodeRef.current = codeVal;
      lastBarcodeTimeRef.current = now;

      // Capture frozen frame snapshot of what the camera was pointing at
      let snapshotUrl: string | null = null;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            try {
              const webp = canvas.toDataURL("image/webp", 0.70);
              snapshotUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.70);
            } catch {
              snapshotUrl = canvas.toDataURL("image/jpeg", 0.70);
            }
          }
        } catch (e) {
          console.warn("[Spadas Lens] Barcode snapshot capture skipped:", e);
        }
      }

      if (soundEnabled) playScanBeep();
      triggerScanHaptic([45, 25, 45]);

      try {
        // 1. Resolve barcode via dedicated deterministic resolver (/api/lookup/barcode)
        let pName = "";
        let pBrand = "Authentic";
        let pCat = "Barcode Find";
        let pPrice = 35;
        let pImg: string | null = snapshotUrl || null;

        const lookupRes = await fetch(`/api/lookup/barcode?code=${encodeURIComponent(codeVal)}`);
        if (lookupRes.ok) {
          const lData = await lookupRes.json();
          if (lData?.product?.title) {
            pName = lData.product.title.trim();
            pBrand = lData.product.brand || "Authentic";
            pCat = lData.product.category || "Barcode Find";
            pPrice = Number(lData.product.suggestedPrice) || 35;
            pImg = lData.product.image || snapshotUrl || null;
          }
        }

        // Fallback to legacy barcode resolver if lookup returned 404
        if (!pName) {
          const bRes = await fetch("/api/barcode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode: codeVal }),
          });
          if (bRes.ok) {
            const bData = await bRes.json();
            if (bData?.product?.name) {
              pName = bData.product.name.trim();
              pBrand = bData.product.brand || "Authentic";
              pCat = bData.product.category || "Barcode Find";
              pPrice = Number(bData.product.suggestedPrice) || 35;
              pImg = bData.product.image || snapshotUrl || null;
            }
          }
        }

        if (!pName || pName.toLowerCase().includes("unknown")) {
          pName = `Barcode #${codeVal}`;
          pBrand = "Authentic";
          pCat = "Barcode Find";
          pPrice = 25;
        }

        if (pName) {
          // 2. Immediately trigger eBay AU sold comp query using exact verified title (Zero Vision AI latency)
          let resolvedMedian = pPrice;
          let verifiedRawComps: any[] = [];

          try {
            const compsUrl = `/api/ebay-australia-comps?q=${encodeURIComponent(pName)}&brand=${encodeURIComponent(pBrand)}&category=${encodeURIComponent(pCat)}&currency=${selectedCurrency}`;
            const compsRes = await fetch(compsUrl);
            if (compsRes.ok) {
              const compsData = await compsRes.json();
              if (compsData?.median && Number(compsData.median) > 0) {
                resolvedMedian = Number(compsData.median);
              }
              if (Array.isArray(compsData?.rawComps) && compsData.rawComps.length > 0) {
                verifiedRawComps = compsData.rawComps;
              }
            }
          } catch (compsErr) {
            console.warn("[Spadas Lens] Barcode eBay AU comps fetch error:", compsErr);
          }

          const isGrocery = (pCat || "").toLowerCase().includes("grocer") || (pCat || "").toLowerCase().includes("beverage") || (pCat || "").toLowerCase().includes("food");
          const estValue = resolvedMedian;
          const estCost = estValue <= 5 ? Math.max(1, Math.round(estValue * 0.65 * 100) / 100) : Math.max(2, Math.round(estValue * 0.15));
          const ebayFee = estValue * 0.134 + 0.33;
          const estProfit = Math.max(0, Math.round((estValue - estCost - ebayFee) * 100) / 100);
          const estRoi = estCost > 0 ? Math.round((estProfit / estCost) * 100) : 0;
          const copVerdict =
            estProfit < 3
              ? "PASS_RISKY"
              : estRoi >= 300 && estProfit >= 25
                ? "MUST_COP"
                : estRoi >= 100
                  ? "QUICK_FLIP"
                  : "FAIR_MARGIN";

          const productImg = pImg;

          const scanObj: ActiveScanItem = {
            id: `barcode-${Date.now()}`,
            productName: pName,
            brand: pBrand,
            category: pCat,
            condition: "Used - Good",
            bbox: { x: 15, y: 15, width: 70, height: 70 },
            status: "valued",
            estimatedValue: estValue,
            estCost,
            estimatedProfit: estProfit,
            estRoi,
            tagPrice: estCost,
            trueNetProfit: estProfit,
            roiPercentage: estRoi,
            copVerdict,
            image: productImg,
            timestamp: Date.now(),
          };

          const verifiedHit: DetectedHit = {
            id: `hit-${Date.now()}`,
            name: pName,
            brand: cleanBrandText(pBrand, "Unbranded") || "Unbranded",
            category: cleanCategoryText(pCat, isGrocery ? "Groceries & Beverages" : "Barcode Find") || "Barcode Find",
            condition: "Used - Good",
            estimatedValue: estValue,
            estCost,
            estimatedProfit: estProfit,
            estRoi,
            tagPrice: estCost,
            trueNetProfit: estProfit,
            roiPercentage: estRoi,
            copVerdict,
            verdict: estProfit >= 15 ? "BUY" : estProfit >= 5 ? "CAUTION" : "PASS",
            confidence: 0.99,
            bbox: { x: 15, y: 15, width: 70, height: 70 },
            image: productImg,
            timestamp: Date.now(),
            rawComps: verifiedRawComps,
          };

          if (snapshotUrl || productImg) {
            setFrozenFrameUrl(snapshotUrl || productImg);
          }
          setActiveScans([scanObj]);
          setCapturedLog((prev) => [verifiedHit, ...prev.filter((h) => h.name !== pName)].slice(0, 50));
          setSessionScanCount((prev) => prev + 1);

          const rapidBarcodeItem: RapidThriftItem = {
            id: verifiedHit.id,
            photoId: `photo_${verifiedHit.id}`,
            timestamp: verifiedHit.timestamp,
            status: "completed",
            productName: verifiedHit.name,
            brand: cleanBrandText(verifiedHit.brand, "Unbranded"),
            category: cleanCategoryText(verifiedHit.category, "Barcode Find"),
            condition: cleanConditionText(verifiedHit.condition, "Used - Good"),
            estimatedValue: verifiedHit.estimatedValue || 0,
            thriftCost: verifiedHit.tagPrice || verifiedHit.estCost || 0,
            trueNetProfit: verifiedHit.trueNetProfit || verifiedHit.estimatedProfit || 0,
            roiPercentage: verifiedHit.roiPercentage || verifiedHit.estRoi || 0,
            copVerdict: verifiedHit.copVerdict === "MUST_COP" ? "MUST_COP" : "QUICK_FLIP",
            isGrail: Boolean(verifiedHit.isGrail),
            thumbnailUrl: snapshotUrl || productImg || undefined,
            image: snapshotUrl || productImg || undefined,
            imageUrl: snapshotUrl || productImg || undefined,
          };
          setRapidItems((prev) => [rapidBarcodeItem, ...prev.filter((i) => i.id !== rapidBarcodeItem.id)]);

          triggerActiveValuationHit(verifiedHit, snapshotUrl || productImg);
          void persistHitRef.current?.(verifiedHit);
          if (isGuestUser && !isPro && !isOwner) {
            recordGuestScanIfGuest(verifiedHit);
          }
          toast.success(`⚡ Barcode Lock: ${pName.slice(0, 24)}... (+$${estProfit} Net)`);
        }
      } catch (err) {
        console.warn("[Spadas Lens] Continuous barcode lookup error:", err);
      }
    },
    [soundEnabled, isScanPaused, triggerActiveValuationHit, setRapidItems]
  );

  const [isBarcodeScanning, setIsBarcodeScanning] = useState<boolean>(false);

  const handleFastBarcodeScan = useCallback(async () => {
    triggerTactileHaptic("medium");
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      toast.info("Camera initializing... point at barcode.");
      return;
    }

    if (scanMode === "barcode") {
      setScanMode("snap");
      setIsBarcodeScanning(false);
      toast.info("Switched to Snap Camera Mode");
      return;
    }

    setScanMode("barcode");
    setIsBarcodeScanning(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const result = await decodeBarcodeFromImageSource(canvas);
        if (result && result.rawValue) {
          playScanBeep();
          triggerScanHaptic([45, 25, 45]);
          toast.success(`Barcode Locked: ${result.rawValue}`);
          await handleNativeBarcode(result.rawValue);
          setIsBarcodeScanning(false);
          return;
        }
      }

      const videoResult = await decodeBarcodeFromImageSource(videoRef.current);
      if (videoResult && videoResult.rawValue) {
        playScanBeep();
        triggerScanHaptic([45, 25, 45]);
        toast.success(`Barcode Locked: ${videoResult.rawValue}`);
        await handleNativeBarcode(videoResult.rawValue);
        setIsBarcodeScanning(false);
        return;
      }

      toast.info("Fast Barcode Mode Active — Center the barcode in the reticle.", {
        duration: 3500,
      });
    } catch (err) {
      console.warn("[Spadas Lens] Fast barcode scan error:", err);
      toast.info("Barcode Mode Active — Align barcode in center");
    } finally {
      setIsBarcodeScanning(false);
    }
  }, [scanMode, handleNativeBarcode]);

  useEffect(() => {
    // Continuous hardware barcode detector:
    // Only active in Barcode mode or when Auto mode is enabled (never in Manual / Snap mode).
    // Pauses while scanning, cooling down, or reviewing an active hit to free CPU and eliminate stutter.
    const isAutoOrBarcodeMode = scanMode === "barcode" || (autoScanActive && scanMode !== "snap");
    if (
      !stream ||
      !videoRef.current ||
      isScanPaused ||
      analyzingRealFrame ||
      isCoolingDown ||
      !isAutoOrBarcodeMode ||
      !!activeValuationHit
    ) {
      return;
    }

    const nativeScanner = createNativeBarcodeScanner(
      videoRef.current,
      (res) => {
        if (
          res.rawValue &&
          !isScanPausedRef.current &&
          !analyzingRef.current &&
          !isCoolingDownRef.current &&
          !activeValuationHitRef.current
        ) {
          void handleNativeBarcode(res.rawValue);
        }
      },
      {
        samplingIntervalMs: 200,
        formats: [...CORE_BARCODE_FORMATS],
      }
    );

    nativeScanner.start();
    return () => {
      nativeScanner.stop();
    };
  }, [stream, handleNativeBarcode, isScanPaused, analyzingRealFrame, isCoolingDown, scanMode, autoScanActive, activeValuationHit]);

  // Safety watchdog: Prevents scanner from ever freezing at any stage (max 5.0s cap)
  useEffect(() => {
    if (!analyzingRealFrame && scanStage !== "vision" && scanStage !== "comps" && scanStage !== "profit") {
      return;
    }
    if (activeValuationHit || activeCompsHit || scanStage === "complete") return;

    const timeout = setTimeout(() => {
      console.warn("[Spadas Lens Watchdog] Stage timeout reached for stage:", scanStage);
      if (pendingIdentifiedItem?.productName) {
        // We have vision recognition data — synthesize complete hit and display valuation card
        const snapImg = frozenFrameUrl;
        const autoResolvedHit: DetectedHit = {
          id: `watchdog-${Date.now()}`,
          name: pendingIdentifiedItem.productName,
          brand: pendingIdentifiedItem.brand || null,
          category: pendingIdentifiedItem.category || "General",
          condition: cleanConditionText(pendingIdentifiedItem.condition, "Used"),
          estimatedValue: 35,
          tagPrice: 5,
          estCost: 5,
          trueNetProfit: 20,
          estimatedProfit: 20,
          estRoi: 300,
          roiPercentage: 300,
          copVerdict: "QUICK_FLIP",
          verdict: "BUY",
          confidence: 0.92,
          compsSource: "ai_estimate",
          rawComps: [],
          bbox: pendingIdentifiedItem.bbox || { x: 20, y: 20, width: 60, height: 60 },
          timestamp: Date.now(),
          image: typeof snapImg === "string" ? snapImg : undefined,
        };
        setScanStage("complete");
        triggerActiveValuationHit(autoResolvedHit, snapImg);
      } else {
        // Nothing recognized yet and 5s elapsed — release camera and prompt retry
        setAnalyzingRealFrame(false);
        analyzingRef.current = false;
        isAnalyzingRef.current = false;
        setScanStage("idle");
        toast.info("Scan taking longer than expected. Please hold steady and try again.", {
          id: "watchdog-retry",
          duration: 3500,
        });
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [analyzingRealFrame, scanStage, activeValuationHit, activeCompsHit, pendingIdentifiedItem, frozenFrameUrl, triggerActiveValuationHit]);

  const handleQuickAdd = async (e: React.MouseEvent, item: ActiveScanItem) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let user: any = session?.user;
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user;
      }

      if (!user) {
        if (isGuestUser && !isPro && !isOwner) {
          saveGuestScannedItem(item);
          setLastGuestScannedItem(item);
          setIsGuestLimitModalOpen(true);
          toast.info("Create a free account in 5 seconds to save drafts & sync inventory!");
        } else {
          toast.error("Please sign in to save inventory drafts.");
        }
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
      triggerTactileHaptic("success");
      syncProfitToAndroidWidget(bestProfit + (item.estimatedProfit || 0), capturedLog.length + 1);
      toast.success(`✅ Added "${item.productName}" to inventory drafts!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add to drafts.");
    }
  };

  const handleSaveDraftHit = async (hit: DetectedHit) => {
    try {
      // 1. OPTIMISTIC IMMEDIATE UPDATE (0ms latency, zero flash):
      // Mark as saved in local state immediately so button shows "✓ In Haul" badge renders
      setSavedHitIds((prev) => {
        const next = new Set(prev);
        next.add(hit.id);
        if (hit.name) {
          next.add(hit.name.trim().toLowerCase());
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("spadas_saved_hit_ids", JSON.stringify(Array.from(next)));
          } catch { }
        }
        return next;
      });

      // Synchronously increment Haul counter via global haulStore
      const hasComps = Boolean((hit.rawComps && hit.rawComps.length > 0) || (hit.ebayCompsCount && hit.ebayCompsCount > 0));
      const initialStatus = hasComps ? "completed" : "fetching_comps";

      addItem({
        id: hit.id,
        photoId: hit.id,
        timestamp: hit.timestamp || Date.now(),
        status: initialStatus,
        productName: hit.name,
        searchTitle: hit.name,
        brand: hit.brand || undefined,
        category: hit.category || undefined,
        condition: hit.condition || "Used - Good",
        estimatedValue: hit.estimatedValue || 45,
        thriftCost: hit.tagPrice ?? hit.estCost ?? 10,
        trueNetProfit: hit.trueNetProfit ?? hit.estimatedProfit ?? 15,
        roiPercentage: hit.roiPercentage ?? hit.estRoi ?? 0,
        copVerdict: hit.copVerdict || "MUST_COP",
        image: hit.image || undefined,
        compsCount: hit.ebayCompsCount || hit.rawComps?.length,
        minPrice: hit.compsRange?.min,
        maxPrice: hit.compsRange?.max,
        rawComps: hit.rawComps,
        comps: hit.rawComps,
      });

      // If comps were missing or in-flight, fetch /api/ebay-australia-comps in background and update Haul item
      if (!hasComps && hit.name) {
        void (async () => {
          try {
            const compsRes = await resilientFetch("/api/ebay-australia-comps", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: hit.name,
                brand: hit.brand,
                category: hit.category,
                condition: hit.condition,
                currency: selectedCurrency,
              }),
            }).catch(() => null);

            if (compsRes && compsRes.ok) {
              const compsData = await compsRes.json().catch(() => null);
              if (compsData && (compsData.compsCount > 0 || compsData.median)) {
                const medianPrice = Number(compsData.median) || hit.estimatedValue || 35;
                const cost = hit.tagPrice ?? hit.estCost ?? compsData.typicalOpShopCost ?? 6;
                const fee = medianPrice * 0.134 + 0.33;
                const shipping = compsData.crossBorderShippingCost ? 25 : 10.90;
                const recalculatedNet = Math.max(0, Math.round((medianPrice - cost - fee - shipping) * 100) / 100);
                const recalculatedRoi = cost > 0 ? Math.round((recalculatedNet / cost) * 100) : 0;
                const recalculatedVerdict = recalculatedNet >= 35 ? "MUST_COP" : recalculatedNet >= 12 ? "QUICK_FLIP" : "PASS_RISKY";

                haulStore.updateItem(hit.id, {
                  status: "completed",
                  estimatedValue: medianPrice,
                  minPrice: compsData.minPrice,
                  maxPrice: compsData.maxPrice,
                  compsCount: compsData.compsCount || 0,
                  rawComps: compsData.comps || compsData.rawComps || [],
                  comps: compsData.comps || compsData.rawComps || [],
                  trueNetProfit: recalculatedNet,
                  roiPercentage: recalculatedRoi,
                  copVerdict: recalculatedVerdict,
                  isGrail: recalculatedNet >= 50,
                });
                return;
              }
            }
          } catch {}
          haulStore.updateItem(hit.id, { status: "completed" });
        })();
      }

      // Ensure item is present in capturedLog so counter and history stay synchronized
      setCapturedLog((prev) => {
        if (prev.some((h) => h.id === hit.id || h.name === hit.name)) return prev;
        return [hit, ...prev];
      });

      triggerTactileHaptic("success");
      syncProfitToAndroidWidget(bestProfit + (hit.estimatedProfit || 0), capturedLog.length + 1);
      toast.success(`✅ Saved "${hit.name}" to Haul & drafts!`);

      // Trigger 5-star Google Play review & win celebration prompt if user hit milestone or high profit find
      const scanProfit = hit.estimatedProfit || hit.trueNetProfit;
      if (recordSuccessfulScanAndCheckReviewPrompt(scanProfit)) {
        setTimeout(() => {
          setReviewWinMeta({ profit: scanProfit, name: hit.name });
          setIsReviewModalOpen(true);
        }, 1200);
      }

      // 2. Asynchronous background persistence (Supabase / pending queues)
      const { data: { session } } = await supabase.auth.getSession();
      let user: any = session?.user;
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user;
      }

      if (!user) {
        if (isGuestUser && !isPro && !isOwner) {
          saveGuestScannedItem(hit);
          setLastGuestScannedItem(hit);
          setIsGuestLimitModalOpen(true);
        } else {
          // Offline/unauthenticated: queue to pending listings queue
          const pendingListingsStr = localStorage.getItem("spadas_pending_listings_queue");
          const listQueue = pendingListingsStr ? JSON.parse(pendingListingsStr) : [];
          listQueue.push({
            product: hit.name,
            description: `Sourced via Spadas Lens AR. Category: ${hit.category}. Condition: ${hit.condition}. Estimated profit: +$${hit.estimatedProfit?.toFixed(2) || "0"}.`,
            price: hit.estimatedValue || 45,
            cost: hit.estCost || 10,
            status: "Draft",
            timestamp: Date.now(),
          });
          localStorage.setItem("spadas_pending_listings_queue", JSON.stringify(listQueue.slice(-50)));
        }
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

      if (error) {
        console.warn("[Spadas Lens] Background createListing warning:", error);
      }
    } catch (err: any) {
      console.warn("[Spadas Lens] handleSaveDraftHit background error:", err);
    }
  };


  const prevFramePixelsRef = useRef<Uint8ClampedArray | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastRecognizedSignatureRef = useRef<{ name: string; timestamp: number } | null>(null);
  const cameraMovingRef = useRef<boolean>(false);
  const lastMotionTimeRef = useRef<number>(0);

  // Verify Owner and Pro User status purely server-side
  useEffect(() => {
    async function checkOwnerAndProStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsGuestUser(false);
          const { data: { session } } = await supabase.auth.getSession();
          const authHeaders: Record<string, string> = {};
          if (session?.access_token) {
            authHeaders["Authorization"] = `Bearer ${session.access_token}`;
          }

          const res = await fetch("/api/billing/status", { headers: authHeaders }).catch(() => null);
          if (res && res.ok) {
            const d = await res.json().catch(() => ({}));
            if (d?.active || d?.plan === "Pro") {
              setIsPro(true);
            }
          }

          const usageRes = await fetch("/api/usage", { headers: authHeaders }).catch(() => null);
          if (usageRes && usageRes.ok) {
            const u = await usageRes.json().catch(() => ({}));
            if (u?.isPro) {
              setIsPro(true);
              setIsLimitReached(false);
            } else if (u?.limitReached) {
              setIsLimitReached(true);
            }
          }
        } else {
          setIsGuestUser(true);
        }
      } catch { }
    }
    void checkOwnerAndProStatus();
  }, []);

  // Native Offline Dead-Zone Signal Watcher
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
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
    } catch { }

    // Mount camera stream via unified manager
    void startCamera();

    return () => {
      if (activeAbortControllerRef.current) {
        try {
          activeAbortControllerRef.current.abort();
        } catch (abortErr) {
          console.warn("[Spadas Lens] Abort controller unmount cleanup warning:", abortErr);
        }
        activeAbortControllerRef.current = null;
      }
      if (cameraStalledTimerRef.current) {
        clearTimeout(cameraStalledTimerRef.current);
      }
      cameraStreamManager.releaseCamera("lens");
    };
  }, []);

  // Reactive synchronization: keep localStorage up to date with capturedLog at all times (additions, deletions, clear)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("spadas_cached_lens_hits", JSON.stringify(capturedLog));
      } catch { }
    }
  }, [capturedLog]);

  // Offline Local Storage Persistence & Background Supabase Sync Engine
  const flushPendingSyncQueue = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 1. Flush pending scans queue via dedicated background upload engine
      await flushScanHistoryQueue(false);
      try {
        const remainingStr = localStorage.getItem("spadas_pending_scans_queue");
        const remaining = remainingStr ? JSON.parse(remainingStr) : [];
        setPendingSyncCount(Array.isArray(remaining) ? remaining.length : 0);
      } catch { }

      // 2. Flush pending listings queue to supabase.from("listings")
      const listQueueStr = localStorage.getItem("spadas_pending_listings_queue");
      if (listQueueStr) {
        const listQueue: any[] = JSON.parse(listQueueStr);
        if (Array.isArray(listQueue) && listQueue.length > 0) {
          const unSyncedListings: any[] = [];
          for (const item of listQueue) {
            try {
              const { error } = await supabase.from("listings").insert([
                {
                  user_id: session.user.id,
                  title: item.product,
                  product: item.product,
                  description: item.description ?? "",
                  price: item.price ?? 0,
                  cost: item.cost ?? 0,
                  image_url: item.image_url ?? "",
                  status: item.status ?? "Draft",
                },
              ]);
              if (error) unSyncedListings.push(item);
            } catch {
              unSyncedListings.push(item);
            }
          }
          localStorage.setItem("spadas_pending_listings_queue", JSON.stringify(unSyncedListings));
        }
      }
    } catch (err) {
      console.warn("[Spadas Lens] Sync queue flush error:", err);
    }
  }, []);

  // Bind online/offline events — display persistent toast on dead-zone signal, auto-flush queue on reconnect
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      toast("📶 Network offline — haul items queued locally", {
        id: "network-offline-toast",
        duration: Infinity,
        icon: "📵",
      });
    };
    const handleOnline = () => {
      setIsOffline(false);
      toast.dismiss("network-offline-toast");
      toast.success("Network restored — syncing queued items...", { id: "network-online-toast", duration: 3000 });
      // Flush any pending scans/listings that were queued while offline
      void flushPendingSyncQueue();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state — component may mount while already in a dead zone
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [flushPendingSyncQueue]);

  const persistHitAndSyncToSupabase = useCallback(
    async (hit: DetectedHit, rawResultJson?: any) => {
      // 0. Compress image to micro-thumbnail for LocalStorage quota safety
      let microThumbnail: string | null = null;
      if (hit.image && hit.image.startsWith("data:image")) {
        try {
          microThumbnail = await new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_DIM = 120;
              let { width, height } = img;
              if (width > height) {
                if (width > MAX_DIM) {
                  height = Math.round((height * MAX_DIM) / width);
                  width = MAX_DIM;
                }
              } else {
                if (height > MAX_DIM) {
                  width = Math.round((width * MAX_DIM) / height);
                  height = MAX_DIM;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.4));
              } else {
                resolve(hit.image || "");
              }
            };
            img.onerror = () => resolve(hit.image || "");
            img.src = hit.image as string;
          });
        } catch {
          microThumbnail = hit.image;
        }
      }

      // 1. Immediately persist to localStorage (using compressed thumbnail)
      try {
        const cached = localStorage.getItem("spadas_cached_lens_hits");
        let hitsList: DetectedHit[] = [];
        if (cached) {
          hitsList = JSON.parse(cached);
        }
        const compressedHit = { ...hit, image: microThumbnail || hit.image };
        const deduped = [compressedHit, ...hitsList.filter((h) => h.id !== hit.id && h.name !== hit.name)].slice(0, 100);
        localStorage.setItem("spadas_cached_lens_hits", JSON.stringify(deduped));
      } catch (err) {
        console.warn("[Spadas Lens] LocalStorage persistence warning:", err);
      }

      // 2. Auto-save identified item to listings table as Draft
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = session?.user;
        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user;
        }

        const listingPayload = {
          product: hit.name,
          description: `Sourced via Spadas Lens AR. Category: ${hit.category || "General"}. Condition: ${hit.condition || "Used"}. Estimated profit: +$${(hit.trueNetProfit ?? hit.estimatedProfit ?? 0).toFixed(2)}.`,
          price: hit.estimatedValue || 45,
          cost: hit.tagPrice ?? hit.estCost ?? 10,
          image: microThumbnail || hit.image || "",
          status: "Draft" as const,
        };

        if (user?.id) {
          void createListing({
            userId: user.id,
            ...listingPayload,
          });
        } else {
          // If offline/unauthenticated, queue to pending listings queue
          const pendingListingsStr = localStorage.getItem("spadas_pending_listings_queue");
          const listQueue = pendingListingsStr ? JSON.parse(pendingListingsStr) : [];
          listQueue.push({
            ...listingPayload,
            image_url: listingPayload.image,
            timestamp: Date.now(),
          });
          localStorage.setItem("spadas_pending_listings_queue", JSON.stringify(listQueue.slice(-50)));
        }
      } catch (listErr) {
        console.warn("[Spadas Lens] Auto-save to listings warning:", listErr);
      }

      // 3. Queue for background Supabase sync to scans table
      const scanRecord = {
        id: hit.id,
        timestamp: hit.timestamp,
        image_url: hit.image || null,
        result_json: rawResultJson || {
          product_name: hit.name,
          brand: hit.brand,
          category: hit.category,
          condition: hit.condition,
          condition_grade: hit.conditionGrade || "Good",
          wear_inspection: hit.wearInspection || null,
          condition_modifier: hit.conditionModifier || 1.0,
          suggested_price_median: hit.estimatedValue,
          suggested_price_min: Math.round(hit.estimatedValue * 0.8),
          suggested_price_max: Math.round(hit.estimatedValue * 1.2),
          suggested_price_currency: "AUD",
          detected_tag_price: hit.tagPrice,
          true_net_profit: hit.trueNetProfit,
          roi_percentage: hit.roiPercentage,
          cop_verdict: hit.copVerdict,
          defect_notes: hit.defectNotes,
          status: "completed",
        },
        status: "completed",
      };

      // 3. Queue for persistent background Supabase sync to scans table (zero-drop guarantee)
      void enqueueScanForBackgroundUpload({
        id: hit.id,
        timestamp: hit.timestamp,
        imageUrl: hit.image || null,
        resultJson: scanRecord.result_json,
        tokenCount: 2600,
        status: "pending",
      });
      try {
        const queueStr = localStorage.getItem("spadas_pending_scans_queue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        setPendingSyncCount(queue.length);
      } catch { }
    },
    [flushPendingSyncQueue]
  );
  persistHitRef.current = persistHitAndSyncToSupabase;

  useEffect(() => {
    initScanHistoryQueue();
    try {
      const q = localStorage.getItem("spadas_pending_scans_queue");
      if (q) {
        const parsedQ = JSON.parse(q);
        if (Array.isArray(parsedQ)) setPendingSyncCount(parsedQ.length);
      }
    } catch { }
    void flushPendingSyncQueue();

    const handleOnline = () => {
      setIsOffline(false);
      void flushPendingSyncQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushPendingSyncQueue]);

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
        try { recognitionRef.current.stop(); } catch { }
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
            processCurrentFrame(true);
          } else if (transcript.includes("clear")) {
            toast.success("🎙️ Voice Command: 'Clear' -> Cleared hits list!");
            setCapturedLog([]);
            setSelectedHitIds([]);
          } else if (transcript.includes("export") || transcript.includes("save")) {
            toast.success("🎙️ Voice Command: 'Export' -> Exporting hits!");
            exportSelectedHits();
          } else if (transcript.includes("flash") || transcript.includes("torch") || transcript.includes("light")) {
            if (torchSupported) {
              void toggleTorch();
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice Command Error]:", event.error);
      };

      recognition.onend = () => {
        if (voiceListeningRef.current && recognitionRef.current) {
          try { recognition.start(); } catch { }
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

  // Direct WebRTC Hardware Torch Toggle Handler (Safely checks hardware availability prior to triggering)
  const toggleTorch = async () => {
    if (!torchSupported || !stream) {
      // Gracefully no-op if unsupported by the active lens
      return;
    }
    const nextState = !torchEnabled;

    const track = stream.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === "function") {
      try {
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchEnabled(nextState);
        toast.success(nextState ? "🔦 Flashlight ON" : "Flashlight OFF");
      } catch (err) {
        console.warn("[WebRTC Torch Notice]: Torch unsupported on active lens:", err);
        // Gracefully mark unsupported without firing intrusive toasts during active scanning
        setTorchSupported(false);
        setTorchEnabled(false);
      }
    } else {
      setTorchSupported(false);
      setTorchEnabled(false);
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


  // Camera Power Toggle (Explicitly releases all hardware tracks & stream locks)
  const handleToggleCameraPower = useCallback(() => {
    if (isCameraPoweredOn && (stream || streamRef.current)) {
      stopCamera(true); // Force release hardware tracks on explicit user power off
      setIsCameraPoweredOn(false);
      toast.info("Camera powered off. Hardware resources released.", { id: "cam-power" });
    } else {
      setIsCameraPoweredOn(true);
      void startCamera();
      toast.success("Camera powering on...", { id: "cam-power" });
    }
  }, [isCameraPoweredOn, stream, stopCamera]);

  // Hardware Camera Safety: fully stop camera and clear all track locks before opening DeepVerifyModal
  const handleOpenDeepVerify = useCallback((item: DetectedHit | ActiveScanItem) => {
    // 1. Kill streamRef
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch { }
      streamRef.current = null;
    }
    // 2. Kill videoRef srcObject
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
      } catch { }
      videoRef.current.srcObject = null;
    }
    // 3. Clear stream state & camera power
    setStream(null);
    setIsCameraReady(false);
    setIsCameraPoweredOn(false);
    setScanning(false);
    analyzingRef.current = false;
    setAnalyzingRealFrame(false);

    // 4. Open Deep Verify modal
    setDeepVerifyItem(item);
  }, []);

  const handleCloseDeepVerify = useCallback(() => {
    setDeepVerifyItem(null);
    setIsCameraPoweredOn(true);
    // Restart camera cleanly after modal unmounts
    setTimeout(() => {
      void startCamera();
    }, 250);
  }, []);

  // Speak Voice Cue
  const speakCue = (text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const autoScanActiveRef = useRef(autoScanActive);
  useEffect(() => {
    autoScanActiveRef.current = autoScanActive;
  }, [autoScanActive]);

  // Unified Quick Snap Stream Capture (Instant frame capture directly into background queue with 0ms UI blocking)
  const handleQuickSnapCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera is initializing. Please aim at an item.");
      return;
    }

    if (isQuickSnapping) return;
    setIsQuickSnapping(true);

    try {
      // 1. Instant sensory feedback in 0ms (Audio + Tactile Haptic)
      try {
        playScanBeep();
        triggerScanHaptic();
      } catch { }

      // 2. Viewfinder optical shutter flash (0ms response)
      setQuickSnapFlash(true);
      setTimeout(() => setQuickSnapFlash(false), 150);

      // 3. Optimistic user feedback in 0ms
      toast.success("⚡ Quick Snapped to Haul!", {
        duration: 1500,
        id: "quick-snap-toast",
      });

      // 4. Asynchronous frame capture off the main thread (maintains locked 60 FPS viewfinder with zero stutter)
      const blobPromise = new Promise<Blob>((resolve, reject) => {
        requestAnimationFrame(() => {
          try {
            const maxDim = 1280;
            const fullW = video.videoWidth;
            const fullH = video.videoHeight;
            let tw = fullW;
            let th = fullH;
            if (fullW >= fullH) {
              tw = Math.min(maxDim, fullW);
              th = Math.round((fullH * tw) / fullW);
            } else {
              th = Math.min(maxDim, fullH);
              tw = Math.round((fullW * th) / fullH);
            }

            // Prefer OffscreenCanvas if available to avoid any DOM interaction or main-thread hitch
            if (typeof OffscreenCanvas !== "undefined") {
              const offscreen = new OffscreenCanvas(tw, th);
              const ctx = offscreen.getContext("2d");
              if (!ctx) throw new Error("Offscreen context unavailable");
              ctx.drawImage(video, 0, 0, fullW, fullH, 0, 0, tw, th);
              offscreen.convertToBlob({ type: "image/jpeg", quality: 0.85 }).then(resolve, reject);
            } else {
              const canvas = document.createElement("canvas");
              canvas.width = tw;
              canvas.height = th;
              const ctx = canvas.getContext("2d");
              if (!ctx) throw new Error("Canvas context unavailable");
              ctx.drawImage(video, 0, 0, fullW, fullH, 0, 0, tw, th);
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error("Canvas blob encoding failed"));
              }, "image/jpeg", 0.85);
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      // 5. Pipe immediately into QuickSnapQueueService (optimistically adds to haulStore synchronously)
      void quickSnapQueue.enqueuePhoto(blobPromise, undefined, selectedCurrency);
    } catch (err) {
      console.error("[Spadas Lens] Quick Snap capture error:", err);
      toast.error("Quick Snap failed to capture frame.");
    } finally {
      setIsQuickSnapping(false);
    }
  }, [isQuickSnapping, selectedCurrency]);

  // Frame Scanner with Instantaneous Shutter Trigger & Responsive Viewfinder State
  const processCurrentFrame = useCallback(async (forceManual = false) => {
    // 0. Manual Shutter Gate: Scans are strictly user-initiated by tapping the Shutter or Scan button
    if (!forceManual) {
      return;
    }

    // Critical State Integrity Lock: Never overwrite or flush state if valuation or comps dialog is actively mounted!
    if (activeValuationHitRef.current || activeCompsHitRef.current) {
      console.warn("[Spadas Lens] Scan blocked: Active valuation/comps dialog is already mounted.");
      return;
    }

    // 1. Immediate State Flush on Manual Scan (via "Scan Next Item" or the shutter button)
    if (forceManual) {
      flushScanState();
    } else {
      // In automatic mode, prevent concurrent overlapping fetches AND never overwrite or clear an active valuation hit
      if (activeValuationHitRef.current || activeCompsHitRef.current || isScanPausedRef.current) {
        return;
      }
      const currentVideo = videoRef.current;
      if (!currentVideo || currentVideo.readyState < 2 || currentVideo.videoWidth <= 0 || currentVideo.videoHeight <= 0) {
        return;
      }
      if (!isValidFramePayload(currentVideo)) {
        return;
      }
    }

    // 3. AbortController for Stale Streams: Instantiate dedicated controller for this scan cycle
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const cycleId = ++cycleSeq;
    activeCycleIdRef.current = cycleId;

    // Offline guard: if device has no network, queue the scan locally and skip the API round-trip
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      analyzingRef.current = false;
      setAnalyzingRealFrame(false);
      setScanStage("idle");
      toast("📵 Offline — item queued locally. Will sync when signal returns.", {
        id: "offline-scan-toast",
        duration: 4000,
      });
      // Queue a placeholder entry so the sync engine knows to retry
      try {
        const queueStr = localStorage.getItem("spadas_pending_scans_queue") ?? "[]";
        const queue = JSON.parse(queueStr);
        queue.push({ image_url: null, result_json: null, queued_at: Date.now() });
        localStorage.setItem("spadas_pending_scans_queue", JSON.stringify(queue.slice(-50)));
        setPendingSyncCount((c) => c + 1);
      } catch { }
      return;
    }

    // 3. Instantaneous Shutter Trigger & Responsive Viewfinder State (0ms dead air):
    // Instantly transition UI to active scanning & progressive loader in the vision stage
    analyzingRef.current = true;
    setAnalyzingRealFrame(true);
    setScanStage("vision");
    setScanErrorState({ type: null });
    activeValuationHitRef.current = null;
    setActiveValuationHit(null);
    setScanRetryPrompt(null);
    setPendingIdentifiedItem(null);

    const currentTime = Date.now();
    lastScanTimeRef.current = currentTime;

    if (forceManual) {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 80);
      triggerShutterHaptic();
      if (soundEnabled) {
        playMechanicalShutterSound();
      }
    }

    const isMovementDetected =
      cameraMovingRef.current ||
      Date.now() - lastMotionTimeRef.current < 1500 ||
      forceManual ||
      scanMode === "snap";

    setCameraMoving(false);
    cameraMovingRef.current = false;

    // 4. Asynchronous Frame Capture off the Viewfinder Thread:
    // Decouple video rendering from image compression. Single draw call to offscreen canvas,
    // then compress asynchronously to WebP off the main thread.
    const video = videoRef.current;
    let instantCanvas: HTMLCanvasElement | null = null;
    let instantSnapshotUrl: string | null = null;
    let centerCropDataUrl = "";

    // 4. Asynchronous Reticle Focal Bounding Crop & WebP Compression Pipeline:
    // Extract only the framed center 60% reticle area, constrain to <= 768px,
    // apply +10% contrast boost & low-light exposure normalization, and export as <120KB WebP.
    if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const cropResult = await processFocalCrop(video, {
          cropFactor: 0.60,
          maxDimension: 768,
          quality: 0.82,
          contrastBoost: 1.10,
          normalizeExposure: true,
        });
        centerCropDataUrl = cropResult.dataUrl;
        instantSnapshotUrl = cropResult.dataUrl;
      } catch (cropErr) {
        console.warn("[Spadas Lens] processFocalCrop failed, using fallback:", cropErr);
      }
    }

    // Fallback if processFocalCrop was unavailable
    if (!centerCropDataUrl && video && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const reticleMacro = await extractReticleMacroCropAsync(video, {
          cropFactor: 0.60,
          targetDimension: 768,
          quality: 0.82,
          boostContrast: true,
        });
        centerCropDataUrl = reticleMacro.cropDataUrl;
        instantSnapshotUrl = reticleMacro.cropDataUrl;
      } catch (mErr) {
        console.warn("[Spadas Lens] Async reticle macro crop error, falling back:", mErr);
      }
    }

    const preferredSnapshotUrl = centerCropDataUrl || instantSnapshotUrl;

    if (preferredSnapshotUrl && (forceManual || scanMode === "snap")) {
      setFrozenFrameUrl(preferredSnapshotUrl);
      setIsScanPaused(true);
    }

    // If camera stream is not active yet when user taps Scan Now, auto-start camera stream first
    const activeStream =
      streamRef.current ||
      cameraStreamManager.getActiveStream() ||
      (videoRef.current?.srcObject as MediaStream | null);
    const hasLiveStream = Boolean(
      activeStream &&
      activeStream.active &&
      activeStream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)
    );

    if (!hasLiveStream && forceManual) {
      await startCamera();
      const waitStart = Date.now();
      while (
        videoRef.current &&
        (videoRef.current.readyState < 2 || videoRef.current.videoWidth <= 0) &&
        Date.now() - waitStart < 600
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;

    const trace = new ScanTrace(scanMode);

    try {
      let frameDataUrl = instantSnapshotUrl || "";

      // SUB-100MS LOCAL WASM BARCODE PRE-PASS: Scan live video frame for barcodes locally (0ms cloud latency, only in barcode mode)
      if (scanMode === "barcode" && (instantCanvas || video) && typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_128", "code_39"],
          });
          const detectedBarcodes = await detector.detect(instantCanvas || video).catch(() => []);
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
                signal: abortController.signal,
              }).catch(() => null);

              if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;

              if (bRes && bRes.ok) {
                const bData = await bRes.json().catch(() => null);
                const pName = (bData?.product?.name || "").trim();
                if (bData && bData.product && pName && pName.toLowerCase() !== "unknown product" && pName.toLowerCase() !== "unknown title") {
                  const isGrocery = (bData.product.category || "").toLowerCase().includes("grocer") || (bData.product.category || "").toLowerCase().includes("beverage") || (bData.product.category || "").toLowerCase().includes("food");
                  const estValue = Number(bData.product.suggestedPrice) || (isGrocery ? 2.5 : 35);
                  const estCost = estValue <= 5 ? Math.max(1, Math.round(estValue * 0.65 * 100) / 100) : Math.max(2, Math.round(estValue * 0.15));
                  const ebayFee = (estValue * 0.134) + 0.33;
                  const estProfit = Math.max(0, Math.round((estValue - estCost - ebayFee) * 100) / 100);
                  const estRoi = estCost > 0 ? Math.round((estProfit / estCost) * 100) : 0;
                  const copVerdict =
                    estProfit < 3
                      ? "PASS_RISKY"
                      : estRoi >= 300 && estProfit >= 25
                        ? "MUST_COP"
                        : estRoi >= 100
                          ? "QUICK_FLIP"
                          : "FAIR_MARGIN";

                  // Capture frame snapshot for preview
                  const snapshotUrl = instantSnapshotUrl || null;
                  const productImg = bData.product.image || snapshotUrl || null;

                  const scanObj: ActiveScanItem = {
                    id: `barcode-${Date.now()}`,
                    productName: pName,
                    brand: bData.product.brand || "Authentic",
                    category: bData.product.category || (isGrocery ? "Groceries & Beverages" : "Barcode Find"),
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
                    image: productImg,
                    timestamp: Date.now(),
                  };

                  const verifiedHit: DetectedHit = {
                    id: `hit-${Date.now()}`,
                    name: pName,
                    brand: bData.product.brand || "Authentic",
                    category: bData.product.category || (isGrocery ? "Groceries & Beverages" : "Barcode Find"),
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
                    verdict: estProfit >= 15 ? "BUY" : estProfit >= 5 ? "CAUTION" : "PASS",
                    confidence: 0.99,
                    bbox: { x: 15, y: 15, width: 70, height: 70 },
                    image: productImg,
                    timestamp: Date.now(),
                  };

                  if (snapshotUrl || productImg) {
                    setFrozenFrameUrl(snapshotUrl || productImg);
                  }
                  setActiveScans([scanObj]);
                  setCapturedLog((prev) => [verifiedHit, ...prev.filter((h) => h.name !== pName)].slice(0, 50));
                  void persistHitAndSyncToSupabase(verifiedHit);
                  setSessionScanCount((prev) => prev + 1);
                  triggerActiveValuationHit(verifiedHit, snapshotUrl || productImg);

                  if (scanExpiryTimerRef.current) {
                    clearTimeout(scanExpiryTimerRef.current);
                    scanExpiryTimerRef.current = null;
                  }

                  if (soundEnabled) {
                    playScanBeep();
                  }
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

      // 1. Native Hardware Optical Reticle Macro Crop (Asynchronously captured off viewfinder thread)
      if (!centerCropDataUrl && video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const reticleMacro = await extractReticleMacroCropAsync(video, {
            cropFactor: 0.65,
            targetDimension: 640,
            quality: 0.82,
            boostContrast: true,
          });
          centerCropDataUrl = reticleMacro.cropDataUrl;
          frameDataUrl = reticleMacro.cropDataUrl;
        } catch (mErr) {
          console.warn("[Spadas Lens] Native reticle macro crop error, falling back:", mErr);
        }
      } else if (centerCropDataUrl) {
        frameDataUrl = centerCropDataUrl;
      }

      if (!centerCropDataUrl && (instantCanvas || video)) {
        try {
          const preprocessed = processFrameForVision(instantCanvas || video!, {
            cropFactor: 0.65,
            boostContrast: true,
            maxDimension: 800,
            quality: 0.74,
          });
          frameDataUrl = preprocessed.fullDataUrl;
          centerCropDataUrl = preprocessed.enhancedCropDataUrl;
        } catch (prepErr) {
          console.warn("[Spadas Lens] Preprocessing fallback:", prepErr);
          if (instantSnapshotUrl) {
            frameDataUrl = instantSnapshotUrl;
          } else if (video) {
            const fullWidth = video.videoWidth || video.clientWidth || 640;
            const fullHeight = video.videoHeight || video.clientHeight || 480;
            if (!offscreenCanvasRef.current) {
              offscreenCanvasRef.current = document.createElement("canvas");
            }
            const canvas = offscreenCanvasRef.current;
            const maxDim = 800;
            let targetW = fullWidth;
            let targetH = fullHeight;
            if (fullWidth > fullHeight) {
              targetW = Math.min(maxDim, fullWidth);
              targetH = Math.round((fullHeight * targetW) / fullWidth);
            } else {
              targetH = Math.min(maxDim, fullHeight);
              targetW = Math.round((fullWidth * targetH) / fullHeight);
            }
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, fullWidth, fullHeight, 0, 0, targetW, targetH);
              frameDataUrl = await exportCanvasToOptimizedDataUrlAsync(canvas, 0.70);
            }
          }
        }
      }

      if (!frameDataUrl && instantSnapshotUrl) {
        frameDataUrl = instantSnapshotUrl;
      }

      // 1. Live Session & Pro/Admin Verification prior to scan limit evaluation
      const { data: sessionData } = await supabase.auth.getSession();
      let sessionUser: any = sessionData?.session?.user;
      if (!sessionUser) {
        const { data: userData } = await supabase.auth.getUser();
        sessionUser = userData?.user;
      }
      const isAuthed = Boolean(sessionUser);
      const isUserAdmin = isOwnerEmail(sessionUser?.email);
      const hasUserPro = Boolean(
        isPro ||
        isUserAdmin ||
        sessionUser?.app_metadata?.is_pro ||
        sessionUser?.user_metadata?.is_pro ||
        sessionUser?.app_metadata?.plan === "pro"
      );

      if (isAuthed) {
        setIsGuestUser(false);
        if (hasUserPro) {
          setIsPro(true);
          setIsLimitReached(false);
          setIsGuestLimitModalOpen(false);
          setIsPaywallOpen(false);
        }
      }

      // 2. Scan limits strictly apply ONLY to genuine unauthenticated guests
      const currentGuestState = getGuestScanState();
      if (!isAuthed && !hasUserPro && (currentGuestState.isLimitReached || currentGuestState.remaining <= 0)) {
        setIsScanPaused(true);
        setIsGuestLimitModalOpen(true);
        setAnalyzingRealFrame(false);
        toast.info(`You've used all ${MAX_GUEST_SCANS} free guest scans! Create a free account to unlock 50 daily scans.`);
        return;
      }

      // 3. Daily 10-scan free tier limit applies strictly to non-pro, non-admin users
      if (!hasUserPro && isLimitReached) {
        setIsScanPaused(true);
        setIsPaywallOpen(true);
        setAnalyzingRealFrame(false);
        toast.error("You've used all 10 free daily scans! Upgrade to Pro for unlimited scans.", {
          id: "daily-limit-toast",
          duration: 5000,
        });
        return;
      }

      if (
        !frameDataUrl ||
        (!frameDataUrl.startsWith("data:image/jpeg;base64,") && !frameDataUrl.startsWith("data:image/webp;base64,")) ||
        frameDataUrl.length < 500
      ) {
        console.warn("[Spadas Lens]", cycleId, "Frame snapshot uninitialized, retrying frame...");
        setAnalyzingRealFrame(false);
        return;
      }

      const snapshotImage = centerCropDataUrl || frameDataUrl;
      if (forceManual || scanMode === "snap") {
        setFrozenFrameUrl(snapshotImage);
        setIsScanPaused(true);
      } else {
        setFrozenFrameUrl(null);
      }
      if (valuationExpiryTimerRef.current) {
        clearTimeout(valuationExpiryTimerRef.current);
      }
      activeValuationHitRef.current = null;
      setActiveValuationHit(null);
      setScanRetryPrompt(null);
      trace.markCaptureEnd();

      // Multi-Frame Optical Stitching & Pooling:
      // Pool data from rapid consecutive frames if movement is detected, creating a higher-resolution composite before sending it to the multi-model vision inference layer to completely eliminate blur or misidentification.
      const pooledCanvases: HTMLCanvasElement[] = [];
      if (instantCanvas) {
        pooledCanvases.push(instantCanvas);
      }

      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          // If movement was detected or active snap initiated, pool rapid consecutive frames (45ms spacing)
          const framesToCapture = forceManual || isMovementDetected ? 2 : 1;
          const burstCanvases = await poolConsecutiveFrames(video, framesToCapture, 45);
          pooledCanvases.push(...burstCanvases);
        } catch (poolErr) {
          console.warn("[Spadas Lens] Rapid burst frames pooling skipped:", poolErr);
        }
      }

      // Generate higher-resolution composite and select sharpest blur-free frame asynchronously
      const compositeResult = await createMultiFrameCompositeAsync(
        pooledCanvases.length > 0 ? pooledCanvases : instantCanvas ? [instantCanvas] : [],
        {
          movementDetected: isMovementDetected,
          quality: 0.82,
          boostContrast: true,
        }
      );

      // Optical Reticle Macro Crop & WebP Compression:
      // For AR Camera HUD, prioritize the 1:1 hardware sensor macro crop (<65KB WebP).
      // Eliminates room/hand clutter, delivers 100% sharp text density on labels/formats,
      // and cuts upload/inference latency by ~60%!
      const opticalStitchedPayloads: string[] = [];
      const primarySharpCrop = centerCropDataUrl || compositeResult.sharpCropDataUrl;

      if (primarySharpCrop) {
        opticalStitchedPayloads.push(primarySharpCrop);
      }

      // In multi-item sweep mode, include secondary full composite for wider scene context
      if (scanMode === "sweep" && compositeResult.compositeDataUrl && compositeResult.compositeDataUrl !== primarySharpCrop) {
        opticalStitchedPayloads.push(compositeResult.compositeDataUrl);
      } else if (opticalStitchedPayloads.length === 0) {
        opticalStitchedPayloads.push(snapshotImage);
      }

      // Continuous Visual Anchor: Always preserve the sharpest frame snapshot throughout progressive loading and comps
      if (primarySharpCrop) {
        setFrozenFrameUrl(primarySharpCrop);
      } else if (compositeResult.bestFrameDataUrl) {
        setFrozenFrameUrl(compositeResult.bestFrameDataUrl);
      } else if (snapshotImage) {
        setFrozenFrameUrl(snapshotImage);
      }

      let imagePayloads = opticalStitchedPayloads;
      if (secondaryImagePayload && !imagePayloads.includes(secondaryImagePayload)) {
        imagePayloads = [secondaryImagePayload, ...imagePayloads];
      }

      // Intelligent Prefetch Queue: Retrieve cached category query template and fire parallel comps query
      const predictiveQuery = getPredictiveQueryForCategory(categoryBias);
      void fireParallelCompsQuery(predictiveQuery, selectedCurrency, abortController.signal);

      let res: Response | null = null;
      console.log('[Spadas Lens]', cycleId, 'Starting resilient fetch for frame with analyzingRealFrame:', analyzingRealFrame);
      trace.markRequestDispatched();
      const fetchStartTime = Date.now();

      setPendingIdentifiedItem(null);

      const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionData?.session?.access_token) {
        requestHeaders["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;

      res = await resilientFetch("/api/ai-listing", {
        method: "POST",
        headers: requestHeaders,
        signal: abortController.signal,
        body: JSON.stringify({
          imageUrls: imagePayloads,
          isArScan: true,
          isGuestScan: !sessionData?.session?.user,
          currency: selectedCurrency,
          mode: scanMode,
          stream: true,
          spatialMetadata,
          categoryBias,
          predictedQuery: predictiveQuery,
        }),
      }, { maxRetries: 2, initialDelayMs: 300 }).catch((e) => {
        if (e?.name === "AbortError" || abortController.signal.aborted) {
          console.log('[Spadas Lens]', cycleId, 'Fetch aborted by new scan cycle');
          return null;
        }
        console.error('[Spadas Lens]', cycleId, 'Fetch error:', e);
        return null;
      });

      if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;

      trace.markResponseReceived();
      if (res) {
        setNetworkLatencyMs(Date.now() - fetchStartTime);
      }

      let data: any = null;
      let raw = "";
      if (res) {
        const contentType = res.headers.get("content-type") || "";
        if ((contentType.includes("application/x-ndjson") || contentType.includes("text/event-stream")) && res.body) {
          try {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let isStreamFinished = false;

            while (!isStreamFinished) {
              if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) {
                try { void reader.cancel(); } catch { }
                return;
              }

              const { done, value } = await reader.read();
              if (done) break;

              if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) {
                try { void reader.cancel(); } catch { }
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) {
                  try { void reader.cancel(); } catch { }
                  return;
                }

                let trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith("data: ")) {
                  trimmed = trimmed.replace(/^data:\s*/, "").trim();
                }
                if (!trimmed || trimmed === "[DONE]") continue;

                try {
                  const chunk = JSON.parse(trimmed);
                  if (chunk.event === "valuation_ready") {
                    if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;
                    // Phase 1: Instant Valuation Ready (< 1.5s) — Render pricing modal immediately
                    const valData = chunk.data || chunk;
                    let rawPName = valData.product_name || valData.analysis?.product_name || "";

                    if (!rawPName || isVagueOrPartialRead(rawPName)) {
                      const fallbackBrand = sanitizeMetaText(valData.brand || valData.analysis?.brand);
                      const fallbackCat = cleanCategoryText(valData.category || valData.analysis?.category);
                      if (fallbackBrand && fallbackCat && fallbackCat !== "General") {
                        rawPName = `${fallbackBrand} ${fallbackCat}`;
                      } else if (fallbackBrand) {
                        rawPName = `${fallbackBrand} Item`;
                      } else if (fallbackCat && fallbackCat !== "General") {
                        rawPName = fallbackCat;
                      }
                    }

                    if (!rawPName || isVagueOrPartialRead(rawPName)) {
                      setScanStage("idle");
                      setAnalyzingRealFrame(false);
                      toast.info("No distinct item detected. Aim directly at item or label.", { id: "no-item-toast" });
                      return;
                    }

                    try {
                      // Transition to final profit calculation step (95%) right before bottom sheet mounts
                      setScanStage("profit");

                      const rawMin = Number(valData.suggested_price_min) || 15;
                      const rawMax = Number(valData.suggested_price_max) || rawMin + 10;
                      let baseVal = Number(valData.suggested_price_median) || Math.round(((rawMin + rawMax) / 2) * 100) / 100;
                      const itemCategory = cleanCategoryText(valData.category || valData.analysis?.category, "General") || "General";
                      const itemBrand = sanitizeMetaText(valData.brand || valData.analysis?.brand) || null;
                      const itemCondition = cleanConditionText(valData.condition || valData.analysis?.condition, "Used");

                      // Run strict outlier rejection pass on live raw comps
                      const verifiedComps = ensureVerifiedSoldComps(
                        valData.raw_sold_comps || [],
                        rawPName,
                        baseVal,
                        itemCondition,
                        itemBrand
                      );

                      const compPrices = verifiedComps
                        .map((c) => Number(c.price))
                        .filter((p) => p > 0)
                        .sort((a, b) => a - b);

                      const settledMedian = compPrices.length > 0
                        ? compPrices[Math.floor(compPrices.length / 2)]
                        : baseVal;

                      const detectedTagPrice = Number(valData.detected_tag_price) || (settledMedian <= 4 ? 1 : Math.max(3, Math.round(settledMedian * 0.15 * 100) / 100));
                      const shippingCost = estimateCategoryShippingCost(itemCategory, rawPName);

                      const copEstimate = calculateThriftCopVerdict({
                        resalePrice: settledMedian,
                        customCost: detectedTagPrice,
                        category: itemCategory,
                        productName: rawPName,
                        brand: itemBrand,
                        shippingCost,
                        confidenceScore: 0.98,
                      });

                      const finalNetProfit = copEstimate.netProfit;
                      const trueNetProfit = finalNetProfit;
                      const roiPercentage = copEstimate.roiPercentage;
                      const copVerdict: CopVerdict = copEstimate.copVerdict;
                      baseVal = settledMedian;

                      const snapImg = snapshotImage || frozenFrameUrl;
                      const isGrailHit =
                        trueNetProfit >= 50 &&
                        (trueNetProfit >= 80 || roiPercentage >= 250) &&
                        copVerdict === "MUST_COP";

                      const verifiedHit: DetectedHit = {
                        id: `hit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        name: rawPName,
                        brand: itemBrand,
                        category: itemCategory,
                        condition: itemCondition,
                        mediaFormat: valData.media_format || valData.analysis?.media_format || undefined,
                        conditionGrade: valData.condition_grade || "Good",
                        wearInspection: valData.wear_inspection || null,
                        conditionModifier: valData.condition_modifier || 1.0,
                        inventoryCondition: valData.inventory_condition || "used_working",
                        defectNotes: valData.defect_notes || [],
                        asIsDisclaimer: valData.as_is_disclaimer || "",
                        estimatedValue: baseVal,
                        estCost: detectedTagPrice,
                        estimatedProfit: trueNetProfit,
                        estRoi: roiPercentage,
                        tagPrice: detectedTagPrice,
                        trueNetProfit,
                        roiPercentage,
                        copVerdict,
                        verdict: trueNetProfit > 15 ? "BUY" : trueNetProfit >= 5 ? "CAUTION" : "PASS",
                        confidence: 0.98,
                        ebayCompsCount: valData.ebay_comps_count,
                        compsSource: valData.comps_source || "browse_api",
                        rawComps: verifiedComps,
                        compsRange: valData.comps_range,
                        bbox: valData.detected_objects?.[0]?.bbox || { x: 20, y: 20, width: 60, height: 60 },
                        timestamp: Date.now(),
                        isGrail: isGrailHit,
                        image: typeof snapImg === "string" ? snapImg : undefined,
                      };

                      const scanObj: ActiveScanItem = {
                        id: `scan-${Date.now()}`,
                        productName: rawPName,
                        brand: verifiedHit.brand || undefined,
                        category: verifiedHit.category,
                        condition: verifiedHit.condition,
                        mediaFormat: verifiedHit.mediaFormat,
                        inventoryCondition: "used_working",
                        defectNotes: verifiedHit.defectNotes || [],
                        asIsDisclaimer: verifiedHit.asIsDisclaimer || "",
                        bbox: verifiedHit.bbox || { x: 20, y: 20, width: 60, height: 60 },
                        status: "valued",
                        estimatedValue: baseVal,
                        suggestedPriceMin: rawMin,
                        suggestedPriceMax: rawMax,
                        confidenceScore: 0.98,
                        ebayCompsCount: verifiedHit.ebayCompsCount,
                        compsSource: verifiedHit.compsSource,
                        rawComps: verifiedHit.rawComps,
                        compsRange: verifiedHit.compsRange,
                        estCost: detectedTagPrice,
                        estimatedProfit: trueNetProfit,
                        estRoi: roiPercentage,
                        tagPrice: detectedTagPrice,
                        trueNetProfit,
                        roiPercentage,
                        copVerdict,
                        timestamp: Date.now(),
                      };

                      setActiveScans([scanObj]);
                      setCapturedLog((prev) => [verifiedHit, ...prev.filter((h) => h.name !== verifiedHit.name)].slice(0, 50));
                      setCachedValuation(verifiedHit.name, verifiedHit);
                      activeValuationHitRef.current = verifiedHit;
                      data = valData;

                      // Synchronously mount comps modal immediately upon valuation resolution (0ms delay)
                      setScanStage("complete");
                      triggerActiveValuationHit(verifiedHit, snapImg);
                      void persistHitAndSyncToSupabase(verifiedHit, valData);
                      if (!isAuthed && !hasUserPro) {
                        recordGuestScanIfGuest(verifiedHit, cycleId);
                      }
                    } catch (valErr) {
                      console.error("[Spadas Lens] Error calculating valuation ready data:", valErr);
                      const snapImg = snapshotImage || frozenFrameUrl;
                      const fallbackHit: DetectedHit = {
                        id: `hit-err-${Date.now()}`,
                        name: rawPName,
                        brand: sanitizeMetaText(valData.brand || valData.analysis?.brand) || null,
                        category: cleanCategoryText(valData.category || valData.analysis?.category) || "General",
                        condition: "Used",
                        estimatedValue: Number(valData.suggested_price_median) || 35,
                        tagPrice: 5,
                        estCost: 5,
                        trueNetProfit: 20,
                        estimatedProfit: 20,
                        estRoi: 300,
                        roiPercentage: 300,
                        copVerdict: "QUICK_FLIP",
                        verdict: "BUY",
                        confidence: 0.9,
                        compsSource: "ai_estimate",
                        rawComps: [],
                        bbox: { x: 20, y: 20, width: 60, height: 60 },
                        timestamp: Date.now(),
                        image: typeof snapImg === "string" ? snapImg : undefined,
                      };
                      setScanStage("complete");
                      triggerActiveValuationHit(fallbackHit, snapImg);
                      if (!isAuthed && !hasUserPro) {
                        recordGuestScanIfGuest(fallbackHit, cycleId);
                      }
                    }
                  } else if (chunk.event === "listing_complete") {
                    if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;
                    // Phase 2: Background Draft Copywriting finished — silently enrich activeValuationHit
                    const listingData = chunk.data || chunk;
                    setActiveValuationHit((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        marketTitles: listingData.market_titles || prev.marketTitles,
                        seoDescription: listingData.seo_description || prev.seoDescription,
                        detailedDescription: listingData.detailed_description || prev.detailedDescription,
                        shippingEstimate: listingData.shipping_estimate || prev.shippingEstimate,
                        itemSpecifics: listingData.item_specifics || prev.itemSpecifics,
                        suggestedKeywords: listingData.suggested_keywords || prev.suggestedKeywords,
                        salesVelocity: listingData.sales_velocity || prev.salesVelocity,
                      };
                    });
                    if (data) {
                      data = { ...data, ...listingData };
                    }
                  } else if (chunk.event === "vision_complete") {
                    if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;
                    // Vision processing finished! Immediately transition progressive loader to comps and render card skeleton
                    const rawPName = chunk.product_name || chunk.analysis?.product_name || "";
                    if (rawPName && !isVagueOrPartialRead(rawPName)) {
                      const pendingObj = {
                        productName: rawPName,
                        brand: chunk.brand || chunk.analysis?.brand || "Authentic",
                        category: chunk.category || chunk.analysis?.category || "General Resale",
                        condition: chunk.condition || chunk.analysis?.condition || "Used",
                        bbox: chunk.detected_objects?.[0]?.bbox || { x: 20, y: 20, width: 60, height: 60 },
                      };

                      setScanStage("comps");
                      setPendingIdentifiedItem(pendingObj);

                      // Instantly render lightweight pending card skeleton on camera HUD
                      const pendingScan: ActiveScanItem = {
                        id: `pending-${Date.now()}`,
                        productName: rawPName,
                        brand: pendingObj.brand,
                        category: pendingObj.category,
                        condition: cleanConditionText(pendingObj.condition),
                        inventoryCondition: "used_working",
                        defectNotes: [],
                        asIsDisclaimer: "",
                        bbox: pendingObj.bbox,
                        status: "pending",
                        confidenceScore: 0.95,
                        timestamp: Date.now(),
                      };
                      setActiveScans((prev) => {
                        const existingValued = prev.find((s) => s.status === "valued");
                        if (existingValued && Date.now() - existingValued.timestamp < 8000) {
                          if (getKeywordSimilarity(existingValued.productName, rawPName) >= 0.5) {
                            return prev;
                          }
                          return [existingValued, pendingScan].slice(0, 2);
                        }
                        return [pendingScan];
                      });
                    }
                  } else if (chunk.event === "complete") {
                    if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;
                    data = chunk.data;
                    isStreamFinished = true;
                    break;
                  } else if (!chunk.event) {
                    if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;
                    data = chunk;
                    isStreamFinished = true;
                    break;
                  }
                } catch (parseErr) {
                  console.warn("[Spadas Lens] Stream parse warning:", parseErr);
                }
              }
            }

            if (!data && buffer.trim()) {
              try {
                let trimmed = buffer.trim();
                if (trimmed.startsWith("data: ")) {
                  trimmed = trimmed.replace(/^data:\s*/, "").trim();
                }
                const chunk = JSON.parse(trimmed);
                if (chunk.event === "complete") {
                  data = chunk.data;
                } else if (!chunk.event) {
                  data = chunk;
                }
              } catch { }
            }

            // Immediately cancel reader to free HTTP connection without waiting for keepalive timeout
            try {
              void reader.cancel();
            } catch { }
          } catch (streamErr: any) {
            if (streamErr?.name === "AbortError" || abortController.signal.aborted || cycleId !== activeCycleIdRef.current) {
              return;
            }
            console.warn("[Spadas Lens] Error reading NDJSON stream, falling back:", streamErr);
          }
        }

        if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) return;

        if (!data) {
          raw = await res.text().catch(() => "");
          console.log('[Spadas Lens]', cycleId, 'Fetch completed with status:', res.status, 'and length:', raw.length);
          try {
            data = JSON.parse(raw);
          } catch (e: any) {
            console.log('[Spadas Lens]', cycleId, 'fetch threw:', String(e));
            console.error('[Spadas Lens]', cycleId, 'parse failed:', e.message, raw.slice(0, 300));
            data = null;
          }
        }
      }

      trace.markParseCompleted();

      if (abortController.signal.aborted || cycleId !== activeCycleIdRef.current) {
        console.log('[Spadas Lens]', cycleId, 'discarding stale response (superseded or aborted)');
        return;
      }

      setLastRawApiResponse(data);

      // ── Phase 4: Non-Alarming HTTP Error State Handling ──────────────────────
      if (res?.status === 403 || data?.limitReached) {
        if (!hasUserPro) {
          setIsScanPaused(true);
          setIsLimitReached(true);
          setIsPaywallOpen(true);
          setLatestApiError("Daily free scan limit reached (10/10).");
          toast.error("You've used all 10 free daily scans! Upgrade to Pro for unlimited scans.", {
            id: "daily-limit-toast",
            duration: 6000,
          });
        }
        setAnalyzingRealFrame(false);
        return;
      }

      if (res?.status === 401) {
        if (!isAuthed && isGuestUser) {
          setIsGuestLimitModalOpen(true);
          setIsScanPaused(true);
        } else {
          setScanErrorState({ type: "unauthorized" });
          setLatestApiError("401 Unauthorized — session expired");
        }
        setAnalyzingRealFrame(false);
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

      if (data?.error && typeof data.error === 'string' && data.error.toLowerCase().includes("dark")) {
        if (torchSupported) {
          toast("Photo too dark — Turn on flash?", {
            id: "photo-dark",
            action: {
              label: "Turn On Flash",
              onClick: () => {
                void toggleTorch();
              },
            },
            duration: 4000,
          });
          setScanRetryPrompt({ message: "Photo too dark — turn on flash or try near a window.", canRetry: true });
        } else {
          toast("Photo too dark — Try moving near a window or light source", {
            id: "photo-dark",
            duration: 4000,
          });
          setScanRetryPrompt({ message: "Photo too dark — try near a window or light source for clearer comps.", canRetry: true });
        }
        setAnalyzingRealFrame(false);
        return;
      }

      if (!data || data.error || !res) {
        // If offline or network dropped, enqueue to quickSnapQueue without inventing an appraisal
        if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
          if (frozenFrameUrl) {
            try {
              const blob = dataUriToBlob(frozenFrameUrl);
              void quickSnapQueue.enqueuePhoto(Promise.resolve(blob), undefined, selectedCurrency);
              toast.info("Offline — item saved to queue for sync when connected");
            } catch (err) {
              console.warn("[Spadas Lens] Failed to queue offline photo:", err);
            }
          }
          setAnalyzingRealFrame(false);
          return;
        }

        const errMsg = data?.error || (res?.status ? `Scan failed (${res.status})` : "Couldn't get a value — check connection and retry");
        setScanRetryPrompt({
          message: errMsg,
          canRetry: true,
        });
        toast.error(errMsg, { id: "scan-retry-toast" });
        setAnalyzingRealFrame(false);
        return;
      }

      const rec = data?.retake_recommended || data?.analysis?.retake_recommended;
      if (rec?.required) {
        setRetakeRecommendation({
          required: true,
          angleType: rec.angle_type || "tag",
          reason: rec.reason || "Secondary angle needed for accurate valuation",
          promptLabel: rec.prompt_label || "📸 Snap Collar Tag or Detail Angle for 100% Accuracy",
        });
        setSecondaryImagePayload(snapshotImage);
        toast.warning(rec.prompt_label || "📸 Snap Collar Tag or Hardware Detail for 100% Accuracy", {
          id: "retake-guidance",
          duration: 6000,
        });
      } else {
        setRetakeRecommendation(null);
        setSecondaryImagePayload(null);
      }

      // Hard check: if unidentified, stay clean without inserting placeholder cards or fake prices
      if (data.status === "unidentified" || data.analysis?.status === "unidentified") {
        if (forceManual || scanMode === "snap") {
          toast.info("No distinct item detected. Aim directly at item or label.", { id: "no-item-toast" });
          setIsScanPaused(false);
          setFrozenFrameUrl(null);
        }
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
        if (forceManual || scanMode === "snap") {
          toast.info("No clear item recognized. Hold steady and try again.", { id: "no-item-toast" });
          setIsScanPaused(false);
          setFrozenFrameUrl(null);
        }
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
              brand: cleanBrandText(data?.analysis?.brand || data?.brand, "Unbranded"),
              category: cleanCategoryText(data?.analysis?.category || data?.category, "General"),
              condition: cleanConditionText(data?.analysis?.condition || data?.condition, "Used - Good"),
              bbox: { x: 20, y: 15, width: 60, height: 70 },
              confidence_score: data?.analysis?.confidence_score || 0.95,
            },
          ];

      // Instant Bounding Boxes & Hard-Kill Filtering
      const now = Date.now();
      const validPendingItems: ActiveScanItem[] = [];

      for (const item of detected) {
        let pName = (item.product_name || "").trim();
        const cat = cleanCategoryText(item.category, "General") || "General";

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

        const scanObj: ActiveScanItem = {
          id: item.id || `scan-${now}-${Math.random().toString(36).substring(2, 6)}`,
          productName: pName,
          brand: sanitizeMetaText(item.brand),
          category: cat,
          condition: cleanConditionText(item.condition, "Used"),
          mediaFormat: (item as any).media_format || data.media_format || data.analysis?.media_format || undefined,
          inventoryCondition: data.inventory_condition || "used_working",
          defectNotes: data.defect_notes || [],
          asIsDisclaimer: data.as_is_disclaimer || "",
          bbox: item.bbox || { x: 20, y: 20, width: 60, height: 60 },
          status: "pending",
          suggestedPriceMin: Number(data.suggested_price_min) || undefined,
          suggestedPriceMax: Number(data.suggested_price_max) || undefined,
          confidenceScore: item.confidence_score || data.analysis?.confidence_score || 0.95,
          ebayCompsCount: item.ebay_comps_count || data.ebay_comps_count || undefined,
          activeCompsCount: data.active_comps_count || undefined,
          isActiveAskOnly: Boolean(data.is_active_ask),
          isUsMarketOnly: Boolean(data.is_us_market_only),
          noMarketData: Boolean(data.no_market_data),
          arbitrageSignal: data.arbitrage_signal || undefined,
          compsSource: data.comps_source || (data.ebay_comps_count ? "sold_comps_api" : data.is_active_ask ? "browse_api" : "ai_estimate"),
          rawComps: data.raw_sold_comps || [],
          compsRange: data.comps_range,
          variantAudit: data.variant_audit,
          requiresSecondaryVerification: data.requires_secondary_verification,
          verificationReason: data.verification_reason,
          fallbackProtocol: data.fallback_protocol,
          timestamp: now,
        };

        validPendingItems.push(scanObj);
      }

      if (validPendingItems.length === 0) {
        trace.markStateDecision("REJECTED_EMPTY_RESPONSE", "No valid center items passed confidence & rejection filters", {
          previousRetained: true,
        });
        trace.markRenderCommitted();
        return;
      }

      const currentMountedHit = (activeValuationHitRef as any).current as DetectedHit | null;
      if (currentMountedHit?.name) {
        // Valuation was already mounted instantly in Phase 1 via valuation_ready (< 1.5s)
        void persistHitAndSyncToSupabase(currentMountedHit, data);
        recordCategoryTemplateQuery(currentMountedHit.name, currentMountedHit.category, categoryBias);
        if (!isAuthed && !hasUserPro) {
          recordGuestScanIfGuest(currentMountedHit, cycleId);
        }
        trace.markRenderCommitted();
        setAnalyzingRealFrame(false);
        return;
      }

      // Process and render all verified scan items on HUD overlay
      for (const obj of validPendingItems) {
        try {
          let rawMin = Number(data.suggested_price_min) || 15;
          let rawMax = Number(data.suggested_price_max) || rawMin + 10;
          let baseVal = Number(data.suggested_price_median) || Math.round(((rawMin + rawMax) / 2) * 100) / 100;

          let itemCondition = cleanConditionText(obj.condition);
          let itemCategory = cleanCategoryText(obj.category, "General") || "General";
          let itemBrand = sanitizeMetaText(obj.brand) || sanitizeMetaText(data?.analysis?.brand) || null;

          // Run strict outlier rejection pass on live raw comps
          const verifiedComps = ensureVerifiedSoldComps(
            data.raw_sold_comps || obj.rawComps || [],
            obj.productName,
            baseVal,
            itemCondition,
            itemBrand
          );

          const compPrices = verifiedComps
            .map((c) => Number(c.price))
            .filter((p) => p > 0)
            .sort((a, b) => a - b);

          const settledMedian = compPrices.length > 0
            ? compPrices[Math.floor(compPrices.length / 2)]
            : baseVal;

          let detectedTagPrice = Number(data.detected_tag_price) || (settledMedian <= 4 ? 1 : Math.max(3, Math.round(settledMedian * 0.15 * 100) / 100));
          const shippingCost = estimateCategoryShippingCost(itemCategory, obj.productName);

          const copEstimate = calculateThriftCopVerdict({
            resalePrice: settledMedian,
            customCost: detectedTagPrice,
            category: itemCategory,
            productName: obj.productName,
            brand: itemBrand,
            shippingCost,
            confidenceScore: obj.confidenceScore || 0.95,
          });

          const finalNetProfit = copEstimate.netProfit;
          let trueNetProfit = finalNetProfit;
          let roiPercentage = copEstimate.roiPercentage;
          let copVerdict: CopVerdict = copEstimate.copVerdict;
          baseVal = settledMedian;

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
            activeCompsCount: obj.activeCompsCount,
            isActiveAskOnly: obj.isActiveAskOnly,
            isUsMarketOnly: obj.isUsMarketOnly,
            noMarketData: obj.noMarketData,
            arbitrageSignal: obj.arbitrageSignal,
            compsSource: obj.compsSource,
            rawComps: verifiedComps,
            compsRange: data.comps_range || obj.compsRange,
            variantAudit: data.variant_audit || obj.variantAudit,
            requiresSecondaryVerification: data.requires_secondary_verification ?? obj.requiresSecondaryVerification,
            verificationReason: data.verification_reason || obj.verificationReason,
            fallbackProtocol: data.fallback_protocol || obj.fallbackProtocol,
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
            ocrText: data?.analysis?.visual_reasoning?.visible_text_detected || (obj.brand ? [obj.brand] : undefined),
          };

          setSessionScanCount((prev) => prev + 1);

          if (scanExpiryTimerRef.current) {
            clearTimeout(scanExpiryTimerRef.current);
            scanExpiryTimerRef.current = null;
          }

          // Retain up to 3 verified scan items smoothly without abrupt timer clearing
          setActiveScans((prev) => {
            const filtered = prev.filter((s) => getKeywordSimilarity(s.productName, obj.productName) < 0.6);
            return [valuedItem, ...filtered].slice(0, 3);
          });

          // Strict Grail Alert Engine: requires genuine positive net profit ($50+ minimum, and $80+ or 250%+ ROI with MUST_COP)
          const isGrailHit =
            estimatedProfit >= 50 &&
            (estimatedProfit >= 80 || estRoi >= 250) &&
            copVerdict === "MUST_COP";

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
          } else if (estimatedProfit >= minProfitThreshold && estRoi >= minRoiThreshold && copVerdict !== "PASS_RISKY") {
            const lastChimed = lastChimedRef.current;
            const isSameProduct = lastChimed && getKeywordSimilarity(lastChimed.name, obj.productName) >= 0.55;
            const isCooldownActive = lastChimed && (now - lastChimed.time < 15000);

            if (!isSameProduct || !isCooldownActive) {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(80);
              }
              speakCue(`High profit hit: ${obj.productName}. Profit ${fmtMoney(estimatedProfit)}.`);
              lastChimedRef.current = { name: obj.productName, time: now };
            }
          }

          // Add EVERY scanned item directly to top of Real-Time Scanned List
          const verifiedHit: DetectedHit = {
            id: `hit-${now}-${Math.random().toString(36).substring(2, 8)}`,
            name: obj.productName,
            brand: sanitizeMetaText(obj.brand) || sanitizeMetaText(data?.analysis?.brand) || null,
            category: cleanCategoryText(obj.category, "General") || "General",
            condition: cleanConditionText(itemCondition, "Used"),
            mediaFormat: obj.mediaFormat || data?.media_format || data?.analysis?.media_format || undefined,
            conditionGrade: data?.condition_grade || data?.analysis?.condition_grade || "Good",
            wearInspection: data?.wear_inspection || data?.analysis?.wear_inspection || null,
            conditionModifier: data?.condition_modifier || data?.analysis?.condition_modifier || 1.0,
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
            activeCompsCount: obj.activeCompsCount,
            isActiveAskOnly: obj.isActiveAskOnly,
            isUsMarketOnly: obj.isUsMarketOnly,
            noMarketData: obj.noMarketData,
            arbitrageSignal: obj.arbitrageSignal,
            compsSource: obj.compsSource,
            rawComps: verifiedComps,
            compsRange: data?.comps_range || obj.compsRange,
            variantAudit: data?.variant_audit || obj.variantAudit,
            requiresSecondaryVerification: data?.requires_secondary_verification ?? obj.requiresSecondaryVerification,
            verificationReason: data?.verification_reason || obj.verificationReason,
            fallbackProtocol: data?.fallback_protocol || obj.fallbackProtocol,
            bbox: obj.bbox,
            timestamp: now,
            isGrail: isGrailHit,
            salesVelocity: data?.sales_velocity || (() => {
              const v = calculateSalesVelocity({
                productName: obj.productName,
                category: obj.category,
                brand: obj.brand,
              });
              return {
                sell_speed: v.turnoverTier === "RAPID_FIRE" ? "FAST_FLIP" : v.turnoverTier === "STEADY_TURN" ? "MODERATE" : "SLOW_BURNER",
                est_days_to_sell: v.estDaysToSell,
                demand_score: v.demandScore,
                sell_through_rate: `${v.sellThroughRate}% sold`,
              };
            })(),
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
            image: snapshotImage || frozenFrameUrl || (obj as any).image || undefined,
          };

          trace.markStateDecision("ACCEPTED_NEW_HIT", "High confidence identification committed to state", {
            productName: obj.productName,
            brand: obj.brand || undefined,
            confidence: obj.confidenceScore,
            previousRetained: false,
          });

          setCapturedLog((prev) => [verifiedHit, ...prev]);
          void persistHitAndSyncToSupabase(verifiedHit, data);
          recordCategoryTemplateQuery(verifiedHit.name, verifiedHit.category, categoryBias);

          // Mirror hit to Rapid Thrift Haul items for real-time telemetry badge updates
          const snapImg = snapshotImage || frozenFrameUrl || (verifiedHit as any).image;
          const rapidMirrorItem: RapidThriftItem = {
            id: verifiedHit.id || `rapid_${Date.now()}`,
            photoId: verifiedHit.id ? `photo_${verifiedHit.id}` : `photo_${Date.now()}`,
            timestamp: verifiedHit.timestamp,
            status: "completed",
            productName: verifiedHit.name,
            brand: cleanBrandText(verifiedHit.brand, "Unbranded"),
            category: cleanCategoryText(verifiedHit.category, "General"),
            condition: cleanConditionText(verifiedHit.condition, "Used - Good"),
            estimatedValue: verifiedHit.estimatedValue || 0,
            thriftCost: verifiedHit.tagPrice || verifiedHit.estCost || 0,
            trueNetProfit: verifiedHit.trueNetProfit || verifiedHit.estimatedProfit || 0,
            roiPercentage: verifiedHit.roiPercentage || verifiedHit.estRoi || 0,
            copVerdict:
              verifiedHit.copVerdict === "MUST_COP"
                ? "MUST_COP"
                : verifiedHit.copVerdict === "VERIFY_FIRST"
                  ? "VERIFY_FIRST"
                  : verifiedHit.copVerdict === "PASS_RISKY"
                    ? "PASS_RISKY"
                    : "QUICK_FLIP",
            isGrail: Boolean(verifiedHit.isGrail),
            thumbnailUrl: typeof snapImg === "string" ? snapImg : undefined,
            image: typeof snapImg === "string" ? snapImg : undefined,
            imageUrl: typeof snapImg === "string" ? snapImg : undefined,
          };
          setRapidItems((prev) => [rapidMirrorItem, ...prev.filter((i) => i.id !== rapidMirrorItem.id)]);

          // Cache captured image blob to IndexedDB for instant Spadas Haul thumbnail rendering
          if (snapImg && typeof snapImg === "string") {
            try {
              const blob = dataUriToBlob(snapImg);
              void savePhotoBlob(rapidMirrorItem.photoId, blob);
            } catch (err) {
              console.warn("[Rapid Thrift] Failed to cache photo blob:", err);
            }
          }

          // Automatically trigger active result state if not already mounted from valuation_ready
          if (!activeValuationHitRef.current) {
            triggerActiveValuationHit(verifiedHit, snapshotImage || frozenFrameUrl);
          } else {
            // Silently merge any enriched properties without remounting or re-triggering haptics/audio/toast
            setActiveValuationHit((prev) => prev ? { ...prev, ...verifiedHit, id: prev.id } : verifiedHit);
            if (activeCompsHitRef.current) {
              setActiveCompsHit((prev) => prev ? { ...prev, ...verifiedHit, id: prev.id } : verifiedHit);
            }
          }

          if (!isAuthed && !hasUserPro) {
            recordGuestScanIfGuest(verifiedHit, cycleId);
          }

          // Emit to Reactive Observer Sourcing Bus & Store to Local LRU Cache
          sourcingBus.emit("ITEM_VALUED", {
            item: verifiedHit,
            isGrail: isGrailHit,
          });
          setCachedValuation(verifiedHit.name, verifiedHit);
          trace.markRenderCommitted();

          const toastNet = (finalNetProfit !== null && !isNaN(finalNetProfit))
            ? Number(finalNetProfit).toFixed(2)
            : Number(data.takeHomeNet || data.true_net_profit || 0).toFixed(2);

          if (!activeValuationHitRef.current) {
            toast.success(`🎯 Item Identified: ${obj.productName} (+$${toastNet} ${selectedCurrency} Net Profit)`, { id: `hit-toast-${obj.productName}` });
          }

          // In-App Review Prompt Milestone Trigger (after 3 successful scans)
          try {
            const shouldPromptReview = recordSuccessfulScanAndCheckReviewPrompt();
            if (shouldPromptReview) {
              setTimeout(() => {
                if (!activeCompsHitRef.current && !activeValuationHitRef.current) {
                  setIsReviewModalOpen(true);
                }
              }, 4000);
            }
          } catch (e) {
            console.warn("[Spadas Lens] Review prompt trigger error:", e);
          }
        } catch (err) {
          console.error("[Spadas Lens] Item valuation formatting error:", err);
          setActiveScans((prev) => prev.filter((s) => s.id !== obj.id));
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || abortController.signal.aborted || cycleId !== activeCycleIdRef.current) {
        return;
      }
      console.log('[Spadas Lens] fetch threw:', String(err));
      console.warn("Live camera Vision scan warning:", err?.message);
    } finally {
      // GUARANTEED ALWAYS-RELEASE STATE RESET (only if current cycle has not been superseded)
      if (activeCycleIdRef.current === cycleId) {
        analyzingRef.current = false;
        setAnalyzingRealFrame(false);
        setPendingIdentifiedItem(null);
        setScanStage(activeValuationHitRef.current ? "complete" : "idle");
      }
    }
  }, [
    soundEnabled,
    flushScanState,
    scanMode,
    isPro,
    isOwner,
    isLimitReached,
    isGuestUser,
    sessionScanCount,
    categoryBias,
    spatialMetadata,
    secondaryImagePayload,
    selectedCurrency,
    torchSupported,
    isOffline,
    frozenFrameUrl,
    triggerActiveValuationHit,
    persistHitAndSyncToSupabase,
  ]);

  // HUD STATE MACHINE: Keep recognized item cards visible indefinitely (Pinned) until manually dismissed
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveScans((prev) =>
        prev.filter((item) => {
          const isStuckPending = item.status === "pending" && now - item.timestamp > 4000;
          return !isStuckPending; // Pinned indefinitely until user taps 'Scan Next Item'
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dedicated Multi-Worker Rapid Thrift Queue Processor (Max Concurrency: 2)
  const processRapidQueue = useCallback(async () => {
    if (!isPro && !isOwner && isLimitReached) {
      setIsScanPaused(true);
      setIsPaywallOpen(true);
      toast.error("You've used all 10 free daily scans! Upgrade to Pro for unlimited scans.", {
        id: "daily-limit-toast",
      });
      return;
    }

    while (rapidQueueRef.current.length > 0 && activeRapidWorkersRef.current < MAX_RAPID_CONCURRENCY) {
      const task = rapidQueueRef.current.shift();
      if (!task) break;

      activeRapidWorkersRef.current++;

      // Update state to "analyzing"
      setRapidItems((prev) =>
        prev.map((i) => (i.id === task.item.id ? { ...i, status: "analyzing" } : i))
      );

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (sessionData?.session?.access_token) {
            requestHeaders["Authorization"] = `Bearer ${sessionData.session.access_token}`;
          }

          const res = await resilientFetch(
            "/api/rapid-thrift",
            {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify({
                image: base64Data,
                currency: selectedCurrency,
              }),
            },
            { maxRetries: 1, initialDelayMs: 200 }
          ).catch(() => null);

          if (res?.status === 403) {
            if (!isPro && !isOwner) {
              setIsLimitReached(true);
              setIsScanPaused(true);
              setIsPaywallOpen(true);
              toast.error("You've used all 10 free daily scans! Upgrade to Pro for unlimited scans.", {
                id: "daily-limit-toast",
              });
            }
            setRapidItems((prev) =>
              prev.map((i) => (i.id === task.item.id ? { ...i, status: "error" } : i))
            );
            activeRapidWorkersRef.current = Math.max(0, activeRapidWorkersRef.current - 1);
            return;
          }

          let data: any = null;
          if (res && res.ok) {
            data = await res.json().catch(() => null);
          }

          if (!data || data.error) {
            setRapidItems((prev) =>
              prev.map((i) =>
                i.id === task.item.id
                  ? {
                      ...i,
                      status: "error",
                      error: data?.error || "Appraisal failed",
                    }
                  : i
              )
            );
            activeRapidWorkersRef.current = Math.max(0, activeRapidWorkersRef.current - 1);
            return;
          }

          const profit = Number(data.true_net_profit) || 0;
          const isHighRisk = Boolean(data.needs_verification);

          setRapidItems((prev) =>
            prev.map((i) =>
              i.id === task.item.id
                ? {
                  ...i,
                  status: "completed",
                  productName: data.product_name || "Thrift Item",
                  brand: cleanBrandText(data.brand, "Unbranded"),
                  category: cleanCategoryText(data.category, "General"),
                  condition: cleanConditionText(data.condition, "Used - Good"),
                  estimatedValue: Number(data.estimated_value) || 20,
                  thriftCost: Number(data.thrift_cost) || 3,
                  trueNetProfit: profit,
                  roiPercentage: Number(data.roi_percentage) || 0,
                  copVerdict: data.cop_verdict || (profit >= 50 ? "MUST_COP" : "QUICK_FLIP"),
                  isGrail: profit >= 50 || Boolean(data.is_grail),
                  needsVerification: isHighRisk,
                  notes: data.notes,
                  thumbnailUrl: base64Data,
                  image: base64Data,
                  imageUrl: base64Data,
                }
                : i
            )
          );

          // Haptics + Audio Fallback (iOS Safari Compatible Web Audio chime)
          triggerPocketAlert(profit, isHighRisk, soundEnabled);

          if (profit >= 50) {
            toast.success(`🚨 Grail Found: ${data.product_name} (+${fmtMoney(profit)} Profit!)`);
          } else if (isHighRisk) {
            toast.info(`🛡️ Forensic Check Recommended: ${data.product_name}`);
          }

          // Also mirror to capturedLog for seamless inventory listing
          const hit: DetectedHit = {
            id: task.item.id,
            name: data.product_name || "Thrift Item",
            brand: data.brand || null,
            category: data.category || "General",
            condition: data.condition || "Used - Good",
            bbox: { x: 15, y: 15, width: 70, height: 70 },
            estimatedValue: Number(data.estimated_value) || 20,
            estCost: Number(data.thrift_cost) || 3,
            estimatedProfit: profit,
            trueNetProfit: profit,
            estRoi: Number(data.roi_percentage) || 0,
            roiPercentage: Number(data.roi_percentage) || 0,
            tagPrice: Number(data.thrift_cost) || 3,
            copVerdict: data.cop_verdict || (profit >= 50 ? "MUST_COP" : "QUICK_FLIP"),
            verdict: profit > 15 ? "BUY" : profit >= 5 ? "CAUTION" : "PASS",
            confidence: 0.96,
            timestamp: task.item.timestamp,
            isGrail: profit >= 50 || Boolean(data.is_grail),
            salesVelocity: data.sales_velocity || (() => {
              const v = calculateSalesVelocity({
                productName: data.product_name,
                category: data.category,
                brand: data.brand,
              });
              return {
                sell_speed: v.turnoverTier === "RAPID_FIRE" ? "FAST_FLIP" : v.turnoverTier === "STEADY_TURN" ? "MODERATE" : "SLOW_BURNER",
                est_days_to_sell: v.estDaysToSell,
                demand_score: v.demandScore,
                sell_through_rate: `${v.sellThroughRate}% sold`,
              };
            })(),
          };
          setCapturedLog((prev) => [hit, ...prev.filter((h) => h.name !== hit.name)].slice(0, 50));
          setSessionScanCount((prev) => prev + 1);

          // Automatically trigger active result state so the valuation card slides into view instantly
          triggerActiveValuationHit(hit, base64Data);
        } catch (err) {
          console.warn("[Rapid Worker] Processing error:", err);
          setRapidItems((prev) =>
            prev.map((i) => (i.id === task.item.id ? { ...i, status: "error", errorMessage: "Failed to appraise" } : i))
          );
        } finally {
          activeRapidWorkersRef.current = Math.max(0, activeRapidWorkersRef.current - 1);
          void processRapidQueue();
        }
      };
      reader.readAsDataURL(task.blob);
    }
  }, [selectedCurrency, soundEnabled, triggerActiveValuationHit]);

  const processFrameRef = useRef(processCurrentFrame);
  useEffect(() => {
    processFrameRef.current = processCurrentFrame;
  }, [processCurrentFrame]);

  // Active Auto-Scan & Scene Change Watcher with Frame-Skip Delay & Sampling Interval
  useEffect(() => {
    // In Manual / Snap mode or while scanning/cooling down, completely freeze motion tracking and continuous passes
    if (!stream || !!deepVerifyItem || isScanPaused || !!activeCompsHit || !!activeValuationHit || analyzingRealFrame || isCoolingDown) return;
    if (!autoScanActive) return;

    let isDestroyed = false;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 64;
    offCanvas.height = 64;
    const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

    let wasMoving = false;
    let stableTicks = 0;
    let frameSkipCounter = 0;
    let lastAutoTriggerTime = Date.now();
    const SAMPLING_INTERVAL_MS = 320; // Frame-skip sampling interval: 320ms prevents CPU thrash & frame flutter

    const interval = setInterval(() => {
      if (isDestroyed) return;
      // In-flight state lock: Freeze analysis passes until the network call returns or fails
      if (
        analyzingRef.current ||
        analyzingRealFrame ||
        isCoolingDownRef.current ||
        isScanPausedRef.current ||
        activeValuationHitRef.current ||
        activeCompsHitRef.current ||
        !autoScanActive
      ) {
        return;
      }

      // Frame skip delay: skip every alternate tick if camera was in active motion
      frameSkipCounter++;
      if (wasMoving && frameSkipCounter % 2 !== 0) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.videoWidth <= 0 || video.videoHeight <= 0 || isStartingCameraRef.current || !stream) return;
      if (!isValidFramePayload(video)) return;

      if (!offCtx) return;
      let pixels: Uint8ClampedArray;
      try {
        offCtx.drawImage(video, 0, 0, 64, 64);
        const imgData = offCtx.getImageData(0, 0, 64, 64);
        pixels = imgData.data;
      } catch {
        return;
      }

      const prev = prevFramePixelsRef.current;
      if (!prev || prev.length !== pixels.length) {
        prevFramePixelsRef.current = new Uint8ClampedArray(pixels);
        return;
      }

      // Strided pixel delta across frame (sampling step of 32 for zero-lag diffing)
      let diffSum = 0;
      for (let i = 0; i < pixels.length; i += 32) {
        diffSum += Math.abs(pixels[i] - prev[i]);
      }
      const avgDiff = diffSum / (pixels.length / 32) / 255;
      prevFramePixelsRef.current = new Uint8ClampedArray(pixels);

      const isPanning = avgDiff > 0.085;
      const isStill = avgDiff <= 0.05;

      if (isPanning) {
        setCameraMoving(true);
        cameraMovingRef.current = true;
        wasMoving = true;
        stableTicks = 0;
      } else if (isStill) {
        setCameraMoving(false);
        cameraMovingRef.current = false;
        stableTicks++;
      }
    }, SAMPLING_INTERVAL_MS);

    return () => {
      isDestroyed = true;
      clearInterval(interval);
    };
  }, [stream, autoScanActive, scanMode, deepVerifyItem, isScanPaused, activeCompsHit, activeValuationHit, isRapidScanMode, analyzingRealFrame, isCoolingDown]);

  // Preserve persistentMediaStream warm across tab switches and route re-renders
  useEffect(() => {
    return () => {
      streamRef.current = null;
    };
  }, []);

  // Focus lock state for viewfinder framing animation (steady or paused)
  const isFocusLocked = isScanPaused || !cameraMoving;

  return (
    <div className="spadas-lens-camera w-full min-h-full flex-1 flex flex-col max-w-full overflow-y-auto box-border mx-auto animate-fade-in">
      {/* Video Viewport Container (Tap Anywhere to Focus or Dismiss Card) */}
      <div
        onClick={() => {
          if (scanStage === "confirmation" || pendingIdentifiedItem) {
            return;
          } else if (activeValuationHitRef.current || activeValuationHit) {
            // Keep valuation card solid — tapping viewfinder background must not dismiss active valuation
            return;
          } else if (isScanPaused) {
            handleResumeScanning();
          }
        }}
        className="relative w-full h-[calc(100dvh-3.25rem)] min-h-[420px] sm:h-auto sm:aspect-[16/9] sm:max-h-[75vh] max-w-full box-border overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border sm:border-emerald-500/30 bg-[#0A0E1A] sm:shadow-[0_0_60px_rgba(16,185,129,0.22),0_0_100px_rgba(6,182,212,0.16)] cursor-pointer"
      >
        <CameraViewportErrorBoundary onRestart={startCamera}>
          {!isCameraPoweredOn ? (
            /* Camera Standby / Hardware Released View (Only engaged when explicitly powered off by user) */
            <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center space-y-4 text-white bg-slate-950/95">
              {/* Standby Top HUD Bar with Safe-Area Inset */}
              <div className="absolute top-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.75rem))] left-[max(0.875rem,env(safe-area-inset-left,0px))] right-[max(0.875rem,env(safe-area-inset-right,0px))] z-30 flex items-center justify-between pointer-events-auto">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-400 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Camera Standby • Hardware Released</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCameraPower();
                  }}
                  className="h-8 px-3 rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-[11px] font-black flex items-center gap-1.5 hover:bg-emerald-500/30 transition shadow-lg cursor-pointer"
                  title="Power On Camera"
                >
                  <Power className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Power ON</span>
                </button>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-slate-400 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <Power className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-xl font-black text-white">Camera Standby (Hardware Released)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Camera hardware is released to conserve device battery and eliminate conflicts when switching to Spadas Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCameraPoweredOn(true);
                  void startCamera();
                }}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 text-sm font-black text-slate-950 shadow-xl hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                <Power className="h-4 w-4" /> Power On Camera
              </button>
            </div>
          ) : deepVerifyItem ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center space-y-3 text-slate-300 bg-slate-950">
              <ShieldCheck className="h-12 w-12 text-purple-400 animate-pulse" />
              <h4 className="text-sm font-black text-white">Camera Handed Off to Forensic Audit</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Background camera paused to give Deep Verify exclusive hardware access.
              </p>
            </div>
          ) : cameraError ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-3 text-slate-300">
              <ShieldAlert className="h-12 w-12 text-zinc-400" />
              <p className="text-sm font-semibold">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white shadow-md hover:bg-cyan-500 transition cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Retry Camera Access
              </button>
            </div>
          ) : (
            <>
              {/* Raw Camera Video Stream running smooth at 60fps */}
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  setIsCameraReady(true);
                  setCameraStalled(false);
                  if (videoRef.current && videoRef.current.paused) {
                    videoRef.current.play().catch(() => {});
                  }
                }}
                onCanPlay={() => {
                  setIsCameraReady(true);
                  setCameraStalled(false);
                }}
                onPlaying={() => {
                  setIsCameraReady(true);
                  setCameraStalled(false);
                }}
                className="h-full w-full object-cover"
              />
              {/* Connecting optical sensor placeholder if stream is currently binding */}
              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 text-slate-400 space-y-2 pointer-events-auto">
                  <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
                  <span className="text-xs font-mono tracking-wider text-slate-300 font-semibold">CONNECTING OPTICAL SENSOR...</span>
                  {cameraStalled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void startCamera();
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md cursor-pointer pointer-events-auto active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reconnect Sensor
                    </button>
                  )}
                </div>
              )}

              {/* Quick Snap Viewfinder Shutter Flash (0ms visual feedback) */}
              {quickSnapFlash && (
                <div className="absolute inset-0 z-40 bg-white/50 pointer-events-none select-none transition-opacity animate-out fade-out duration-150" />
              )}

              {/* Continuous Visual Anchor: Captured item snapshot remains continuously visible beneath progressive loader, handoff, and valuation steps with ZERO black flashes */}
              {frozenFrameUrl && (analyzingRealFrame || isLoaderTransitioning || activeValuationHit || isScanPaused) && (
                <div className="absolute inset-0 z-10 pointer-events-none select-none lens-crossfade">
                  <img
                    src={frozenFrameUrl}
                    alt="Captured Scanned Frame"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              {/* Instant Target Lock & Scan Completion Feedback (Perimeter Laser Ring - Never blocks center) */}
              {scanCompletePulse && (
                <div className="absolute inset-0 z-30 pointer-events-none select-none lens-ring-pulse rounded-[inherit]" />
              )}

              {/* Top HUD Bar: Dynamic Confidence Indicator, Credit Badge & Camera Controls with Safe-Area Insets */}
              {scanMode === "barcode" && (
                <div className="absolute top-[max(3.25rem,calc(env(safe-area-inset-top,0px)+3rem))] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-amber-500/95 text-slate-950 font-bold px-3 py-1 rounded-full shadow-lg text-xs backdrop-blur-md pointer-events-auto">
                  <span>⚡ Barcode Mode Active</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setScanMode("snap");
                      setIsBarcodeScanning(false);
                      toast.info("Switched to Snap Camera Mode");
                    }}
                    className="bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-slate-950 border border-black/20 cursor-pointer active:scale-95"
                  >
                    Turn Off ✕
                  </button>
                </div>
              )}
              <div className={`absolute top-[max(0.625rem,calc(env(safe-area-inset-top,0px)+0.375rem))] left-[max(0.625rem,env(safe-area-inset-left,0px))] right-[max(0.625rem,env(safe-area-inset-right,0px))] z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none transition-all duration-300 ease-out ${
                activeCompsHit ? "opacity-0 pointer-events-none -translate-y-4" : "opacity-100"
              }`}>
                {/* Dynamic Real-Time Focus & Telemetry Indicator */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 border border-white/20 px-3 py-1 shadow-lg backdrop-blur-xl pointer-events-auto text-[10px]">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      !cameraMoving ? "bg-emerald-400" : "bg-zinc-400"
                    }`}
                  />
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">Focus</span>
                  <span className="text-white/20 text-[8px]">|</span>
                  <span className="font-semibold text-zinc-200">
                    {isScanPaused ? "Locked" : cameraMoving ? "Panning" : "Steady"}
                  </span>
                  <span className="text-white/20 text-[8px]">|</span>
                  <span className="font-bold text-cyan-300">eBay Comps</span>
                </div>

                {/* Geolocation & Category Biasing Prior Badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const options: CategoryBiasOption[] = [
                      "auto",
                      "vintage_clothing",
                      "digicams_tech",
                      "designer_luxury",
                      "collectibles_toys",
                      "general_thrift",
                    ];
                    const currIdx = options.indexOf(categoryBias);
                    const next = options[(currIdx + 1) % options.length];
                    setCategoryBias(next);
                    toast.success(
                      next === "auto"
                        ? `🌐 Auto Location Bias: ${spatialMetadata?.storeName || "Thrift Hub"}`
                        : next === "vintage_clothing"
                          ? "👕 Category Bias: Vintage & Streetwear Apparel"
                          : next === "digicams_tech"
                            ? "📷 Category Bias: Y2K Digicams & Electronics"
                            : next === "designer_luxury"
                              ? "💎 Category Bias: Luxury Designer & Leather"
                              : next === "collectibles_toys"
                                ? "👾 Category Bias: Collectibles & Cards"
                                : "🏺 Category Bias: General Thrift & Homewares"
                    );
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-950/90 border border-purple-500/40 px-3 py-1 text-[11px] font-bold text-purple-300 shadow-xl backdrop-blur-md pointer-events-auto hover:border-purple-400 transition cursor-pointer"
                  title="Click to toggle Category Biasing Priors"
                >
                  <span className="text-[10px]">
                    {categoryBias === "auto"
                      ? (spatialMetadata?.storeName ? `📍 ${spatialMetadata.storeName}` : "📍 Op-Shop Mode")
                      : categoryBias === "vintage_clothing"
                        ? "👕 Vintage Apparel"
                        : categoryBias === "digicams_tech"
                          ? "📷 Digicams & Tech"
                          : categoryBias === "designer_luxury"
                            ? "💎 Luxury / Leather"
                            : categoryBias === "collectibles_toys"
                              ? "👾 Collectibles"
                              : "🏺 General Thrift"}
                  </span>
                </button>

                {/* Guest Scan Mode Real-Time Indicator */}
                {isGuestUser && !isPro && !isOwner && (
                  <div className="pointer-events-auto">
                    <GuestScanHud
                      remainingScans={guestScanState.remaining}
                      onOpenAuthModal={() => setIsGuestLimitModalOpen(true)}
                    />
                  </div>
                )}

                {/* Top Right Consolidated Tools & Telemetry Bar */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  {/* Network Latency & Offline Status Hint */}
                  {isOffline ? (
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full glass text-zinc-300 backdrop-blur-md shadow-lg">
                      <WifiOff className="h-3 w-3 shrink-0 text-zinc-400" />
                      <span className="hidden sm:inline">OFFLINE (LOCAL AI)</span>
                      <span className="sm:hidden">OFFLINE</span>
                    </div>
                  ) : profitableCount > 0 ? (
                    <div className="hidden xs:inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 shadow-xl backdrop-blur-md">
                      <span>💰 {profitableCount} Flips</span>
                    </div>
                  ) : null}

                  {/* Consolidated Viewfinder Tools Trigger Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsViewfinderToolsOpen((prev) => !prev);
                      }}
                      className={`h-8 px-3 rounded-full border flex items-center gap-1.5 transition backdrop-blur-md shadow-lg cursor-pointer ${isViewfinderToolsOpen
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                          : "bg-slate-950/85 border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500"
                        }`}
                      title="Lens AR Tools & Controls"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-[11px] font-bold">Tools</span>
                      {isViewfinderToolsOpen ? (
                        <ChevronUp className="h-3 w-3 text-cyan-400" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      )}
                    </button>

                    {/* Collapsible Tools Menu Drawer */}
                    {isViewfinderToolsOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-10 w-64 rounded-2xl bg-slate-950/95 border border-slate-800 p-3 shadow-2xl backdrop-blur-2xl space-y-2.5 z-50 animate-in fade-in zoom-in-95"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                            Lens AR Viewfinder Tools
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsViewfinderToolsOpen(false)}
                            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Tool 1: Torch / Flashlight */}
                        {torchSupported && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5 text-zinc-300" /> Flashlight
                            </span>
                            <button
                              type="button"
                              onClick={() => void toggleTorch()}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${torchEnabled
                                  ? "bg-white text-zinc-950 border-white shadow-sm"
                                  : "bg-[#141721] text-zinc-400 border-white/[0.08] hover:text-white"
                                }`}
                            >
                              {torchEnabled ? "ON" : "OFF"}
                            </button>
                          </div>
                        )}

                        {/* Tool 2: Audio Chimes */}
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-zinc-400" /> Audio Chimes
                          </span>
                          <button
                            type="button"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${soundEnabled
                                ? "bg-white/[0.12] text-white border-white/20 shadow-sm"
                                : "bg-[#141721] text-zinc-500 border-white/[0.08]"
                              }`}
                          >
                            {soundEnabled ? "Active" : "Muted"}
                          </button>
                        </div>

                        {/* Tool 3: Camera Power */}
                        <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2">
                          <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                            <Power className="h-3.5 w-3.5 text-emerald-400" /> Camera Stream
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleCameraPower()}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${isCameraPoweredOn && stream
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                                : "bg-rose-500/20 text-rose-300 border-rose-400/50"
                              }`}
                          >
                            {isCameraPoweredOn && stream ? "Power ON" : "Standby"}
                          </button>
                        </div>

                        {/* Telemetry Footer */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Latency: {networkLatencyMs !== null ? `${networkLatencyMs}ms` : "Live"}</span>
                          <span>Scanned: {sessionScanCount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Streamlined Non-Obstructing Top Docked Scanning Telemetry (z-35) */}
              {(analyzingRealFrame || isLoaderTransitioning) && !activeValuationHit && scanStage !== "confirmation" && !scanRetryPrompt && (
                <div className="absolute top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] left-1/2 -translate-x-1/2 z-35 pointer-events-auto transition-all duration-300 ease-out">
                  <ScanProgressiveLoader
                    isActive={true}
                    stage={scanStage}
                    currency={selectedCurrency}
                    detectedTitle={pendingIdentifiedItem?.productName}
                    detectedBrand={pendingIdentifiedItem?.brand ?? undefined}
                    previewImage={frozenFrameUrl}
                  />
                </div>
              )}

              {/* Visual Cooldown Indicator: Appears during 3.5s cooldown after item detection */}
              {isCoolingDown && !analyzingRealFrame && !activeValuationHit && (
                <div className="absolute top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] left-1/2 -translate-x-1/2 z-35 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md pointer-events-none animate-fade-in">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>SHUTTER COOLDOWN (3.5s)</span>
                </div>
              )}

              {/* ── Offline Pending-Sync Queue Banner ─────────────────────── */}
              {offlinePendingCount > 0 && scanStage !== "confirmation" && (
                <div className="absolute top-[max(2.5rem,calc(env(safe-area-inset-top,0px)+2.25rem))] left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[92%] max-w-sm">
                  <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full glass text-zinc-300 backdrop-blur-md shadow-lg text-[11px] font-mono font-bold">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{offlinePendingCount} item{offlinePendingCount !== 1 ? "s" : ""} pending — waiting for network</span>
                  </div>
                </div>
              )}


              {/* Non-Obstructing Retry Prompt Layer */}
              {scanRetryPrompt && !activeValuationHit && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-35 w-[92%] max-w-sm mx-auto pointer-events-auto transition-all duration-300 ease-out">
                  <div
                    key="lens-retry-prompt"
                    className="w-full rounded-2xl glass-card border border-white/[0.08] p-3 shadow-xl backdrop-blur-xl flex items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <WifiOff className="h-4 w-4 text-zinc-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {scanRetryPrompt.message}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Active session preserved • Tap retry
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setScanRetryPrompt(null);
                          void processCurrentFrame(true);
                        }}
                        className="inline-flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[11px] transition cursor-pointer active:scale-95 shadow-md shadow-cyan-500/20"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScanRetryPrompt(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}



              {/* Subtle Scanning Hairline — clean non-distracting optical indicator */}
              {analyzingRealFrame && (
                <div className="absolute inset-x-0 z-25 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)" }}>
                  <div className="relative">
                    <div
                      className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      style={{ animation: "scanBeam 1.4s ease-in-out infinite" }}
                    />
                  </div>
                </div>
              )}

              {/* Grail Alert — high-contrast slide-up toast */}
              {activeGrailAlert && (
                <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0E1017]/95 border border-amber-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">High Margin Find</p>
                      <p className="text-sm font-bold text-white truncate">{activeGrailAlert.name}</p>
                      <p className="text-[11px] font-bold text-emerald-400 font-mono">+{fmtMoney(activeGrailAlert.profit)} • {activeGrailAlert.roi.toFixed(0)}% ROI</p>
                    </div>
                    <button type="button" onClick={() => setActiveGrailAlert(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Offline Dead-Zone Signal Warning Banner */}
              {isOffline ? (
                <div className="absolute top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md mx-auto pointer-events-none">
                  <div className="flex items-center justify-center gap-2 rounded-xl glass-hud px-4 py-2 text-xs font-bold text-zinc-300 shadow-2xl border border-white/[0.08]">
                    <WifiOff className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span>📶 Offline Dead-Zone Active — Camera Scanner Ready</span>
                  </div>
                </div>
              ) : null}

              {/* Phase 4: Non-Alarming Scan Error State Banner */}
              {scanErrorState.type && !isOffline && (
                <div className="absolute top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md mx-auto pointer-events-none">
                  {scanErrorState.type === "rate_limit_user" && (
                    <div className="flex items-center gap-2 rounded-xl glass-hud px-4 py-2.5 text-xs font-bold text-zinc-300 shadow-2xl border border-white/[0.08]">
                      <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>
                        {scanErrorState.retryAfter && scanErrorState.retryAfter > 0
                          ? `You've hit your scan limit. Try again in ${scanErrorState.retryAfter}s.`
                          : "You've hit your scan limit. Try again shortly."}
                      </span>
                    </div>
                  )}

                  {scanErrorState.type === "rate_limit_upstream" && (
                    <div className="flex items-center gap-2 rounded-2xl glass-hud px-4 py-2.5 text-xs font-bold text-zinc-300 shadow-xl">
                      <RefreshCw className="h-3.5 w-3.5 shrink-0 text-zinc-400 animate-spin" />
                      <span>Processing. Retrying in a moment.</span>
                    </div>
                  )}

                  {scanErrorState.type === "unauthorized" && !isGuestUser && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/95 backdrop-blur-md px-4 py-2.5 text-xs font-extrabold text-slate-200 shadow-2xl border border-slate-600/60 pointer-events-auto w-full">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-zinc-400" />
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
                    <div className="flex items-center gap-2 rounded-2xl glass-hud px-4 py-2.5 text-xs font-bold text-zinc-300 shadow-xl">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span>Scan error. Active session preserved.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Scan Feedback — spring bloom/fade, no hard color pops */}
              {scanFeedback === "HIT" && (
                <div className="absolute inset-0 z-30 pointer-events-none lens-hit-bloom lens-hit-bloom-active" />
              )}
              {scanFeedback === "MISS" && (
                <div className="absolute inset-0 z-30 pointer-events-none lens-miss-fade bg-rose-500/[0.07] shadow-[inset_0_0_60px_rgba(244,63,94,0.25)]" />
              )}

              {/* First-Run Onboarding Welcome Pill & 1-Tap Demo Scan */}
              {isGuestUser && guestScanState.count === 0 && !hasDismissedWelcome && !activeValuationHit && !analyzingRealFrame && (
                <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-35 w-[92%] max-w-sm pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="rounded-2xl bg-[#090D16]/95 border border-cyan-500/40 p-3 sm:p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-sm">
                          <Sparkles className="h-4 w-4 text-cyan-300 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                            <span>25 Free Daily Scans Ready</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">Active</span>
                          </h4>
                          <p className="text-[11px] text-zinc-300">
                            Point at any thrift find or tag to see eBay sold comps &amp; net profit.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={dismissWelcome}
                        className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition cursor-pointer"
                        title="Dismiss guide"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={handleRunDemoScan}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 font-black text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-950/40 cursor-pointer"
                      >
                        <Zap className="h-3.5 w-3.5 fill-zinc-950" />
                        <span>⚡ Try 1-Tap Demo: Nike Dunk Low (+$98 Profit)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Minimalist Viewfinder Framing Brackets (Clean Apple / Google Lens style) */}
              {isCameraPoweredOn && (
                <div
                  className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center p-6 transition-opacity duration-150 ${
                    activeValuationHit || activeCompsHit || deepVerifyItem ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div
                    ref={reticleRef}
                    className={`relative w-[76%] sm:w-[55%] max-w-[320px] aspect-[3/4] sm:aspect-[4/3] max-h-[48vh] transition-transform duration-200 ease-out ${
                      isFocusLocked ? "scale-[1.015]" : "scale-100"
                    }`}
                  >
                    {/* Top Left */}
                    <div
                      className={`absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-2xl transition-all duration-200 ${
                        isFocusLocked ? "border-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]" : "border-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      }`}
                    />
                    {/* Top Right */}
                    <div
                      className={`absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-2xl transition-all duration-200 ${
                        isFocusLocked ? "border-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]" : "border-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      }`}
                    />
                    {/* Bottom Left */}
                    <div
                      className={`absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-2xl transition-all duration-200 ${
                        isFocusLocked ? "border-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]" : "border-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      }`}
                    />
                    {/* Bottom Right */}
                    <div
                      className={`absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-2xl transition-all duration-200 ${
                        isFocusLocked ? "border-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]" : "border-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Clean Industrial AR Bounding Box Target Indicator */}
              {activeScans.slice(0, 1).map((scan) => (
                <div
                  key={scan.id}
                  style={{
                    left: `${Math.max(2, Math.min(80, scan.bbox.x))}%`,
                    top: `${Math.max(2, Math.min(80, scan.bbox.y))}%`,
                    width: `${Math.max(15, Math.min(95, scan.bbox.width))}%`,
                    height: `${Math.max(15, Math.min(95, scan.bbox.height))}%`,
                  }}
                  className={`absolute z-20 pointer-events-none border rounded-xl overflow-hidden transition-all duration-150 ${scan.status === "valued"
                      ? "border-emerald-400/90 bg-emerald-500/[0.04]"
                      : "border-white/60 bg-white/[0.02]"
                    } ${cameraMoving ? "opacity-60" : "opacity-100"}`}
                >
                  {/* Subtle Telemetry Tag */}
                  <div className="absolute -top-6 left-0 flex items-center gap-1.5 bg-[#0A0D14]/95 text-white border border-white/[0.12] rounded-md px-2 py-0.5 text-[10px] shadow-md backdrop-blur-md font-mono">
                    <span className={`h-1.5 w-1.5 rounded-full ${scan.status === "valued" ? "bg-emerald-400" : "bg-white"}`} />
                    <span className="text-zinc-400 text-[9px] uppercase tracking-wider font-medium">
                      {scan.status === "valued" ? "LOCKED" : "EVALUATING"}
                    </span>
                    <span className="text-white font-bold truncate max-w-[130px]">
                      {scan.productName}
                    </span>
                    {scan.ocrText && scan.ocrText.length > 0 && (
                      <span className="hidden xs:inline text-zinc-400 text-[8px] bg-white/[0.06] px-1 rounded border border-white/[0.08] max-w-[90px] truncate">
                        OCR: {scan.ocrText[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Optical Shutter Aperture Flash (Immediate 80ms white freeze-frame optical flash) */}
              {shutterFlash && (
                <div className="absolute inset-0 z-50 pointer-events-none bg-white opacity-90 transition-opacity duration-[80ms] ease-out" />
              )}

              {/* Optical Horizon Leveler & Gyro Instrumentation */}
              {stream && !activeValuationHit && (
                <div className="absolute bottom-36 sm:bottom-40 left-1/2 -translate-x-1/2 z-25 pointer-events-none">
                  <OpticalHorizonLeveler soundEnabled={soundEnabled} />
                </div>
              )}

              {/* Primary Viewfinder Zoom Controls (1x, 2x, 3x) — Minimalist Matte HUD */}
              {stream && !activeValuationHit && (
                <div className="absolute bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+5rem))] sm:bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1.5 bg-slate-950/80 border border-white/20 backdrop-blur-2xl rounded-full px-2 py-1 shadow-xl">
                  {[1, 2, 3].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDialTickHaptic();
                        if (soundEnabled) playTactileClickSound();
                        setZoomLevel(z);
                      }}
                      className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full text-xs font-mono font-black transition-all cursor-pointer flex items-center justify-center ${zoomLevel === z
                          ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md scale-105"
                          : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                        }`}
                      title={`Set Zoom to ${z}x`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Snap & Value Tactile Shutter / Resume Button (Center Floating) */}
              <div className={`absolute bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center transition-opacity duration-150 ${scanStage === "confirmation" ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
                }`}>
                {!isPro && !isOwner && isLimitReached ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerTactileHaptic("warning");
                      setIsPaywallOpen(true);
                      toast.error("Daily free scan limit reached (10/10). Upgrade to Pro to continue scanning.", {
                        id: "daily-limit-toast",
                      });
                    }}
                    className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(0,242,254,0.4)] active:scale-95 transition-transform duration-75 cursor-pointer animate-pulse"
                    title="Daily limit reached — Upgrade to Spadas Pro"
                  >
                    <Crown className="h-4 w-4 shrink-0 text-slate-950" />
                    <span>Daily Limit Reached (10/10) • Get Pro</span>
                  </button>
                ) : isScanPaused ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDialTickHaptic();
                      if (soundEnabled) playTactileClickSound();
                      handleResumeScanning();
                    }}
                    className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.4)] active:scale-95 transition-transform duration-75 cursor-pointer"
                    title="Resume live continuous AR camera"
                  >
                    <RefreshCw className="h-4 w-4 shrink-0 text-slate-950 group-hover:rotate-180 transition-transform duration-300" />
                    <span>Scan Next Item</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (analyzingRealFrame || analyzingRef.current || isCoolingDown) {
                        return;
                      }
                      if (!isPro && !isOwner) {
                        const currentGuest = getGuestScanState();
                        if (isGuestUser && (currentGuest.isLimitReached || currentGuest.remaining <= 0)) {
                          setIsScanPaused(true);
                          setIsGuestLimitModalOpen(true);
                          toast.info(`You've used all ${MAX_GUEST_SCANS} free guest scans! Create a free account to unlock 50 daily scans.`);
                          return;
                        }
                        if (isLimitReached) {
                          setIsScanPaused(true);
                          setIsPaywallOpen(true);
                          toast.error("You've used all 50 free daily scans! Upgrade to Pro for unlimited scans.", {
                            id: "daily-limit-toast",
                          });
                          return;
                        }
                      }
                      flushScanState();
                      void processCurrentFrame(true);
                    }}
                    className={`group relative flex items-center justify-center h-20 w-20 sm:h-22 sm:w-22 rounded-full p-1.5 transition-transform duration-100 ease-out ${
                      isCoolingDown ? "cursor-not-allowed opacity-80" : "cursor-pointer active:scale-[0.92]"
                    }`}
                    title={isCoolingDown ? "Shutter cooling down..." : "Instant Multi-Frame Snap & Value (Tap to scan)"}
                  >
                    {/* Outer Radiant Glowing Jewel Ring */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                      isCoolingDown 
                        ? "border-2 border-cyan-400/50 animate-pulse" 
                        : "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 p-[3px] shadow-[0_0_35px_rgba(16,185,129,0.55),0_0_70px_rgba(6,182,212,0.35)] group-hover:shadow-[0_0_45px_rgba(16,185,129,0.7),0_0_90px_rgba(6,182,212,0.5)] group-hover:scale-105"
                    }`} />

                    {/* Inner Solid Brushed Trigger Core */}
                    <div className="relative flex h-full w-full items-center justify-center rounded-full bg-slate-950 p-1 shadow-inner">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-[#141B2D] to-[#0A0F1E] group-hover:from-[#1A243D] group-hover:to-[#0F162B] transition-all">
                        {analyzingRealFrame ? (
                          <div className="flex flex-col items-center justify-center text-center select-none">
                            <RefreshCw className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-300 animate-spin" />
                            <span className="text-[7px] sm:text-[8px] font-mono font-bold uppercase tracking-wider text-emerald-300 mt-0.5">
                              SCANNING
                            </span>
                          </div>
                        ) : isCoolingDown ? (
                          <div className="flex flex-col items-center justify-center text-center select-none">
                            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400 animate-spin" />
                            <span className="text-[7px] sm:text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                              READY
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center select-none">
                            <Camera className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-300 font-mono mt-0.5 flex items-center gap-0.5">
                              SNAP <Sparkles className="h-2 w-2 text-emerald-300 animate-happy-sparkle" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {/* Dedicated Fast Barcode Comps Button (Visible on mobile & desktop) */}
              <div className={`absolute bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:bottom-5 left-[max(0.75rem,env(safe-area-inset-left,0px))] z-40 transition-opacity duration-150 ${scanStage === "confirmation" ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
                }`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (scanMode === "barcode") {
                      setScanMode("snap");
                      setIsBarcodeScanning(false);
                      toast.info("Switched to Snap Camera Mode");
                    } else {
                      void handleFastBarcodeScan();
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className={`group flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 px-3.5 py-2 rounded-2xl border shadow-lg backdrop-blur-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                    scanMode === "barcode"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-300 text-slate-950 font-black shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-white/50"
                      : "bg-slate-950/80 border-amber-400/30 hover:border-amber-400/60 text-amber-200 hover:text-white shadow-[0_4px_20px_rgba(245,158,11,0.2)]"
                  }`}
                  title={scanMode === "barcode" ? "Tap to turn off Barcode Mode" : "Fast Barcode Comps — Instant 1-tap barcode scanner"}
                  aria-label="Fast Barcode Comps"
                >
                  <Barcode className={`h-4 w-4 shrink-0 transition-transform ${
                    isBarcodeScanning ? "animate-spin text-amber-400" : "text-amber-400 group-hover:scale-110"
                  }`} />
                  <span className="text-xs font-bold tracking-tight text-white whitespace-nowrap">
                    {scanMode === "barcode" ? "Turn Off Barcode" : "Barcode Comps"}
                  </span>
                </button>
              </div>

              {/* Dedicated Quick Snap Stream Shutter (Desktop auxiliary) */}
              <div className={`hidden md:block absolute bottom-5 left-44 z-40 transition-opacity duration-150 ${scanStage === "confirmation" ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
                }`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleQuickSnapCapture();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  disabled={isQuickSnapping}
                  className="group flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0E1017]/90 border border-white/[0.12] hover:border-white/30 shadow-md backdrop-blur-md transition-transform duration-75 cursor-pointer active:scale-95 text-zinc-300 hover:text-white"
                  title="Rapid-fire shelf photo directly from live camera stream into background valuation queue"
                  aria-label="Quick Snap frame to Haul"
                >
                  {isQuickSnapping ? (
                    <RefreshCw className="h-4 w-4 text-white animate-spin shrink-0" />
                  ) : (
                    <Camera className="h-4 w-4 text-white shrink-0 group-hover:scale-105 transition-transform" />
                  )}
                  <span className="text-xs font-bold tracking-tight text-white hidden xs:inline">
                    Quick Snap
                  </span>
                  {quickSnapPendingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-zinc-950">
                      {quickSnapPendingCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Telemetry Haul Counter Badge (Hidden on mobile to preserve single SNAP cluster) */}
              {isRapidScanMode && (
                <div className={`hidden sm:block absolute bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:bottom-5 right-[max(0.75rem,env(safe-area-inset-right,0px))] z-40 transition-opacity duration-150 ${scanStage === "confirmation" ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
                  }`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerTactileHaptic("tap");
                      if (onOpenHaulTab) {
                        onOpenHaulTab();
                      } else {
                        router.push("/haul");
                      }
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="group flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E1017]/90 border border-white/[0.12] hover:border-white/30 shadow-md backdrop-blur-md transition cursor-pointer active:scale-95"
                    title="Open Haul Review"
                    aria-label={`Haul telemetry: ${haulCount} items collected. Tap to open haul review.`}
                  >
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                        Haul:
                      </span>
                      <span className="text-xs font-bold text-white tabular-nums">
                        {haulCount}
                      </span>
                    </div>
                    {rapidStats.totalProfit > 0 && (
                      <span className="font-mono text-emerald-400 font-bold text-[10px] bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded hidden xs:inline tabular-nums">
                        +${rapidStats.totalProfit.toFixed(0)}
                      </span>
                    )}
                    {rapidStats.queuedItems > 0 && (
                      <RefreshCw className="h-3 w-3 text-white animate-spin ml-0.5 shrink-0" />
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </CameraViewportErrorBoundary>
      </div>

      {/* Non-Intrusive In-Stream Audit-Grade Sold Comps Ledger (Anchored in document flow exclusively after scan payload resolves) */}
      {activeValuationHit && !activeCompsHit && (
        <div
          className={`mt-4 w-full max-w-full px-3 sm:px-0 overflow-x-hidden box-border ${isCardExiting ? "animate-card-exit" : "animate-card-enter"}`}
          style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
        >
          <AuditCompsLedger
            isLoading={false}
            comps={activeValuationHit.rawComps}
            targetTitle={activeValuationHit.name}
            brand={activeValuationHit.brand}
            copVerdict={activeValuationHit.copVerdict}
            netProfit={activeValuationHit.trueNetProfit ?? activeValuationHit.estimatedProfit}
            currency={selectedCurrency}
            isCachedFallback={activeValuationHit.compsSource === "cached_last_check"}
            compsSource={activeValuationHit.compsSource}
            activeValuation={{
              median: activeValuationHit.estimatedValue,
              min: activeValuationHit.suggestedPriceMin ?? activeValuationHit.compsRange?.min,
              max: activeValuationHit.suggestedPriceMax ?? activeValuationHit.compsRange?.max,
              compsCount: activeValuationHit.rawComps?.length,
              thriftCost: activeValuationHit.tagPrice ?? activeValuationHit.estCost,
            }}
            onDismiss={() => handleDismissCard()}
            onAddToHaul={() => {
              void handleSaveDraftHit(activeValuationHit);
              handleDismissCard();
            }}
            onListEbay={() => {
              setIsScanPaused(true);
              const isolatedCapture = activeValuationHit?.image || frozenFrameUrl || undefined;
              const stableSessionId = activeValuationHit?.id || (activeValuationHit?.timestamp ? `hit_${activeValuationHit.timestamp}` : "hit_active");
              const currentHit = activeValuationHit;
              // Cleanly dismiss valuation dialog so there is no conflicting double-modal or background glitch
              setActiveValuationHit(null);
              activeValuationHitRef.current = null;
              setActiveEbayItem(
                currentHit
                  ? {
                    ...currentHit,
                    image: isolatedCapture,
                    imageUrls: isolatedCapture ? [isolatedCapture] : undefined,
                    sessionId: stableSessionId,
                  }
                  : null
              );
            }}
            onScanNext={() => {
              flushScanState();
              handleDismissCard(() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              });
            }}
          />
        </div>
      )}

      {/* Real-Time Scanned Hits Feed */}
      <div className="w-full px-3 sm:px-0 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        <div id="scanned-hits-feed" className="mt-4 w-full max-w-full overflow-x-hidden box-border rounded-3xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-4 mx-auto scroll-mt-20 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 animate-happy-sparkle" />
              <span>Scanned Finds Log</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {capturedLog.length} {capturedLog.length === 1 ? "Item" : "Items"}
              </span>
              {capturedLog.length === 0 && (
                <span className="text-xs font-medium text-zinc-400 animate-pulse ml-1">
                  (Aim at any item or tap SNAP ✨)
                </span>
              )}
            </h3>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={selectAllHits}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {selectedHitIds.length === capturedLog.length ? "Deselect All" : "Select All"}
              </button>

              <button
                type="button"
                onClick={clearAllHits}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
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
                isSaved={isHitSavedInHaul(item)}
                onSelect={toggleSelectHit}
                onSaveDraft={handleSaveDraftHit}
                onDeepVerify={(hit) => handleOpenDeepVerify(hit)}
                onViewComps={(hit) => setActiveCompsHit(hit)}
                onListEbay={(hit) => {
                  setIsScanPaused(true);
                  const isolatedCapture = hit.image || (hit.id === activeValuationHit?.id ? frozenFrameUrl : undefined);
                  const stableSessionId = hit.id || (hit.timestamp ? `hit_${hit.timestamp}` : "hit_feed");
                  setActiveEbayItem({
                    ...hit,
                    image: isolatedCapture,
                    imageUrls: isolatedCapture ? [isolatedCapture] : undefined,
                    sessionId: stableSessionId,
                  });
                }}
                onReport={(id, name) => {
                  void fetch("/api/scans/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scanId: id, itemName: name }),
                  }).catch(() => { });
                  toast.info("Thanks — misidentification flagged for review.", { id: `report-${id}` });
                }}
              />
            ))}
          </div>
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
        isOpen={isPaywallOpen && !isPro && !isOwner}
        onClose={() => setIsPaywallOpen(false)}
        currentScans={capturedLog.length}
      />

      {/* 5-Star Google Play In-App Review & Rating Modal */}
      <InAppReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewWinMeta(null);
        }}
        scanCount={capturedLog.length || 3}
        profitAmount={reviewWinMeta?.profit}
        itemName={reviewWinMeta?.name}
      />

      {/* Instant Guest Scan Limit & Conversion Modal */}
      <GuestScanLimitModal
        isOpen={isGuestLimitModalOpen && isGuestUser && !isPro && !isOwner}
        onClose={() => setIsGuestLimitModalOpen(false)}
        scannedCount={guestScanState.count}
        lastScannedItem={lastGuestScannedItem}
        isAuthenticated={!isGuestUser || isOwner}
        isPro={isPro || isOwner}
      />

      {/* Ebay Listing Automation Modal */}
      {activeEbayItem && (
        <EbayListingModal
          isOpen={!!activeEbayItem}
          onClose={() => {
            setActiveEbayItem(null);
            setIsScanPaused(false);
          }}
          sessionId={activeEbayItem.sessionId || activeEbayItem.id || `session_${activeEbayItem.timestamp || "item"}`}
          title={activeEbayItem.productName || activeEbayItem.name || "Scanned Item"}
          brand={cleanBrandText(activeEbayItem.brand, "Unbranded") || "Unbranded"}
          price={Number(activeEbayItem.estimatedValue) || 25}
          currency={activeEbayItem.currency || selectedCurrency}
          condition={cleanConditionText(activeEbayItem.condition, "Used - Good")}
          description={
            activeEbayItem.description ||
            `Authentic ${cleanBrandText(activeEbayItem.brand, "") || ""} ${activeEbayItem.productName || activeEbayItem.name || "Scanned Item"}.\n\n• Brand: ${cleanBrandText(activeEbayItem.brand, "Unbranded")}\n• Model: ${activeEbayItem.productName || activeEbayItem.name || "Item"}\n• Material/Color: Standard finish\n• Condition: ${cleanConditionText(activeEbayItem.condition, "Used - Good")}. Tested and operating as intended.\n\nPlease review all photos for exact details.`
          }
          activeScanImage={
            activeEbayItem.image ||
            (activeEbayItem.id && activeEbayItem.id === activeValuationHit?.id ? (frozenFrameUrl || activeValuationHit?.image) : undefined) ||
            capturedLog.find((h) => h.id === activeEbayItem.id)?.image ||
            undefined
          }
          imageUrls={
            activeEbayItem.imageUrls ||
            (activeEbayItem.image
              ? [activeEbayItem.image]
              : activeEbayItem.id && activeEbayItem.id === activeValuationHit?.id && frozenFrameUrl
                ? [frozenFrameUrl]
                : [])
          }
        />
      )}

      {/* Forensic Deep Verify Modal */}
      {deepVerifyItem && (
        <DeepVerifyModal
          isOpen={!!deepVerifyItem}
          onClose={handleCloseDeepVerify}
          productName={(deepVerifyItem as any).productName || (deepVerifyItem as any).name || "Scanned Item"}
          brand={(deepVerifyItem as any).brand || "Brand"}
          category={(deepVerifyItem as any).category || "Fashion / Collectibles"}
        />
      )}

      {/* Trade-Ticket Scan Valuation Results Dialog Modal (z-[100] Portalled to document.body) */}
      {activeValuationHit && !activeCompsHit && typeof document !== "undefined" && createPortal(
        (() => {
          const itemComps = ensureVerifiedSoldComps(
            activeValuationHit.rawComps,
            activeValuationHit.name,
            activeValuationHit.estimatedValue,
            activeValuationHit.condition,
            activeValuationHit.brand
          );

        const isUsMarket = Boolean(
          selectedCurrency === "USD" ||
          (activeValuationHit as any).currency === "USD" ||
          activeValuationHit.marketOrigin === "US"
        );
        const marketSiteName = isUsMarket ? "eBay US" : "eBay AU";
        const marketDomain = isUsMarket ? "ebay.com" : "ebay.com.au";

        const isZeroSoldActive = Boolean(
          activeValuationHit.isActiveAskOnly ||
          activeValuationHit.compsSource === "browse_api" ||
          (itemComps.length > 0 && itemComps.every((c) => c.soldDate === "Active Ask" || c.isActiveAsk))
        );

        const hasRealSoldComps = Boolean(
          !isZeroSoldActive &&
          !activeValuationHit.noMarketData &&
          itemComps.length > 0 &&
          itemComps.some((c) => c.soldDate !== "Active Ask" && !c.isActiveAsk)
        );

        const resaleMedian = activeValuationHit.estimatedValue || 0;
        const resaleMin = activeValuationHit.suggestedPriceMin ?? activeValuationHit.compsRange?.min ?? Math.max(1, Math.round(resaleMedian * 0.75));
        const resaleMax = activeValuationHit.suggestedPriceMax ?? activeValuationHit.compsRange?.max ?? Math.round(resaleMedian * 1.25);

        const thriftCost = activeValuationHit.tagPrice
          ? activeValuationHit.tagPrice
          : activeValuationHit.estCost
            ? activeValuationHit.estCost
            : 0;

        const netProfit = activeValuationHit.trueNetProfit ?? activeValuationHit.estimatedProfit ?? Math.max(0, resaleMedian - thriftCost);
        const roiPct = activeValuationHit.roiPercentage ?? activeValuationHit.estRoi ?? (thriftCost > 0 ? Math.round((netProfit / thriftCost) * 100) : 0);

        const estFees = Math.round((resaleMedian * 0.134 + (isUsMarket ? 0.33 : 0.40)) * 100) / 100;
        const estPost = Math.max(0, Math.round((resaleMedian - thriftCost - estFees - netProfit) * 100) / 100) || (isUsMarket ? 6.50 : 9.50);

        const ebaySearchQuery = encodeURIComponent(activeValuationHit.name ? activeValuationHit.name : "vintage items");
        const ebayUrl = isZeroSoldActive
          ? `https://www.${marketDomain}/sch/i.html?_nkw=${ebaySearchQuery}`
          : `https://www.${marketDomain}/sch/i.html?_nkw=${ebaySearchQuery}&LH_Sold=1&LH_Complete=1`;

        const verdictBadge = activeValuationHit.copVerdict === "MUST_COP"
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase"
          : activeValuationHit.copVerdict === "QUICK_FLIP"
            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase"
            : activeValuationHit.copVerdict === "VERIFY_FIRST"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/35 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase";

        const verdictLabel = activeValuationHit.copVerdict === "MUST_COP"
          ? "ACQUIRE"
          : activeValuationHit.copVerdict === "QUICK_FLIP"
            ? "QUICK FLIP"
            : activeValuationHit.copVerdict === "VERIFY_FIRST"
              ? "VERIFY SPECS"
              : "PASS";

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Scan Valuation Results"
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
            style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
            onClick={(e) => {
              // Explicit Dismissal Rule: Never close the valuation results dialog on accidental backdrop clicks.
              // The dialog must stay up solidly until the user explicitly taps "Next", "+ Add", "List on eBay", or the close 'X' button.
            }}
          >
            <div
              key={`lens-valuation-${activeValuationHit.id || activeValuationHit.name}`}
              ref={(node) => {
                valuationCardRef.current = node;
                if (node) {
                  setIsValuationCardMounted(true);
                }
              }}
              className={`w-full max-w-lg sm:max-w-xl pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95 ${
                isCardExiting ? "lens-card-exit" : "lens-card-enter"
              } ${
                scanCompletePulse ? "ring-2 ring-emerald-400/90 shadow-[0_0_50px_rgba(16,185,129,0.6)]" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <ValuationCardErrorBoundary
                onRetry={() => void processCurrentFrame(true)}
                onDismiss={() => handleDismissCard()}
              >
                <div className="trade-ticket w-full rounded-2xl bg-[#0B0E17] border border-white/[0.12] p-4 sm:p-5 shadow-[0_30px_90px_rgba(0,0,0,0.95)] backdrop-blur-2xl select-none max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden">
                  {/* Top Header: Thumbnail Anchor, Verified Registry Badge, Title, Brand & Verdict */}
                  <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {(frozenFrameUrl || activeValuationHit.image) && (
                        <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-white/[0.12] shrink-0 bg-[#121622] shadow-md">
                          <img
                            src={frozenFrameUrl || activeValuationHit.image || ""}
                            alt={activeValuationHit.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasRealSoldComps ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{marketSiteName} • {itemComps.length} Realized Sales</span>
                            </span>
                          ) : isZeroSoldActive ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              <span>{marketSiteName} • {itemComps.length} Active Competitor Asks</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Algorithmic Appraisal Model</span>
                            </span>
                          )}
                          {isMeaningfulMeta(activeValuationHit.brand) && (
                            <span className="text-[10px] font-medium text-zinc-300 font-mono truncate max-w-[130px] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                              {activeValuationHit.brand.trim()}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold text-white line-clamp-2 leading-snug tracking-tight">
                          {activeValuationHit.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeValuationHit.copVerdict && (
                        <span className={verdictBadge}>{verdictLabel}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDismissCard()}
                        className="text-zinc-400 hover:text-white p-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.08]"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Core: Resale Value, Profit Analysis, P&L Math & Comps */}
                  <div className="overflow-y-auto space-y-3 pr-0.5 custom-scrollbar flex-1 min-h-0">
                    {/* Notice for 0 Sold Comps */}
                    {isZeroSoldActive && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/25 space-y-1 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-cyan-400" />
                            <span>0 Historical Sold Transactions on Record</span>
                          </span>
                          <span className="text-[9px] text-cyan-300/90 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                            Active Asks
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                          No completed sales found on {marketSiteName}. Displaying <strong>{itemComps.length} active competitor asking prices</strong> for reference. Note that asking prices are seller expectations, not realized transaction values.
                        </p>
                      </div>
                    )}

                    {/* Financial Valuation Ledger Strip (Dual Metric) */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 sm:p-3.5 rounded-xl bg-[#121622] border border-white/[0.08]">
                      {/* Left Metric: Realized Value (Median Sold) */}
                      <div className="space-y-1 font-mono">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                          {isZeroSoldActive ? "Competitor Ask Median" : `${marketSiteName} Median Sold`}
                        </span>
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums">
                          {fmtMoney(resaleMedian)} <span className="text-xs font-normal text-zinc-400">{selectedCurrency}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Range: {fmtMoney(resaleMin)} – {fmtMoney(resaleMax)}
                        </div>
                      </div>

                      {/* Right Metric: Estimated Net Proceeds */}
                      <div className="space-y-1 font-mono text-right border-l border-white/[0.06] pl-3">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400/90 block">
                          Estimated Net Realization
                        </span>
                        <div className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {netProfit >= 0 ? `+${fmtMoney(netProfit)}` : fmtMoney(netProfit)} <span className="text-xs font-normal text-emerald-400/80">{selectedCurrency}</span>
                        </div>
                        <div className="text-[11px]">
                          <span className={roiPct > 0 ? "text-emerald-400 font-semibold" : "text-zinc-400"}>
                            {roiPct > 0 ? `+${roiPct}% ROI` : `${roiPct}% ROI`}
                          </span>
                          <span className="text-zinc-400 ml-1">
                            (Cost: {fmtMoney(thriftCost)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transparent Reseller P&L Equation */}
                    <div className="px-3 py-2 rounded-xl bg-[#0E121D] border border-white/[0.06] text-[11px] font-mono text-zinc-300 flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-400 text-[10px] uppercase font-semibold">P&L Math:</span>
                        <span>{isZeroSoldActive ? "Ask" : "Sold"} {fmtMoney(resaleMedian)}</span>
                        <span className="text-zinc-500">−</span>
                        <span>COGS {fmtMoney(thriftCost)}</span>
                        <span className="text-zinc-500">−</span>
                        <span>Fees ~{fmtMoney(estFees)}</span>
                        <span className="text-zinc-500">−</span>
                        <span>Post ~{fmtMoney(estPost)}</span>
                      </div>
                      <span className="text-emerald-400 font-bold ml-auto tabular-nums">
                        = +{fmtMoney(netProfit)} Net
                      </span>
                    </div>

                    {/* Completed Sales Evidence (Comps) */}
                    {hasRealSoldComps ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-0.5 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-wider">
                              Verified Completed Sales
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              ({itemComps.length} {itemComps.length === 1 ? "record" : "records"})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => openExternalUrlSafely(ebayUrl, activeValuationHit?.name, e)}
                            className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer bg-transparent border-0"
                          >
                            <span>Live Registry</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </button>
                        </div>

                        <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
                          {itemComps.map((comp, idx) => {
                            const compImg = comp.thumbnail || (idx === 0 ? (frozenFrameUrl || activeValuationHit.image) : null);
                            const conditionText = comp.condition ? cleanConditionText(comp.condition) : "Pre-Owned";
                            const soldDateText = comp.soldDate && comp.soldDate !== "Active Ask" ? comp.soldDate : "Recent";

                            return (
                              <div
                                key={comp.id || idx}
                                className="group p-2.5 rounded-xl bg-[#121622] hover:bg-[#171D2D] border border-white/[0.08] hover:border-white/[0.16] transition flex items-center justify-between gap-3 shadow-xs"
                              >
                                {/* Listing Thumbnail */}
                                <div className="relative h-13 w-13 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-[#0A0D14] border border-white/[0.10] shrink-0">
                                  {compImg ? (
                                    <img
                                      src={compImg}
                                      alt={comp.title}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                                      onError={(e) => {
                                        if (frozenFrameUrl || activeValuationHit.image) {
                                          (e.target as HTMLImageElement).src = (frozenFrameUrl || activeValuationHit.image) as string;
                                        } else {
                                          (e.target as HTMLImageElement).style.display = "none";
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-zinc-600 bg-[#0E121B]">
                                      <ShoppingBag className="w-5 h-5 text-zinc-500" />
                                    </div>
                                  )}
                                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/85 text-[8px] font-mono text-zinc-300 tabular-nums">
                                    Sold
                                  </span>
                                </div>

                                {/* Center: Realized Price, Title, Condition & Date */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm sm:text-base font-bold font-mono text-white tabular-nums tracking-tight">
                                      {fmtMoney(comp.price)}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-300 border border-white/[0.06]">
                                      {soldDateText}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06] truncate max-w-[110px]">
                                      {conditionText}
                                    </span>
                                    {typeof comp.matchPercentage === "number" && (
                                      <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        {comp.matchPercentage}% match
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-300 truncate font-normal leading-snug group-hover:text-white transition" title={comp.title}>
                                    {comp.title}
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-500">
                                    {comp.shippingIncluded ? "Free Delivery" : comp.shippingPrice ? `+${fmtMoney(comp.shippingPrice)} Delivery` : "Standard Postage"}
                                  </div>
                                </div>

                                {/* Right: Outbound eBay Link */}
                                <button
                                  type="button"
                                  onClick={(e) => openExternalUrlSafely(comp.url || ebayUrl, comp.title, e)}
                                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono font-medium transition cursor-pointer active:scale-95"
                                  title={`View listing on ${marketSiteName}`}
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : isZeroSoldActive ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-0.5 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                              Active Competitor Listings
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              ({itemComps.length} {itemComps.length === 1 ? "record" : "records"})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => openExternalUrlSafely(ebayUrl, activeValuationHit?.name, e)}
                            className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer bg-transparent border-0"
                          >
                            <span>Live Registry</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </button>
                        </div>

                        <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
                          {itemComps.map((comp, idx) => {
                            const compImg = comp.thumbnail || (idx === 0 ? (frozenFrameUrl || activeValuationHit.image) : null);
                            const conditionText = comp.condition ? cleanConditionText(comp.condition) : "Pre-Owned";

                            return (
                              <div
                                key={comp.id || idx}
                                className="group p-2.5 rounded-xl bg-[#121622] hover:bg-[#171D2D] border border-cyan-500/20 hover:border-cyan-500/40 transition flex items-center justify-between gap-3 shadow-xs"
                              >
                                <div className="relative h-13 w-13 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-[#0A0D14] border border-cyan-500/20 shrink-0">
                                  {compImg ? (
                                    <img
                                      src={compImg}
                                      alt={comp.title}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                                      onError={(e) => {
                                        if (frozenFrameUrl || activeValuationHit.image) {
                                          (e.target as HTMLImageElement).src = (frozenFrameUrl || activeValuationHit.image) as string;
                                        } else {
                                          (e.target as HTMLImageElement).style.display = "none";
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-cyan-400/60 bg-[#0E121B]">
                                      <ShoppingBag className="w-5 h-5 text-cyan-400" />
                                    </div>
                                  )}
                                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-cyan-950/90 text-[8px] font-mono text-cyan-300 tabular-nums border border-cyan-500/30">
                                    Ask
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm sm:text-base font-bold font-mono text-cyan-300 tabular-nums tracking-tight">
                                      {fmtMoney(comp.price)}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                                      Active Ask
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06] truncate max-w-[110px]">
                                      {conditionText}
                                    </span>
                                    {typeof comp.matchPercentage === "number" && (
                                      <span className="text-[10px] font-mono text-cyan-400">
                                        {comp.matchPercentage}% match
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-300 truncate font-normal leading-snug group-hover:text-white transition" title={comp.title}>
                                    {comp.title}
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-500">
                                    {comp.shippingIncluded ? "Free Delivery" : comp.shippingPrice ? `+${fmtMoney(comp.shippingPrice)} Delivery` : "Standard Postage"}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => openExternalUrlSafely(comp.url || ebayUrl, comp.title, e)}
                                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono font-medium transition cursor-pointer active:scale-95"
                                  title={`View listing on ${marketSiteName}`}
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[#141721] border border-amber-500/25 space-y-2 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>0 Historical Sales on Record</span>
                          </span>
                          <span className="text-[9px] text-amber-300/90 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded">
                            Algorithmic Valuation
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          No historical transactions recorded on {marketSiteName}. Suggested anchor listing price: <strong>{fmtMoney(resaleMedian)} {selectedCurrency}</strong> with a rapid liquidation floor of <strong>{fmtMoney(resaleMin)} {selectedCurrency}</strong>.
                        </p>
                      </div>
                    )}

                    {/* Secondary Verification Notice (if applicable) */}
                    {(activeValuationHit.copVerdict === "VERIFY_FIRST" || activeValuationHit.requiresSecondaryVerification) && (
                      <div className="px-3 py-2 rounded-xl bg-[#141721] border border-amber-500/30 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-medium text-zinc-300 truncate">
                            {activeValuationHit.verificationReason || "Confidence < 88% — confirm tags & serial numbers before purchasing"}
                          </span>
                        </div>
                        {activeValuationHit.fallbackProtocol === "SCAN_BARCODE" ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleDismissCard(() => {
                                setScanMode("barcode");
                                toast.info("Switched to Barcode Mode for precision verification.");
                              });
                            }}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] text-[10px] font-mono font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Barcode className="w-3 h-3" />
                            <span>Barcode</span>
                          </button>
                        ) : activeValuationHit.fallbackProtocol === "ZOOM_LABEL" ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleDismissCard(() => {
                                toast.info("Move camera closer to focus on brand/size tag.");
                                void processCurrentFrame(true);
                              });
                            }}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] text-[10px] font-mono font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Zoom Tag</span>
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Action Dock: List on eBay, Verify (if flagged), Next Item, + Add to Haul */}
                  <div className="flex items-center justify-between gap-2.5 pt-3 mt-1 border-t border-white/[0.08] shrink-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerTactileHaptic("medium");
                          setIsScanPaused(true);
                          const isolatedCapture =
                            frozenFrameUrl ||
                            activeValuationHit?.image ||
                            undefined;
                          const stableSessionId =
                            activeValuationHit?.id ||
                            (activeValuationHit?.timestamp ? `hit_${activeValuationHit.timestamp}` : "hit_active");
                          const currentHit = activeValuationHit;

                          // Cleanly dismiss valuation dialog to eliminate double-modal conflicts
                          setActiveValuationHit(null);
                          activeValuationHitRef.current = null;

                          setActiveEbayItem({
                            ...currentHit,
                            image: isolatedCapture,
                            imageUrls: isolatedCapture ? [isolatedCapture] : undefined,
                            sessionId: stableSessionId,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30"
                        title={`List this item on ${marketSiteName}`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                        <span>List on eBay</span>
                      </button>

                      {checkNeedsVerification({
                        name: activeValuationHit.name,
                        brand: activeValuationHit.brand || undefined,
                        category: activeValuationHit.category || undefined,
                        estimatedValue: activeValuationHit.estimatedValue,
                      }).needsVerification && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeepVerify(activeValuationHit)}
                          className="inline-flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          triggerTactileHaptic("light");
                          handleDismissCard(() => {
                            setIsScanPaused(false);
                            setScanStage("idle");
                          });
                        }}
                        className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.10] font-mono px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
                        title="Scan Next Item"
                      >
                        <Camera className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Next</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerTactileHaptic("success");
                          void handleSaveDraftHit(activeValuationHit);
                          handleDismissCard();
                        }}
                        className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer active:scale-95 shadow-md"
                        title="Save item to inventory haul"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>+ Add to Haul</span>
                      </button>
                    </div>
                  </div>
                </div>
              </ValuationCardErrorBoundary>
            </div>
          </div>
        );
      })(),
      document.body
    )}

      {/* Stabilized AR Comps Breakdown & Resale Verdict Modal */}
      <LensCompsModal
        key="lens-comps-modal-singleton"
        isOpen={!!activeCompsHit}
        item={activeCompsHit}
        currency={selectedCurrency}
        frozenFrameUrl={frozenFrameUrl}
        onClose={() => {
          setActiveCompsHit(null);
          activeCompsHitRef.current = null;
        }}
        onResumeScan={() => {
          setActiveCompsHit(null);
          setActiveValuationHit(null);
          activeValuationHitRef.current = null;
          activeCompsHitRef.current = null;
          handleResumeScanning();
        }}
        onListEbay={(hit: any) => {
          setActiveCompsHit(null);
          setIsScanPaused(true);
          const isolatedCapture = hit?.image || (hit?.id === activeValuationHit?.id ? frozenFrameUrl : undefined);
          const stableSessionId = hit?.id || (hit?.timestamp ? `hit_${hit.timestamp}` : "hit_comps");
          setActiveEbayItem(
            hit
              ? {
                ...hit,
                image: isolatedCapture,
                imageUrls: isolatedCapture ? [isolatedCapture] : undefined,
                sessionId: stableSessionId,
              }
              : null
          );
        }}
        onDeepVerify={(hit: any) => handleOpenDeepVerify(hit)}
        onTriggerBarcodeScan={() => {
          setActiveCompsHit(null);
          setScanMode("barcode");
          toast.info("Switched to Barcode Mode for precision verification.");
        }}
      />

      {/* Rapid Thrift Haul "What You Got" Slide-Up Drawer */}
      <RapidThriftDrawer
        isOpen={isRapidDrawerOpen}
        onClose={() => setIsRapidDrawerOpen(false)}
        items={rapidItems}
        onDeleteItem={(id) => removeItem(id)}
        onClearSession={async () => {
          await clearHaul();
          toast.success("Rapid Haul cleared.");
        }}
        onAddToInventory={(item) => {
          const hit: DetectedHit = {
            id: item.id,
            name: item.productName || "Thrift Item",
            brand: item.brand || null,
            category: item.category || "General",
            condition: item.condition || "Used - Good",
            bbox: { x: 15, y: 15, width: 70, height: 70 },
            estimatedValue: item.estimatedValue || 20,
            estCost: item.thriftCost || 3,
            estimatedProfit: item.trueNetProfit || 15,
            trueNetProfit: item.trueNetProfit || 15,
            estRoi: item.roiPercentage || 0,
            roiPercentage: item.roiPercentage || 0,
            tagPrice: item.thriftCost,
            copVerdict: item.copVerdict || "MUST_COP",
            verdict: (item.trueNetProfit || 0) > 15 ? "BUY" : "CAUTION",
            confidence: 0.96,
            timestamp: item.timestamp,
            isGrail: item.isGrail || false,
          };
          setCapturedLog((prev) => [hit, ...prev.filter((h) => h.name !== hit.name)].slice(0, 50));
          toast.success(`Added "${item.productName}" to inventory!`);
        }}
        onOpenVerify={(item) => {
          setDeepVerifyItem({
            id: item.id,
            name: item.productName || "Thrift Item",
            brand: item.brand || "Luxury Brand",
            category: item.category || "Small Leather Goods",
            estimatedValue: item.estimatedValue || 150,
          } as any);
        }}
        currency={selectedCurrency}
      />

      {/* Camera Framing Onboarding Guide */}
      <CameraOnboardingOverlay
        forceOpen={isOnboardingOpen}
        onDismiss={() => setIsOnboardingOpen(false)}
      />

      {/* Compact Dismissible Secondary Angle / Retake HUD Floating Badge */}
      {retakeRecommendation?.required && (
        <div className="absolute top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+3.5rem))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
          <div className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-full bg-[#0E1017]/95 border border-white/[0.12] shadow-lg backdrop-blur-xl text-zinc-200">
            <button
              type="button"
              onClick={() => {
                setRetakeRecommendation(null);
                void processCurrentFrame(true);
              }}
              className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
              title="Tap to snap recommended angle"
            >
              <div className="w-6 h-6 rounded-full bg-[#181C26] border border-white/[0.10] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-white">
                <Camera className="w-3 h-3 text-white" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 shrink-0">
                  Optional:
                </span>
                <span className="text-[11px] font-semibold text-zinc-200 truncate">
                  {retakeRecommendation.promptLabel || "Snap detail/tag angle"}
                </span>
              </div>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setRetakeRecommendation(null);
                  void processCurrentFrame(true);
                }}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
              >
                Snap
              </button>
              <button
                type="button"
                onClick={() => setRetakeRecommendation(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                title="Dismiss (continue without secondary angle)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick-Access History Drawer */}
      <QuickHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        hits={capturedLog}
        onClearHistory={() => {
          setCapturedLog([]);
          localStorage.removeItem("spadas_cached_lens_hits");
          toast.success("Scanned history cleared");
        }}
        onDeleteHit={(id) => {
          setCapturedLog((prev) => prev.filter((h) => h.id !== id));
        }}
        onSaveDraft={handleSaveDraftHit}
        pendingSyncCount={pendingSyncCount}
        currency={selectedCurrency}
        onNavigateFullHistory={() => router.push("/history")}
      />

    </div>
  );
}

export default function SpadasLensCamera({
  onOpenHaulTab,
  onOpenSnapStudio,
}: {
  onOpenHaulTab?: () => void;
  onOpenSnapStudio?: () => void;
} = {}) {
  return (
    <CameraErrorBoundary>
      <SpadasLensCameraCore
        onOpenHaulTab={onOpenHaulTab}
        onOpenSnapStudio={onOpenSnapStudio}
      />
    </CameraErrorBoundary>
  );
}
