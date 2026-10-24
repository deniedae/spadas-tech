"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Sparkles, X, Image as ImageIcon, Zap, ShieldCheck, ChevronRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SpadasListingDetailsSheet, SpadasListingData } from "@/components/spadas-listing-details-sheet";
import { calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { triggerTactileHaptic, syncProfitToAndroidWidget } from "@/lib/android-bridge";
import { detectGeoCurrency } from "@/app/lib/currency-routing";
import { supabase } from "@/app/lib/supabase";
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
import { processFrameForVision, compressFileToDataUrl } from "@/lib/image-preprocessor";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { ScanProgressiveLoader } from "@/components/scan-progressive-loader";
import { haulStore } from "@/lib/haul-store";
import { RapidThriftItem, dataUriToBlob, savePhotoBlob } from "@/lib/rapid-thrift-engine";
import { cameraStreamManager } from "@/lib/camera-stream-provider";
import { isValidFramePayload } from "@/lib/lens-utils";

export interface AngleSlot {
  id: string;
  name: string;
  short: string;
  hint: string;
  badge: string;
}

export const SPADAS_ANGLE_SLOTS: AngleSlot[] = [
  { id: "front", name: "Front / Cover", short: "Front", hint: "Frame entire front silhouette of item", badge: "Cover" },
  { id: "back", name: "Back / Reverse", short: "Back", hint: "Show back of garment or item condition", badge: "Back" },
  { id: "tag", name: "Brand Tag / Plaque", short: "Tag / Plaque", hint: "Close-up of logo, plaque, care tag, or serial", badge: "Tag / Plaque" },
  { id: "detail", name: "Details / Material", short: "Details", hint: "Focus on texture, stitching, or flaws", badge: "Details" },
  { id: "extra", name: "Extra / Packaging", short: "Extra", hint: "Boxes, accessories, interior, or labels", badge: "Extra" },
];
export const SELLRAZE_ANGLE_SLOTS = SPADAS_ANGLE_SLOTS;

export function SpadasSnapStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const capturedPhotos = slots.filter((p): p is string => Boolean(p && p.length > 2000));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<"vision" | "comps" | "profit" | "complete">("vision");
  const [detectedTitle, setDetectedTitle] = useState<string | undefined>(undefined);
  const [detectedBrand, setDetectedBrand] = useState<string | undefined>(undefined);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [listingResult, setListingResult] = useState<SpadasListingData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [retakePrompt, setRetakePrompt] = useState<{
    required: boolean;
    angleType: string;
    reason: string;
    promptLabel: string;
  } | null>(null);

  // User Auth & Subscription State
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
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
  const [sessionScanCount, setSessionScanCount] = useState<number>(0);
  const [guestScanState, setGuestScanState] = useState<GuestScanState>(() => getGuestScanState());
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);
  const [lastScannedItem, setLastScannedItem] = useState<any>(null);

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

  // Reliable Non-Blocking Supabase Auth & Subscription Check on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
          const isUserAdmin = isOwnerEmail(user.email);
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
            setIsGuestModalOpen(false);
            if (isUserAdmin) {
              setIsOwner(true);
              setIsPro(true);
            }
          }

          const token = session.access_token;
          const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

          const [usageRes, billingRes] = await Promise.all([
            fetch("/api/usage", { headers }).catch(() => null),
            fetch("/api/billing/status", { headers }).catch(() => null),
          ]);

          let proStatus = isUserAdmin;

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
          }

          if (isMounted) {
            setIsGuestUser(false);
            setIsPro(proStatus);
            if (proStatus) {
              setIsGuestModalOpen(false);
            }
          }
        } else {
          if (isMounted) {
            setIsGuestUser(true);
            setIsPro(false);
            setIsOwner(false);
            setGuestScanState(getGuestScanState());
          }
        }
      } catch (err) {
        console.warn("[Snap Studio] Auth check error:", err);
      }
    }

    void checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const isUserAdmin = isOwnerEmail(session.user.email);
        resetGuestScanState();
        setIsGuestUser(false);
        setGuestScanState({
          count: 0,
          remaining: 9999,
          isLimitReached: false,
          firstScanAt: null,
          lastScanAt: null,
        });
        setIsGuestModalOpen(false);
        if (isUserAdmin) {
          setIsOwner(true);
          setIsPro(true);
        }
      } else {
        setIsGuestUser(true);
        setIsPro(false);
        setIsOwner(false);
        setGuestScanState(getGuestScanState());
      }
    });

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("checkout") === "success") {
        toast.success("Welcome to Spadas Pro! Unlimited scans unlocked.", { duration: 6000 });
        setIsGuestUser(false);
        setIsPro(true);
        setIsGuestModalOpen(false);
        window.history.replaceState({}, "", "/snap");
      } else if (urlParams.get("checkout") === "canceled") {
        toast.info("Checkout was canceled. Your photos and drafts are saved.", { duration: 4000 });
        window.history.replaceState({}, "", "/snap");
      }
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Stop Camera Stream (Releases camera ownership through unified provider)
  const stopCamera = useCallback(() => {
    cameraStreamManager.releaseCamera("studio");
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start Camera Stream via Unified Camera Stream Manager
  const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
    try {
      setCameraError(null);
      const newStream = await cameraStreamManager.acquireCamera({
        mode: "studio",
        facingMode: mode,
      });

      streamRef.current = newStream;
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        void videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("[Snap Studio] Physical camera access unavailable:", err);
      setCameraError("Camera unavailable or permission denied. You can still upload photos below.");
    }
  }, [facingMode]);

  useEffect(() => {
    void startCamera();
    return () => {
      // Release camera ownership for Snap Studio through unified manager
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
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
        void node.play().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      void videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    void startCamera(nextMode);
  };

  // Capture Photo into Targeted Angle Slot
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;
    if (!isValidFramePayload(video)) return;

    let dataUrl: string | null = null;
    try {
      const preprocessed = processFrameForVision(video, { boostContrast: true, maxDimension: 850, quality: 0.75 });
      dataUrl = preprocessed.fullDataUrl;
    } catch (err) {
      console.warn("[Snap Studio] Preprocessing fallback:", err);
      const fullW = video.videoWidth || video.clientWidth || 640;
      const fullH = video.videoHeight || video.clientHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(850, fullW);
      canvas.height = Math.round((fullH * canvas.width) / fullW);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, fullW, fullH, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    }

    if (dataUrl && dataUrl.length > 2000) {
      const targetSlot = activeSlotIndex >= 0 && activeSlotIndex < SPADAS_ANGLE_SLOTS.length ? activeSlotIndex : 0;
      setSlots((prev) => {
        const next = [...prev];
        next[targetSlot] = dataUrl;
        return next;
      });
      setRetakePrompt(null);
      triggerTactileHaptic("shutter");
      toast.success(`${SPADAS_ANGLE_SLOTS[targetSlot].short} captured!`, { duration: 1200 });

      // Advance to next empty angle slot
      const nextEmpty = slots.findIndex((s, i) => i > targetSlot && !s);
      if (nextEmpty !== -1) {
        setActiveSlotIndex(nextEmpty);
      } else {
        const anyEmpty = slots.findIndex((s, i) => i !== targetSlot && !s);
        if (anyEmpty !== -1) {
          setActiveSlotIndex(anyEmpty);
        }
      }
    }
  };

  // Handle File Upload from Gallery into Angle Slots
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast.info("Compressing photos...", { duration: 1200 });
    const compressed = await Promise.all(
      Array.from(files).slice(0, 5).map((file) => compressFileToDataUrl(file, { maxDimension: 850, quality: 0.75 }))
    );

    const validCompressed = compressed.filter((url) => url && url.length > 2000);
    if (validCompressed.length > 0) {
      setSlots((prev) => {
        const next = [...prev];
        let fileIdx = 0;
        // First fill from activeSlotIndex if empty
        for (let i = activeSlotIndex; i < next.length && fileIdx < validCompressed.length; i++) {
          if (!next[i]) {
            next[i] = validCompressed[fileIdx++];
          }
        }
        // Then fill remaining empty slots
        for (let i = 0; i < next.length && fileIdx < validCompressed.length; i++) {
          if (!next[i]) {
            next[i] = validCompressed[fileIdx++];
          }
        }
        // Overwrite if needed
        for (let i = 0; i < next.length && fileIdx < validCompressed.length; i++) {
          next[i] = validCompressed[fileIdx++];
        }
        return next;
      });
      toast.success(`Assigned ${validCompressed.length} photo(s) into angle slots!`);
    }
  };

  const removeSlotPhoto = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setActiveSlotIndex(index);
    toast.info(`Cleared ${SPADAS_ANGLE_SLOTS[index].short} slot.`);
  };

  // Analyze Multi-Photo Payloads
  const handleAnalyzeItem = async () => {
    if (capturedPhotos.length === 0) {
      toast.error("Please take or upload at least 1 photo of the item.");
      return;
    }

    // Live session check to prevent authenticated users from ever triggering guest limit
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    const isAuthed = Boolean(currentUser);
    const isUserAdmin = isOwnerEmail(currentUser?.email);

    if (isAuthed) {
      setIsGuestUser(false);
      if (isUserAdmin || isPro) {
        setIsGuestModalOpen(false);
      }
    }

    const currentGuestState = getGuestScanState();
    if (!isAuthed && !isUserAdmin && !isPro && (currentGuestState.isLimitReached || currentGuestState.remaining <= 0)) {
      setIsGuestModalOpen(true);
      toast.info(`You've used all ${MAX_GUEST_SCANS} free instant guest scans! Upgrade to Pro for unlimited scanning.`);
      return;
    }

    setAnalysisStage("vision");
    setDetectedTitle(undefined);
    setDetectedBrand(undefined);
    setIsAnalyzing(true);
    toast.info("🔍 AI identifying item, extracting tags, and finding eBay comps...", { duration: 3000 });

    try {
      const activeCurrency =
        detectGeoCurrency().currency;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/ai-listing", {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageUrls: capturedPhotos,
          currency: activeCurrency,
          mode: "deep",
          isArScan: true,
          isGuestScan: !isAuthed && isGuestUser,
          stream: true,
        }),
      });

      let data: any = null;
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if ((contentType.includes("application/x-ndjson") || contentType.includes("text/event-stream")) && res.body) {
          try {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let isStreamFinished = false;

            while (!isStreamFinished) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                let trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith("data: ")) {
                  trimmed = trimmed.replace(/^data:\s*/, "").trim();
                }
                if (!trimmed || trimmed === "[DONE]") continue;

                try {
                  const chunk = JSON.parse(trimmed);
                  if (chunk.event === "valuation_ready") {
                    const valData = chunk.data || chunk;
                    const rawPName = valData.product_name || valData.analysis?.product_name || "";
                    if (rawPName) {
                      setDetectedTitle(rawPName);
                      setDetectedBrand(valData.brand || valData.analysis?.brand || "Authentic");
                      setAnalysisStage("profit");
                    }
                    data = valData;
                  } else if (chunk.event === "listing_complete") {
                    const listingData = chunk.data || chunk;
                    if (data) {
                      data = { ...data, ...listingData };
                    }
                  } else if (chunk.event === "vision_complete") {
                    const rawPName = chunk.product_name || chunk.analysis?.product_name || "";
                    if (rawPName) {
                      setAnalysisStage("comps");
                      setDetectedTitle(rawPName);
                      setDetectedBrand(chunk.brand || chunk.analysis?.brand || "Authentic");
                    }
                  } else if (chunk.event === "complete") {
                    data = chunk.data;
                    isStreamFinished = true;
                    break;
                  } else if (!chunk.event) {
                    data = chunk;
                    isStreamFinished = true;
                    break;
                  }
                } catch {}
              }
            }

            if (!data && buffer.trim()) {
              try {
                let trimmed = buffer.trim();
                if (trimmed.startsWith("data: ")) {
                  trimmed = trimmed.replace(/^data:\s*/, "").trim();
                }
                const chunk = JSON.parse(trimmed);
                if (chunk.event === "complete") data = chunk.data;
                else if (chunk.event === "valuation_ready") data = chunk.data || chunk;
                else if (!chunk.event) data = chunk;
              } catch {}
            }

            try {
              void reader.cancel();
            } catch {}
          } catch (streamErr) {
            console.warn("[Snap Studio] Error reading stream:", streamErr);
          }
        }

        if (!data) {
          data = await res.json().catch(() => null);
        }
      }

      if (data) {
        const rec = data?.retake_recommended || data?.analysis?.retake_recommended;
        if (rec?.required) {
          setRetakePrompt({
            required: true,
            angleType: rec.angle_type || "tag",
            reason: rec.reason || "Secondary angle needed for accurate valuation",
            promptLabel: rec.prompt_label || "📸 Snap Collar Tag or Hardware Detail for Verified Comps",
          });
          toast.warning(rec.prompt_label || "📸 Snap a secondary angle (fabric, tag, or hardware) for verified comps!", {
            duration: 6000,
          });
        } else {
          setRetakePrompt(null);
        }

        const rawPName =
          data?.analysis?.product_name ||
          data?.detected_objects?.[0]?.product_name ||
          data?.product_name ||
          "Resale Find";

        const sizeVal = data?.item_specifics?.Size || data?.item_specifics?.size || "One Size";
        const condVal = data?.analysis?.condition || "Pre-owned - Like New";
          const descVal =
          data?.detailed_description ||
          data?.seo_description ||
          `${rawPName} in ${condVal} condition. Fast dispatch from Australia.`;

        const priceMed = Number(data?.suggested_price_median) || 45;
        const itemCat = data?.analysis?.category || data?.category || "General Resale";
        const confidenceScore = Number(data?.analysis?.confidence_score ?? data?.confidence_score ?? 0.95);
        const requiresSecondaryVerification = Boolean(
          data?.requires_secondary_verification ||
          data?.retake_recommended?.required ||
          data?.analysis?.retake_recommended?.required
        );
        const cop = calculateThriftCopVerdict({
          resalePrice: priceMed,
          category: itemCat,
          productName: rawPName,
          brand: data?.analysis?.brand || data?.brand || "Unbranded",
          confidenceScore,
          variantAudit: data?.variant_audit,
          needsVerification: requiresSecondaryVerification,
        });

        const valuationState: SpadasListingData["valuationState"] = requiresSecondaryVerification
          ? "VERIFY_FIRST"
          : data?.no_market_data
            ? "NO_MARKET_DATA"
            : data?.is_active_ask || data?.comps_source === "browse_api"
              ? "ACTIVE_ASKS_ONLY"
              : "VERIFIED_SOLD_COMPS";

        const valuationDetail = requiresSecondaryVerification
          ? data?.verification_reason || rec?.reason || "Take a secondary angle, tag, barcode, or detail shot before trusting this valuation."
          : data?.no_market_data
            ? "No solid sold evidence was found for this item. Treat this price as guidance only."
            : data?.is_active_ask || data?.comps_source === "browse_api"
              ? "This value is grounded by current asking prices, not completed sold listings."
              : "This value is grounded by recent sold listings after marketplace cleanup and filtering.";

        const listingPayload: SpadasListingData = {
          productName: rawPName,
          brand: data?.analysis?.brand || data?.brand || "Unbranded",
          category: itemCat,
          condition: condVal,
          size: sizeVal,
          description: descVal,
          weight: data?.shipping_estimate?.estimated_weight_grams
            ? `${data.shipping_estimate.estimated_weight_grams}g / ${Math.round(data.shipping_estimate.estimated_weight_grams * 0.035274)} oz`
            : "12 oz / 340g",
          dimensions: data?.shipping_estimate?.dimensions_cm
            ? `${data.shipping_estimate.dimensions_cm.length} x ${data.shipping_estimate.dimensions_cm.width} x ${data.shipping_estimate.dimensions_cm.height} cm`
            : "4 x 4 x 10 in",
          priceMedian: priceMed,
          priceMin: data?.suggested_price_min || Math.round(priceMed * 0.75),
          priceMax: data?.suggested_price_max || Math.round(priceMed * 1.25),
          currency: data?.suggested_price_currency || "USD",
          photos: capturedPhotos,
          buyCost: cop.estimatedThriftCost,
          trueNetProfit: cop.netProfit,
          roiPercentage: cop.roiPercentage,
          copVerdict: cop.copVerdict,
          valuationState,
          valuationDetail,
          ebayCompsCount: Number(data?.ebay_comps_count) || 0,
          activeCompsCount: Number(data?.active_comps_count) || 0,
          rawComps: data?.raw_sold_comps || data?.rawComps || [],
        };

        if (!isAuthed && !isPro && !isUserAdmin) {
          const nextState = recordGuestScan();
          setGuestScanState(nextState);
          setSessionScanCount((prev) => prev + 1);
          saveGuestScannedItem(listingPayload);
          setLastScannedItem(listingPayload);
          if (nextState.isLimitReached) {
            setTimeout(() => {
              setIsGuestModalOpen(true);
            }, 3000);
          }
        }

        // Auto-commit to Spadas Haul lot store
        const snapPhotoId = `snap_photo_${Date.now()}`;
        const haulItem: RapidThriftItem = {
          id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          photoId: snapPhotoId,
          timestamp: Date.now(),
          status: "completed",
          productName: listingPayload.productName,
          brand: listingPayload.brand,
          category: listingPayload.category,
          condition: listingPayload.condition,
          estimatedValue: listingPayload.priceMedian,
          thriftCost: listingPayload.buyCost,
          trueNetProfit: listingPayload.trueNetProfit,
          roiPercentage: listingPayload.roiPercentage,
          copVerdict: listingPayload.copVerdict,
          isGrail: (listingPayload.trueNetProfit || 0) >= 50 || listingPayload.copVerdict === "MUST_COP",
        };
        haulStore.addItem(haulItem);

        if (capturedPhotos[0]) {
          try {
            const blob = dataUriToBlob(capturedPhotos[0]);
            void savePhotoBlob(snapPhotoId, blob);
          } catch {}
        }

        triggerTactileHaptic(cop.copVerdict === "MUST_COP" ? "grail" : "success");
        setListingResult(listingPayload);
        toast.success(`${cop.verdictLabel}: +$${cop.netProfit.toFixed(0)} Net Profit. Added to Haul.`);
      } else {
        toast.error("Could not analyze item. Please try another shot.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to analyze photos.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage("vision");
      setDetectedTitle(undefined);
      setDetectedBrand(undefined);
    }
  };

  if (listingResult) {
    return (
      <SpadasListingDetailsSheet
        data={listingResult}
        onBack={() => setListingResult(null)}
        onSaved={() => {
          setListingResult(null);
          setSlots([null, null, null, null, null]);
          setActiveSlotIndex(0);
        }}
      />
    );
  }

  return (
    <div className="relative h-[calc(100dvh-3.25rem)] min-h-[420px] sm:h-auto sm:aspect-[16/9] w-full bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header Navigation */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-3 bg-zinc-950/80 border-b border-zinc-900">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {isGuestUser && !isPro && !isOwner ? (
            <GuestScanHud
              remainingScans={guestScanState.remaining}
              onOpenAuthModal={() => setIsGuestModalOpen(true)}
            />
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs font-black text-white tracking-tight">
                  Snap to List
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                  Studio Snap
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {capturedPhotos.length} of 5 angles captured
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCameraFacing}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          title="Switch camera"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      {/* Viewport Frame Container */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-black">
        {stream ? (
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="p-8 text-center space-y-3 max-w-xs">
            <Camera className="h-10 w-10 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-400">{cameraError || "Initializing camera stream..."}</p>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs hover:bg-zinc-700 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry camera</span>
            </button>
          </div>
        )}

        {/* Framing Corner Brackets */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
          <div className="relative w-full h-full max-w-[340px] max-h-[460px] pointer-events-none">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-zinc-500 rounded-tl-md" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-zinc-500 rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-zinc-500 rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-zinc-500 rounded-br-md" />
          </div>
        </div>

        {/* Active Angle Target Banner — Multi-Angle Guidance */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-25 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-950/90 border border-zinc-700/80 shadow-2xl backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  Angle {activeSlotIndex + 1}/5
                </span>
                <span className="text-xs font-extrabold text-white truncate">
                  {SPADAS_ANGLE_SLOTS[activeSlotIndex]?.name}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 truncate">
                {SPADAS_ANGLE_SLOTS[activeSlotIndex]?.hint}
              </p>
            </div>
          </div>
        </div>

        {/* Retake Prompt Badge */}
        {retakePrompt?.required && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md pointer-events-auto">
            <div className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs shadow-2xl backdrop-blur-md">
              <span className="truncate font-semibold text-amber-200">
                {retakePrompt.promptLabel || "Snap detail or tag angle"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSlotIndex(2); // Jump to Tag/Plaque slot
                    handleSnapPhoto();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition cursor-pointer shadow"
                >
                  Snap Tag
                </button>
                <button
                  type="button"
                  onClick={() => setRetakePrompt(null)}
                  className="p-1 rounded-md text-amber-400 hover:text-white transition cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruction Badge */}
        <div className="absolute bottom-4 inset-x-4 z-20 pointer-events-none text-center">
          <div className="inline-block rounded-md bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 max-w-sm">
            <p className="text-xs font-medium text-zinc-300">
              {capturedPhotos.length === 0
                ? "Tap shutter to snap Cover photo"
                : capturedPhotos.length >= 5
                ? "All 5 angles captured · Ready to value & list"
                : `${capturedPhotos.length} captured · Next: ${SPADAS_ANGLE_SLOTS[activeSlotIndex]?.short}`}
            </p>
          </div>
        </div>

        {/* Progressive Loading Telemetry */}
        {isAnalyzing && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-35 pointer-events-auto transition-all duration-300 ease-out">
            <ScanProgressiveLoader
              isActive={isAnalyzing}
              stage={analysisStage}
              detectedTitle={detectedTitle}
              detectedBrand={detectedBrand}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Stage */}
      <div className="w-full bg-zinc-950 border-t border-zinc-800 p-3 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] space-y-2.5 z-30">
        {/* Quick Angle Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar px-1">
          {SPADAS_ANGLE_SLOTS.map((slot, idx) => {
            const isFilled = Boolean(slots[idx]);
            const isTarget = activeSlotIndex === idx;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  triggerTactileHaptic("selection");
                  setActiveSlotIndex(idx);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isTarget
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md ring-1 ring-white/60 font-black"
                    : isFilled
                    ? "bg-zinc-800/90 text-emerald-400 border border-emerald-500/40"
                    : "bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {isFilled ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[9px] font-mono opacity-70">#{idx + 1}</span>
                )}
                <span>{slot.short}</span>
              </button>
            );
          })}
        </div>

        {/* Guided Photo Slots Grid/Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar min-h-[72px] px-1">
          {SPADAS_ANGLE_SLOTS.map((slot, idx) => {
            const photoUrl = slots[idx];
            const isTarget = activeSlotIndex === idx;

            if (photoUrl) {
              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    triggerTactileHaptic("tap");
                    setActiveSlotIndex(idx);
                  }}
                  className={`relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer bg-zinc-900 ${
                    isTarget ? "ring-2 ring-emerald-400 border-transparent shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "border-zinc-800"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt={slot.name} className="h-full w-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-black tracking-tight text-center text-zinc-200 py-0.5 truncate px-0.5">
                    {slot.badge}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerTactileHaptic("light");
                      removeSlotPhoto(idx);
                    }}
                    className="absolute top-0 right-0 h-6 w-6 rounded-bl-lg bg-black/80 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
                    title={`Remove ${slot.short}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  triggerTactileHaptic("selection");
                  setActiveSlotIndex(idx);
                }}
                className={`h-16 w-16 shrink-0 rounded-xl border border-dashed flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  isTarget
                    ? "border-emerald-400 bg-emerald-950/20 text-emerald-300 ring-2 ring-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <Camera className={`w-3.5 h-3.5 ${isTarget ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
                <span className="text-[9px] font-bold tracking-tight text-center line-clamp-1 px-0.5">
                  +{slot.short}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shutter & Actions Bar */}
        <div className="flex items-center justify-between gap-3 px-1 pt-0.5">
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("tap");
              fileInputRef.current?.click();
            }}
            className="flex h-11 items-center gap-1.5 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-semibold"
          >
            <ImageIcon className="h-4 w-4 text-zinc-400" />
            <span>Upload</span>
          </button>

          {/* Shutter Button — Center Focal Point */}
          <button
            type="button"
            onClick={handleSnapPhoto}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/80 bg-zinc-950 p-1 active:scale-90 transition-transform cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            title={`Snap ${SPADAS_ANGLE_SLOTS[activeSlotIndex]?.short}`}
          >
            <div className="h-full w-full rounded-full bg-gradient-to-tr from-white via-zinc-100 to-zinc-300 flex items-center justify-center shadow-inner">
              <Camera className="h-5 w-5 text-zinc-950" />
            </div>
          </button>

          {/* Value / Process Action Button */}
          {capturedPhotos.length > 0 ? (
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => {
                triggerTactileHaptic("medium");
                void handleAnalyzeItem();
              }}
              className="inline-flex h-11 items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.45)] transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Valuing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-slate-950 fill-slate-950" />
                  <span>List ({capturedPhotos.length})</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                toggleCameraFacing();
              }}
              className="flex h-11 items-center gap-1.5 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-medium"
            >
              <RefreshCw className="h-4 w-4 text-zinc-400" />
              <span>Rotate</span>
            </button>
          )}
        </div>
      </div>

      {/* Instant Guest Scan Limit & Conversion Modal */}
      <GuestScanLimitModal
        isOpen={isGuestModalOpen && isGuestUser && !isPro && !isOwner}
        onClose={() => setIsGuestModalOpen(false)}
        scannedCount={guestScanState.count}
        lastScannedItem={lastScannedItem}
        isAuthenticated={!isGuestUser || isOwner}
        isPro={isPro || isOwner}
      />
    </div>
  );
}
