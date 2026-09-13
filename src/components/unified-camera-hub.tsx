"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Zap, Layers, ShoppingBag } from "lucide-react";
import SpadasLensCamera from "@/components/spadas-lens-camera";
import { SpadasSnapStudio } from "@/components/spadas-snap-studio";
import IronmanHudCamera from "@/components/ironman-hud-camera";
import { useHaulStore } from "@/lib/haul-store";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface UnifiedCameraHubProps {
  initialTab?: "lens" | "ironman" | "studio" | "haul";
}

export default function UnifiedCameraHub({ initialTab = "lens" }: UnifiedCameraHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lens" | "ironman" | "studio">(
    initialTab === "haul" ? "lens" : initialTab
  );
  const { haulCount } = useHaulStore();

  useEffect(() => {
    if (initialTab === "haul") {
      router.replace("/haul");
    }
  }, [initialTab, router]);

  const handleTabChange = (tab: "lens" | "ironman" | "studio") => {
    if (activeTab !== tab) {
      triggerTactileHaptic("selection");
      setActiveTab(tab);
    }
  };

  return (
    <div className="relative w-full bg-black text-white flex flex-col">
      {/* Top Segmented Mode Slider — Executive 3-Camera Suite & Haul Service Link */}
      <div className="sticky top-0 z-40 w-full px-2.5 sm:px-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] pb-2.5 sm:pb-3 sm:pt-3 glass-nav border-b border-white/[0.08] flex items-center justify-center">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl glass border-white/[0.06] shadow-xl max-w-2xl w-full">
          {/* Mode 1: Lens AR */}
          <button
            type="button"
            onClick={() => handleTabChange("lens")}
            className={`py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center active:scale-95 ${
              activeTab === "lens"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="hud-tab truncate">Lens AR</span>
          </button>

          {/* Mode 2: Scanner */}
          <button
            type="button"
            onClick={() => handleTabChange("ironman")}
            className={`py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center relative active:scale-95 ${
              activeTab === "ironman"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="hud-tab truncate">Scanner</span>
            {activeTab !== "ironman" && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FE] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F2FE]"></span>
              </span>
            )}
          </button>

          {/* Mode 3: Snap Studio */}
          <button
            type="button"
            onClick={() => handleTabChange("studio")}
            className={`py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center active:scale-95 ${
              activeTab === "studio"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5 shrink-0" />
            <span className="hud-tab truncate">AR Studio</span>
          </button>

          {/* Mode 4: Haul (Routes to standalone /haul service) */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              router.push("/haul");
            }}
            className="py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center relative text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-95"
            title="Open Haul Batch Manager & Quick Snap Intake"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            <span className="hud-tab truncate">Haul</span>
            {haulCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {haulCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Mode Viewport — Smooth crossfade transition on mode change */}
      <div className="flex-1 w-full flex flex-col">
        {activeTab === "lens" && (
          <div key="lens-tab" className="w-full lens-crossfade">
            <SpadasLensCamera
              onOpenHaulTab={() => router.push("/haul")}
              onOpenSnapStudio={() => handleTabChange("studio")}
            />
          </div>
        )}
        {activeTab === "ironman" && (
          <div key="ironman-tab" className="block w-full lens-crossfade">
            <IronmanHudCamera />
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
