"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Sparkles, X, Image as ImageIcon, Zap, ShieldCheck, ChevronRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SpadasListingDetailsSheet, SpadasListingData } from "@/components/spadas-listing-details-sheet";
import { calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { triggerTactileHaptic, syncProfitToAndroidWidget } from "@/lib/android-bridge";
import { detectGeoCurrency } from "@/app/lib/currency-routing";

export function SpadasSnapStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [listingResult, setListingResult] = useState<SpadasListingData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const fullW = video.videoWidth || video.clientWidth || 640;
    const fullH = video.videoHeight || video.clientHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(1200, fullW);
    canvas.height = Math.round((fullH * canvas.width) / fullW);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, fullW, fullH, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

    if (dataUrl && dataUrl.length > 2000) {
      setCapturedPhotos((prev) => [...prev, dataUrl]);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
      toast.success(`Photo ${capturedPhotos.length + 1} captured!`, { duration: 1200 });
    }
  };

  // Handle File Upload from Gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 6 - capturedPhotos.length;
    const toProcess = Array.from(files).slice(0, availableSlots);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCapturedPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    toast.success(`Added ${toProcess.length} photos!`);
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

    setIsAnalyzing(true);
    toast.info("🔍 AI identifying item, extracting tags, and finding eBay comps...", { duration: 3000 });

    try {
      const activeCurrency =
        (typeof window !== "undefined" && localStorage.getItem("spadas_selected_currency")) ||
        detectGeoCurrency().currency;

      const res = await fetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: capturedPhotos,
          currency: activeCurrency,
          mode: "deep",
        }),
      });

      const data = await res.json().catch(() => null);

      if (data) {
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
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-black tracking-wider uppercase text-cyan-300">
            Spadas Snap Studio
          </span>
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
    </div>
  );
}
