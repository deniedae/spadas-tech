"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Zap, ShoppingBag, ChevronLeft, Home } from "lucide-react";
import dynamic from "next/dynamic";
import SpadasLensCamera, { releasePersistentMediaStream } from "@/components/spadas-lens-camera";
import { useHaulStore } from "@/lib/haul-store";
import { triggerTactileHaptic } from "@/lib/android-bridge";

const SpadasSnapStudio = dynamic(
  () => import("@/components/spadas-snap-studio").then((m) => m.SpadasSnapStudio),
  { ssr: false }
);

interface UnifiedCameraHubProps {
  initialTab?: "lens" | "studio" | "haul" | "ironman";
}

export default function UnifiedCameraHub({ initialTab = "lens" }: UnifiedCameraHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lens" | "studio">(
    initialTab === "studio" ? "studio" : "lens"
  );
  const { haulCount } = useHaulStore();

  // Clean exit handler: releases hardware media stream and navigates back or home
  const handleExitCamera = useCallback(() => {
    releasePersistentMediaStream();
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    }
  }, [router]);

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

  const handleTabChange = (tab: "lens" | "studio") => {
    if (activeTab !== tab) {
      triggerTactileHaptic("selection");
      releasePersistentMediaStream();
      setActiveTab(tab);
    }
  };

  return (
    <div className="relative w-full bg-[#08090D] text-white flex flex-col">
      {/* Top Segmented Mode Slider — Pro Tool Workspace Bar with On-Screen Back & Home */}
      <div className="sticky top-0 z-40 w-full px-2 sm:px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] pb-2 sm:pb-2.5 glass-nav border-b border-white/[0.06] flex items-center justify-between gap-2 max-w-xl mx-auto">
        {/* On-Screen Back Button */}
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("tap");
            handleExitCamera();
          }}
          className="flex items-center gap-1 h-9 px-2.5 rounded-xl bg-[#0D0F15] border border-white/[0.1] text-zinc-300 hover:text-white hover:bg-white/[0.06] active:scale-95 transition shadow-md cursor-pointer shrink-0"
          title="Back to previous page"
          aria-label="Back to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs font-semibold pr-0.5 hidden xs:inline">Back</span>
        </button>

        {/* 3-Mode Segmented Switcher */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-[#0D0F15] border border-white/[0.08] shadow-lg flex-1 max-w-sm">
          {/* Mode 1: Lens AR */}
          <button
            type="button"
            onClick={() => handleTabChange("lens")}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
              activeTab === "lens"
                ? "bg-[#1A1E29] text-white shadow-sm border border-white/[0.12]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
            }`}
          >
            <Zap className={`h-3.5 w-3.5 shrink-0 ${activeTab === "lens" ? "text-emerald-400" : "text-zinc-400"}`} />
            <span className="truncate tracking-tight">Lens</span>
          </button>

          {/* Mode 2: Studio */}
          <button
            type="button"
            onClick={() => handleTabChange("studio")}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
              activeTab === "studio"
                ? "bg-[#1A1E29] text-white shadow-sm border border-white/[0.12]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
            }`}
          >
            <Camera className={`h-3.5 w-3.5 shrink-0 ${activeTab === "studio" ? "text-cyan-400" : "text-zinc-400"}`} />
            <span className="truncate tracking-tight">Studio</span>
          </button>

          {/* Mode 3: Haul (Navigates to standalone /haul intake) */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              router.push("/haul");
            }}
            className="shrink-0 min-w-fit px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-center text-zinc-300 hover:text-white hover:bg-white/[0.04] active:scale-95"
            title="Open Haul Session & Manifest"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="whitespace-nowrap tracking-tight">Haul</span>
            {haulCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 tabular-nums">
                {haulCount}
              </span>
            )}
          </button>
        </div>

        {/* Dashboard Overview Shortcut */}
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("tap");
            releasePersistentMediaStream();
            router.push("/");
          }}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#0D0F15] border border-white/[0.1] text-zinc-300 hover:text-white hover:bg-white/[0.06] active:scale-95 transition shadow-md cursor-pointer shrink-0"
          title="Dashboard Overview"
          aria-label="Dashboard Overview"
        >
          <Home className="h-4 w-4" />
        </button>
      </div>

      {/* Dynamic Mode Viewport */}
      <div className="flex-1 w-full flex flex-col">
        {activeTab === "lens" && (
          <div key="lens-tab" className="w-full lens-crossfade">
            <SpadasLensCamera
              onOpenHaulTab={() => router.push("/haul")}
              onOpenSnapStudio={() => handleTabChange("studio")}
            />
          </div>
        )}
        {activeTab === "studio" && (
          <div key="studio-tab" className="block w-full lens-crossfade">
            <SpadasSnapStudio />
          </div>
        )}
      </div>
    </div>
  );
}
