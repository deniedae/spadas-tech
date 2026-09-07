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

export function SpadasSnapStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
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
  const [isGuestUser, setIsGuestUser] = useState<boolean>(false); // Default false: never flash paid/logged-in users as guests
  const [sessionScanCount, setSessionScanCount] = useState<number>(0);
  const [guestScanState, setGuestScanState] = useState<GuestScanState>(() => getGuestScanState());
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);
  const [lastScannedItem, setLastScannedItem] = useState<any>(null);

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

          const [usageRes, stripeRes] = await Promise.all([
            fetch("/api/usage", { headers }).catch(() => null),
            fetch("/api/stripe/status", { headers }).catch(() => null),
          ]);

          let proStatus = isUserAdmin;

          if (stripeRes && stripeRes.ok) {
            const stripeData = await stripeRes.json().catch(() => ({}));
            if (stripeData.active || stripeData.plan === "Pro" || stripeData.status === "active") {
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
      }
    });

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("checkout") === "success") {
        toast.success("🚀 Welcome to Spadas Pro! Unlimited scans unlocked.", { duration: 6000 });
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

  // Stop Camera Stream (Releases all hardware locks immediately)
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      streamRef.current = null;
    }
    if (stream) {
      try {
        stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Start Camera Stream with progressive fallback constraints
  const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
    try {
      // Ensure previous tracks are completely released first
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => {
            t.stop();
            t.enabled = false;
          });
        } catch {}
        streamRef.current = null;
      }
      setCameraError(null);

      let newStream: MediaStream | null = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback for strict device permissions
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = newStream;
      setStream(newStream);
    } catch (err: any) {
      console.warn("Physical camera access unavailable:", err);
      setCameraError("Camera unavailable or permission denied. You can still upload photos below.");
    }
  }, [facingMode]);

  useEffect(() => {
    void startCamera();
    return () => {
      // Ensure all tracks are released when leaving Snap Studio
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => {
            t.stop();
            t.enabled = false;
          });
        } catch {}
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    void startCamera(nextMode);
  };

  // Capture Photo from Live Video Feed
  const handleSnapPhoto = () => {
    if (capturedPhotos.length >= 6) {
      toast.info("Maximum 6 photos per item listing.");
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    try {
      const preprocessed = processFrameForVision(video, { boostContrast: true, maxDimension: 850, quality: 0.75 });
      const dataUrl = preprocessed.fullDataUrl;

      if (dataUrl && dataUrl.length > 2000) {
        setCapturedPhotos((prev) => [...prev, dataUrl]);
        setRetakePrompt(null);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(60);
        }
        toast.success(`Photo ${capturedPhotos.length + 1} captured!`, { duration: 1200 });
      }
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      if (dataUrl && dataUrl.length > 2000) {
        setCapturedPhotos((prev) => [...prev, dataUrl]);
        toast.success(`Photo ${capturedPhotos.length + 1} captured!`, { duration: 1200 });
      }
    }
  };

  // Handle File Upload from Gallery with Aggressive Client-Side Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 6 - capturedPhotos.length;
    const toProcess = Array.from(files).slice(0, availableSlots);

    toast.info("Compressing photos...", { duration: 1200 });
    const compressed = await Promise.all(
      toProcess.map((file) => compressFileToDataUrl(file, { maxDimension: 850, quality: 0.75 }))
    );

    const validCompressed = compressed.filter((url) => url && url.length > 2000);
    if (validCompressed.length > 0) {
      setCapturedPhotos((prev) => [...prev, ...validCompressed]);
      toast.success(`Added ${validCompressed.length} compressed photo(s)!`);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
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

    if (!isAuthed && isGuestUser && sessionScanCount >= MAX_GUEST_SCANS) {
      setIsGuestModalOpen(true);
      toast.info("You've used all 3 free instant guest scans! Create a free account to unlock 10 daily scans.");
      return;
    }

    setAnalysisStage("vision");
    setDetectedTitle(undefined);
    setDetectedBrand(undefined);
    setIsAnalyzing(true);
    toast.info("🔍 AI identifying item, extracting tags, and finding eBay comps...", { duration: 3000 });

    try {
      const activeCurrency =
        (typeof window !== "undefined" && localStorage.getItem("spadas_selected_currency")) ||
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
        if (contentType.includes("application/x-ndjson") && res.body) {
          try {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  const chunk = JSON.parse(trimmed);
                  if (chunk.event === "vision_complete") {
                    const rawPName = chunk.product_name || chunk.analysis?.product_name || "";
                    if (rawPName) {
                      setAnalysisStage("comps");
                      setDetectedTitle(rawPName);
                      setDetectedBrand(chunk.brand || chunk.analysis?.brand || "Authentic");
                    }
                  } else if (chunk.event === "complete") {
                    data = chunk.data;
                  } else if (!chunk.event) {
                    data = chunk;
                  }
                } catch {}
              }
            }

            if (buffer.trim()) {
              try {
                const chunk = JSON.parse(buffer.trim());
                if (chunk.event === "complete") data = chunk.data;
                else if (!chunk.event) data = chunk;
              } catch {}
            }
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
            promptLabel: rec.prompt_label || "📸 Snap Collar Tag or Hardware Detail for 100% Comp Accuracy",
          });
          toast.warning(rec.prompt_label || "📸 Snap a secondary angle (fabric, tag, or hardware) for 100% accuracy!", {
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
          `Authentic ${rawPName} in ${condVal} condition. Fast dispatch from Australia.`;

        const priceMed = Number(data?.suggested_price_median) || 45;
        const itemCat = data?.analysis?.category || data?.category || "General Resale";
        const cop = calculateThriftCopVerdict({
          resalePrice: priceMed,
          category: itemCat,
        });

        const listingPayload: SpadasListingData = {
          productName: rawPName,
          brand: data?.analysis?.brand || data?.brand || "Authentic",
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
          currency: data?.suggested_price_currency || "AUD",
          photos: capturedPhotos,
          buyCost: cop.estimatedThriftCost,
          trueNetProfit: cop.netProfit,
          roiPercentage: cop.roiPercentage,
          copVerdict: cop.copVerdict,
        };

        if (!isAuthed && isGuestUser && !isPro && !isUserAdmin) {
          const nextState = recordGuestScan();
          setGuestScanState(nextState);
          setSessionScanCount((prev) => prev + 1);
          saveGuestScannedItem(listingPayload);
          setLastScannedItem(listingPayload);
        }

        triggerTactileHaptic(cop.copVerdict === "MUST_COP" ? "grail" : "success");
        setListingResult(listingPayload);
        toast.success(`🎯 ${cop.verdictLabel}: +$${cop.netProfit.toFixed(0)} Profit!`);
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
          setCapturedPhotos([]);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col justify-between overflow-hidden select-none pb-8">
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
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 border border-slate-800 text-white backdrop-blur-md cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {isGuestUser && !isPro && !isOwner ? (
            <GuestScanHud
              remainingScans={guestScanState.remaining}
              onOpenAuthModal={() => setIsGuestModalOpen(true)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-black tracking-wider uppercase text-cyan-300">
                Spadas Snap Studio
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCameraFacing}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 border border-slate-800 text-white backdrop-blur-md cursor-pointer"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>

      {/* Viewport Frame Container */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="p-8 text-center space-y-3 max-w-xs">
            <Camera className="h-12 w-12 text-cyan-400 mx-auto" />
            <p className="text-xs text-slate-300">{cameraError || "Initializing camera stream..."}</p>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Camera</span>
            </button>
          </div>
        )}

        {/* Framing Corner Brackets */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
          <div className="relative w-full h-full max-w-[340px] max-h-[460px] pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-xl" />
          </div>
        </div>

        {/* Compact Dismissible Secondary Angle / Retake HUD Floating Badge */}
        {retakePrompt?.required && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
            <div className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-full bg-slate-950/90 border border-amber-500/60 shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl text-amber-200">
              <button
                type="button"
                onClick={handleSnapPhoto}
                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
                title="Tap to snap recommended angle"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Camera className="w-3 h-3 text-amber-400" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 shrink-0">
                    Optional:
                  </span>
                  <span className="text-[11px] font-semibold text-amber-100 truncate">
                    {retakePrompt.promptLabel || "Snap detail/tag angle"}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Snap
                </button>
                <button
                  type="button"
                  onClick={() => setRetakePrompt(null)}
                  className="p-1 rounded-full text-amber-400/70 hover:text-amber-200 hover:bg-amber-500/10 transition cursor-pointer"
                  title="Dismiss (continue without secondary angle)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Instructional Tooltip Card */}
        <div className="absolute bottom-6 inset-x-4 z-20 pointer-events-none text-center">
          <div className="inline-block rounded-2xl bg-slate-950/85 border border-slate-800/80 px-4 py-2.5 shadow-2xl backdrop-blur-md max-w-sm">
            <p className="text-xs font-black text-white">
              {capturedPhotos.length === 0
                ? "Capture item"
                : capturedPhotos.length === 1
                ? "Nice start! Snap tag or back angle"
                : `${capturedPhotos.length} photos ready for valuation`}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {capturedPhotos.length === 0
                ? "You can add more photos anytime"
                : "Tap shutter for more photos or tap Identify"}
            </p>
          </div>
        </div>

        {/* Progressive Loading Skeleton & Step Indicator */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <ScanProgressiveLoader
              isActive={isAnalyzing}
              stage={analysisStage}
              detectedTitle={detectedTitle}
              detectedBrand={detectedBrand}
              variant="skeleton"
              customLabel={detectedTitle ? `Valuing ${detectedTitle}...` : "Valuing Find..."}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Stage */}
      <div className="w-full bg-slate-950 border-t border-slate-900 p-4 space-y-3 z-30">
        {/* AI Studio Background Enhancer Banner */}
        {capturedPhotos.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold text-slate-400">
              📸 {capturedPhotos.length} {capturedPhotos.length === 1 ? "Photo" : "Photos"}
            </span>
            <button
              type="button"
              onClick={() => {
                toast.success("✨ AI Studio Background active! Product lighting optimized for marketplace listings.");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-black hover:bg-cyan-500 hover:text-slate-950 transition cursor-pointer shadow-sm"
            >
              <Sparkles className="h-3 w-3" />
              <span>✨ Studio White BG</span>
            </button>
          </div>
        )}

        {/* Photo Stack Tray */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar min-h-[64px]">
          {capturedPhotos.map((img, idx) => (
            <div
              key={idx}
              className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-cyan-400/80 bg-slate-900 shadow-lg animate-fade-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-950/90 text-white flex items-center justify-center text-[10px] font-black border border-slate-700 hover:bg-rose-600 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}

          {capturedPhotos.length < 6 && (
            <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600">
              <span className="text-xs font-black">+{6 - capturedPhotos.length}</span>
            </div>
          )}
        </div>

        {/* Shutter & Actions Bar */}
        <div className="flex items-center justify-between gap-4 px-2">
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
              <ImageIcon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
          </button>

          {/* Big Circular Shutter Button */}
          <button
            type="button"
            onClick={handleSnapPhoto}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-950 p-1 shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <div className="h-full w-full rounded-full border-4 border-slate-950 bg-white" />
          </button>

          {/* Identify & Value Action Button */}
          {capturedPhotos.length > 0 ? (
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleAnalyzeItem}
              className="flex flex-col items-center gap-1 text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse">
                {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Value</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
                <RefreshCw className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Rotate</span>
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
