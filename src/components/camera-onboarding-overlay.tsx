"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Camera, Sun, Sparkles, CheckCircle2, ChevronRight, X, Video, BookOpen, RefreshCw } from "lucide-react";

// Dynamically import MuxPlayer with ssr: false for clean client-side rendering
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-slate-950 rounded-xl flex items-center justify-center text-slate-500">
      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
      <span className="text-xs">Loading video player...</span>
    </div>
  ),
});

interface CameraOnboardingOverlayProps {
  onDismiss?: () => void;
  forceOpen?: boolean;
}

export default function CameraOnboardingOverlay({
  onDismiss,
  forceOpen = false,
}: CameraOnboardingOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"slides" | "video">("slides");
  const [step, setStep] = useState(1);
  const [playbackId, setPlaybackId] = useState<string | null>(null);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("spadas_lens_onboarding_seen");
      if (!seen) {
        setIsOpen(true);
      }
    }
  }, [forceOpen]);

  // Load showcase playback ID when opened
  useEffect(() => {
    if (isOpen) {
      fetch("/api/mux/showcase")
        .then((res) => res.json())
        .then((data) => {
          if (data.playbackId) {
            setPlaybackId(data.playbackId);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_lens_onboarding_seen", "true");
    }
    if (onDismiss) onDismiss();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 p-5 sm:p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Camera className="w-4 h-4" />
            <span>Spadas Lens — AR Scanner Guide</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector: Slides vs Video */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("slides")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
              activeTab === "slides"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Step-by-Step</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("video")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
              activeTab === "video"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span>Video Tutorial</span>
          </button>
        </div>

        {/* Tab 1: Video Tutorial */}
        {activeTab === "video" && (
          <div className="space-y-3 py-1 animate-fade-in">
            {playbackId ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                <MuxPlayer
                  playbackId={playbackId}
                  envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY || "0qojc2e1e88k09u028i9fk4r4"}
                  metadata={{
                    video_title: "Spadas Lens Camera Tutorial",
                    player_name: "Camera HUD Guide",
                  }}
                  streamType="on-demand"
                  accentColor="#22d3ee"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center p-4 text-center">
                <Video className="w-8 h-8 text-cyan-400 mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-white mb-1">Video Demo Available Soon</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Screen recording demo will stream here. Switch to the Step-by-Step tab to see framing tips.
                </p>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-md"
              >
                Ready to Scan
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Step-by-Step Slides */}
        {activeTab === "slides" && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    step === s ? "w-8 bg-emerald-400" : "w-3 bg-slate-800"
                  }`}
                />
              ))}
            </div>

            {/* Content Slides */}
            {step === 1 && (
              <div className="text-center py-4 space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-100">1. Center Product & Brand Logo</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Aim viewport directly at the item. Ensure brand logos, model plates, or care tags face the camera for instant OCR extraction.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="text-center py-4 space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/30 shadow-inner">
                  <Sun className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-100">2. Good Lighting & Steady Frame</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Hold device steady for 0.5s in adequate lighting. Frames are automatically downscaled to 512px max edge for ultra-fast single-pass processing.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-4 space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/30 shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-100">3. Comps, Future Grails & 1-Click Drafts</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    View Australian eBay sold comp price ranges, viral TikTok surge predictions, and tap <strong>"List on eBay"</strong> to publish drafts instantly.
                  </p>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-500">Step {step} of 3</span>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Start Scanning</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
