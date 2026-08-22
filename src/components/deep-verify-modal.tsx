"use client";

import { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  Upload,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { DeepVerifyResult } from "@/app/api/deep-verify/route";

interface DeepVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  brand?: string;
  category?: string;
  initialImage?: string;
}

interface AngleStep {
  id: string;
  title: string;
  subtitle: string;
  instruction: string;
  icon: string;
}

const STEPS: AngleStep[] = [
  {
    id: "front",
    title: "1. Full Front View",
    subtitle: "Overall proportions and silhouette",
    instruction: "Capture the entire item from the front in good lighting.",
    icon: "👟",
  },
  {
    id: "tag",
    title: "2. Brand / Size Tag",
    subtitle: "Typography, style code and country",
    instruction: "Close-up of the size label, neck tag, or interior stamp.",
    icon: "🏷️",
  },
  {
    id: "detail",
    title: "3. Stitching and Hardware",
    subtitle: "Thread density, zippers and logo",
    instruction: "Macro close-up of logo embroidery, seam stitching, or hardware.",
    icon: "🔍",
  },
  {
    id: "sole",
    title: "4. Sole / Serial / Underside",
    subtitle: "Tread pattern, micro-stamps and serial",
    instruction: "Capture the outsole, serial number, or internal care tag.",
    icon: "📐",
  },
];

export function DeepVerifyModal({
  isOpen,
  onClose,
  productName = "Resale Item",
  brand = "Brand",
  category = "Fashion / Collectibles",
  initialImage,
}: DeepVerifyModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [result, setResult] = useState<DeepVerifyResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setCurrentStepIndex(0);
      if (initialImage) {
        setCapturedImages([initialImage]);
        setCurrentStepIndex(1);
      } else {
        setCapturedImages([]);
      }
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, initialImage]);

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera start warning in modal:", err);
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    const updated = [...capturedImages];
    updated[currentStepIndex] = dataUrl;
    setCapturedImages(updated);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(60);
    }
    toast.success(`📸 Captured ${STEPS[currentStepIndex].title}`);

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const updated = [...capturedImages];
        updated[currentStepIndex] = reader.result;
        setCapturedImages(updated);
        toast.success(`🖼️ Uploaded ${STEPS[currentStepIndex].title}`);
        if (currentStepIndex < STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunVerification = async () => {
    if (capturedImages.length === 0) {
      toast.error("Please capture at least 1 macro photo before verifying.");
      return;
    }

    setAnalyzing(true);
    setAnalysisStage(0);

    const stages = [
      "Inspecting label typography & style code kerning...",
      "Analyzing seam stitch tension & thread density...",
      "Cross-referencing hardware marks & logo geometry...",
      "Running multi-angle counterfeit consensus checks...",
    ];

    const stageInterval = setInterval(() => {
      setAnalysisStage((prev) => {
        if (prev < stages.length - 1) return prev + 1;
        return prev;
      });
    }, 1100);

    try {
      const res = await fetch("/api/deep-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: capturedImages,
          productName,
          brand,
          category,
        }),
      });

      clearInterval(stageInterval);

      if (!res.ok) {
        throw new Error("Verification service temporarily unavailable.");
      }

      const data: DeepVerifyResult = await res.json();
      setResult(data);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (data.verdict === "LIKELY_AUTHENTIC") {
          navigator.vibrate([100, 50, 200]);
        } else {
          navigator.vibrate(200);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete deep verification.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.25)] overflow-hidden text-slate-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base leading-tight">Spadas Deep Verify</h3>
                <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-slate-950 shadow-sm">
                  Forensic AI
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                {productName} • {brand}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {analyzing ? (
            /* Analysis Stage Loader */
            <div className="py-14 px-6 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative flex items-center justify-center">
                <div className="h-24 w-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin shadow-[0_0_30px_rgba(6,182,212,0.5)]" />
                <ShieldCheck className="absolute h-10 w-10 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-2 max-w-md">
                <h4 className="text-lg font-black text-white">Forensic Authentication in Progress</h4>
                <p className="text-sm font-semibold text-cyan-300 animate-pulse">
                  {analysisStage === 0 && "🔬 Inspecting label typography & style code kerning..."}
                  {analysisStage === 1 && "🧵 Analyzing seam stitch tension & thread density..."}
                  {analysisStage === 2 && "🔍 Cross-referencing hardware marks & logo geometry..."}
                  {analysisStage === 3 && "⚡ Running multi-angle counterfeit consensus checks..."}
                </p>
                <p className="text-xs text-slate-400">
                  Inspecting {capturedImages.length} macro angles with brand-specific counterfeit databases.
                </p>
              </div>
            </div>
          ) : result ? (
            /* Authenticity Certificate & Results View */
            <div className="space-y-4 animate-fade-in">
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  result.verdict === "LIKELY_AUTHENTIC"
                    ? "bg-emerald-950/50 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                    : result.verdict === "SUSPICIOUS"
                    ? "bg-amber-950/50 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                    : "bg-red-950/50 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.verdict === "LIKELY_AUTHENTIC" ? (
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    </div>
                  ) : result.verdict === "SUSPICIOUS" ? (
                    <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-7 w-7 text-amber-400" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-red-500/20 border border-red-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="h-7 w-7 text-red-400" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">
                        {result.verdict === "LIKELY_AUTHENTIC"
                          ? "✅ LIKELY AUTHENTIC"
                          : result.verdict === "SUSPICIOUS"
                          ? "⚠️ SUSPICIOUS ANOMALIES"
                          : "❌ CANNOT CONFIRM AUTHENTICITY"}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-white/20">
                        {result.authenticity_score}% Score
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Recommendation: <strong>{result.recommendation.replace(/_/g, " ")}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setCapturedImages([]);
                    setCurrentStepIndex(0);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-Scan
                </button>
              </div>

              {/* Forensic Summary */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-1">
                <span className="font-extrabold text-cyan-300 block uppercase tracking-wide text-[10px]">
                  Forensic Breakdown Summary:
                </span>
                <p>{result.forensic_summary}</p>
              </div>

              {/* Red Flags & Positive Hallmarks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Positive Hallmarks */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified Positive Hallmarks
                  </span>
                  <ul className="space-y-1.5">
                    {result.positive_indicators.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-slate-300 text-[11px] leading-tight">
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Red Flags / Risk Areas */}
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
                  <span className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                    <AlertTriangle className="h-3.5 w-3.5" /> Counterfeit Red Flags ({result.red_flags.length})
                  </span>
                  {result.red_flags.length > 0 ? (
                    <ul className="space-y-1.5">
                      {result.red_flags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-rose-200 text-[11px] leading-tight font-medium">
                          <span className="text-rose-400 font-bold shrink-0">⚠️</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Zero structural red flags or counterfeit font tells detected in provided macro photos.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-lg hover:opacity-90 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Guided Step-by-Step Capture Flow */
            <div className="space-y-4">
              {/* Step indicator tabs */}
              <div className="grid grid-cols-4 gap-2">
                {STEPS.map((step, idx) => {
                  const isDone = Boolean(capturedImages[idx]);
                  const isCurrent = currentStepIndex === idx;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : isDone
                          ? "border-emerald-500/40 bg-emerald-500/10 text-slate-300"
                          : "border-slate-800 bg-slate-900/60 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{step.icon}</span>
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400">#{idx + 1}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold truncate mt-1 text-slate-200">
                        {step.title.split(". ")[1]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Viewport Framing Area */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-900 shadow-inner flex items-center justify-center">
                {capturedImages[currentStepIndex] ? (
                  /* Show Captured Photo */
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={capturedImages[currentStepIndex]}
                      alt={STEPS[currentStepIndex].title}
                      className="h-full w-full object-contain bg-black"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...capturedImages];
                          copy[currentStepIndex] = "";
                          setCapturedImages(copy);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/20 text-slate-200 text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3 inline mr-1" /> Retake
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Camera Feed */
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />

                    {/* Framing Guidelines Overlay */}
                    <div className="absolute inset-0 border-2 border-dashed border-cyan-400/40 rounded-2xl pointer-events-none flex flex-col justify-between p-4 bg-cyan-500/5">
                      <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-slate-950/80 border border-cyan-400/40 px-3 py-1 text-[11px] font-extrabold text-cyan-300">
                        <span>{STEPS[currentStepIndex].icon}</span>
                        <span>{STEPS[currentStepIndex].title}</span>
                      </div>
                      <p className="self-center text-center text-xs font-semibold text-white bg-slate-950/80 px-3 py-1 rounded-full border border-white/10 shadow-lg">
                        {STEPS[currentStepIndex].instruction}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer active:scale-95"
                  >
                    <Camera className="h-4 w-4" /> Capture Angle #{currentStepIndex + 1}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload File
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {capturedImages.filter(Boolean).length} / 4 angles captured
                  </span>

                  <button
                    type="button"
                    onClick={handleRunVerification}
                    disabled={capturedImages.filter(Boolean).length === 0}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" /> Run Deep Verification
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
