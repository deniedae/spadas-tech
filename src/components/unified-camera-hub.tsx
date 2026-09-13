"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Zap, Layers, ShoppingBag } from "lucide-react";
import SpadasLensCamera from "@/components/spadas-lens-camera";
import { SpadasSnapStudio } from "@/components/spadas-snap-studio";
import IronmanHudCamera from "@/components/ironman-hud-camera";
import { useHaulStore } from "@/lib/haul-store";

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

  return (
    <div className="relative w-full bg-black text-white flex flex-col">
      {/* Top Segmented Mode Slider — Executive 3-Camera Suite & Haul Service Link */}
      <div className="sticky top-0 z-40 w-full px-2.5 sm:px-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] pb-2.5 sm:pb-3 sm:pt-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl max-w-2xl w-full">
          {/* Mode 1: Lens AR */}
          <button
            type="button"
            onClick={() => setActiveTab("lens")}
            className={`py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-transform duration-75 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center active:scale-95 ${
              activeTab === "lens"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Lens AR</span>
          </button>

          {/* Mode 2: Spatial Field HUD */}
          <button
            type="button"
            onClick={() => setActiveTab("ironman")}
            className={`py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center relative ${
              activeTab === "ironman"
                ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.02]"
                : "text-amber-400/90 hover:text-amber-300"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Spatial HUD</span>
            {activeTab !== "ironman" && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>

          {/* Mode 3: Snap Studio */}
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-transform duration-75 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center active:scale-95 ${
              activeTab === "studio"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Snap Studio</span>
          </button>

          {/* Mode 4: Spadas Haul (Routes to standalone /haul service) */}
          <button
            type="button"
            onClick={() => router.push("/haul")}
            className="py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center relative text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-95"
            title="Open Spadas Haul Lot Batch Manager & Quick Snap Intake"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Spadas Haul</span>
            {haulCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {haulCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Mode Viewport — Clean camera hardware lifecycle release on mode switch */}
      <div className="flex-1 w-full flex flex-col">
        {activeTab === "lens" && (
          <div className="w-full animate-fade-in">
            <SpadasLensCamera
              onOpenHaulTab={() => router.push("/haul")}
              onOpenSnapStudio={() => setActiveTab("studio")}
            />
          </div>
        )}
        {activeTab === "ironman" && (
          <div className="block w-full animate-fade-in">
            <IronmanHudCamera />
          </div>
        )}
        {activeTab === "studio" && (
          <div className="block w-full animate-fade-in">
            <SpadasSnapStudio />
          </div>
        )}
      </div>
    </div>
  );
}
