"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Zap, ShoppingBag, ChevronLeft, Home, HelpCircle, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import SpadasLensCamera, { releasePersistentMediaStream } from "@/components/spadas-lens-camera";
import { cameraStreamManager } from "@/lib/camera-stream-provider";
import { useHaulStore } from "@/lib/haul-store";
import { supabase } from "@/app/lib/supabase";
import { triggerTactileHaptic } from "@/lib/android-bridge";

const SpadasSnapStudio = dynamic(
  () => import("@/components/spadas-snap-studio").then((m) => m.SpadasSnapStudio),
  { ssr: false }
);

const IronmanHudCamera = dynamic(
  () => import("@/components/ironman-hud-camera"),
  { ssr: false }
);

const ScannerGuideModal = dynamic(
  () => import("@/components/scanner-guide-modal").then((m) => m.ScannerGuideModal),
  { ssr: false }
);

interface UnifiedCameraHubProps {
  initialTab?: "lens" | "cyber" | "studio" | "haul" | "ironman";
}

export default function UnifiedCameraHub({ initialTab = "lens" }: UnifiedCameraHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lens" | "cyber" | "studio">(
    initialTab === "studio"
      ? "studio"
      : initialTab === "ironman" || initialTab === "cyber"
      ? "cyber"
      : "lens"
  );
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { haulCount } = useHaulStore();

  // Clean exit handler: navigates to dashboard for authenticated users or home for guests
  const handleExitCamera = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  // Support Android hardware back button and browser gesture navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      void handleExitCamera();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handleExitCamera]);

  // Ensure camera hardware resources are released whenever component unmounts
  useEffect(() => {
    return () => {
      releasePersistentMediaStream();
    };
  }, []);

  useEffect(() => {
    if (initialTab === "haul") {
      router.replace("/haul");
    }
  }, [initialTab, router]);

  const handleTabChange = (tab: "lens" | "cyber" | "studio") => {
    if (activeTab !== tab) {
      triggerTactileHaptic("selection");
      if (tab === "cyber" || activeTab === "cyber") {
        releasePersistentMediaStream();
      } else {
        cameraStreamManager.releaseCamera(activeTab === "lens" ? "lens" : "studio");
      }
      setActiveTab(tab);
    }
  };

  return (
    <div className="relative w-full min-h-full flex-1 bg-gradient-to-b from-[#0B0F1C] via-[#090D18] to-[#0A0E1A] text-white flex flex-col overflow-y-auto">
      {/* Luminous Ambient Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-48 bg-gradient-to-b from-emerald-500/15 via-cyan-500/10 to-transparent blur-3xl pointer-events-none select-none z-0" />

      {/* Top Segmented Mode Slider — Joyful & Luminous Pro Tool Bar */}
      <div className="sticky top-0 z-40 w-full shrink-0 px-2 sm:px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] pb-2 sm:pb-3 glass-nav border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-2 max-w-xl mx-auto">
          {/* On-Screen Back Button */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("tap");
              handleExitCamera();
            }}
            className="flex items-center gap-1.5 h-10 px-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-200 hover:text-white active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold pr-0.5 hidden xs:inline">Back</span>
          </button>

          {/* 4-Mode Joyful Segmented Switcher */}
          <div className="flex items-center justify-center gap-1 p-1 rounded-2xl bg-slate-950/60 border border-white/15 shadow-xl backdrop-blur-2xl flex-1 max-w-md">
            {/* Mode 1: Lens AR */}
            <button
              type="button"
              onClick={() => handleTabChange("lens")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
                activeTab === "lens"
                  ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.45)] ring-1 ring-white/50"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Zap className={`h-3.5 w-3.5 shrink-0 ${activeTab === "lens" ? "text-slate-950 fill-slate-950" : "text-emerald-400"}`} />
              <span className="truncate tracking-tight">Lens</span>
            </button>

            {/* Mode 2: Cyber AR HUD */}
            <button
              type="button"
              onClick={() => handleTabChange("cyber")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
                activeTab === "cyber"
                  ? "bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(139,92,246,0.45)] ring-1 ring-white/50"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 shrink-0 ${activeTab === "cyber" ? "text-slate-950 fill-slate-950 animate-happy-sparkle" : "text-violet-400"}`} />
              <span className="truncate tracking-tight">Cyber HUD</span>
            </button>

            {/* Mode 3: Studio */}
            <button
              type="button"
              onClick={() => handleTabChange("studio")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
                activeTab === "studio"
                  ? "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 shadow-[0_0_20px_rgba(251,146,60,0.45)] ring-1 ring-white/50"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Camera className={`h-3.5 w-3.5 shrink-0 ${activeTab === "studio" ? "text-slate-950" : "text-amber-400"}`} />
              <span className="truncate tracking-tight">Studio</span>
            </button>

            {/* Mode 4: Haul */}
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("selection");
                router.push("/haul");
              }}
              className="shrink-0 min-w-fit px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer text-center text-zinc-300 hover:text-white hover:bg-white/[0.08] active:scale-95"
              title="Open Haul Session & Manifest"
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span className="hidden xs:inline whitespace-nowrap tracking-tight">Haul</span>
              {haulCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm shrink-0 tabular-nums">
                  {haulCount}
                </span>
              )}
            </button>
          </div>

          {/* Header Right Utility Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* How to Scan Guide Button */}
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                setIsGuideOpen(true);
              }}
              className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white/[0.06] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white active:scale-95 transition-all shadow-sm cursor-pointer"
              title="How to Scan Guide"
              aria-label="How to Scan Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Dashboard Overview Shortcut */}
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                releasePersistentMediaStream();
                router.push("/dashboard");
              }}
              className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-200 hover:text-white active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Dashboard Overview"
              aria-label="Dashboard Overview"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Mode Viewport */}
      <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-y-auto">
        {activeTab === "lens" && (
          <div key="lens-tab" className="w-full min-h-full flex-1 flex flex-col relative overflow-y-auto lens-crossfade">
            <SpadasLensCamera
              onOpenHaulTab={() => router.push("/haul")}
              onOpenSnapStudio={() => handleTabChange("studio")}
            />
          </div>
        )}
        {activeTab === "cyber" && (
          <div key="cyber-tab" className="block w-full h-full flex-1 min-h-0 flex flex-col relative overflow-hidden lens-crossfade">
            <IronmanHudCamera />
          </div>
        )}
        {activeTab === "studio" && (
          <div key="studio-tab" className="block w-full h-full flex-1 min-h-0 flex flex-col relative overflow-hidden lens-crossfade">
            <SpadasSnapStudio />
          </div>
        )}
      </div>

      {/* In-Camera Quick Guide Modal */}
      <ScannerGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
