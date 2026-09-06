"use client";

import { useState } from "react";
import { Camera, Zap, Glasses } from "lucide-react";
import SpadasLensCamera from "@/components/spadas-lens-camera";
import { SpadasSnapStudio } from "@/components/spadas-snap-studio";
import IronmanHudCamera from "@/components/ironman-hud-camera";

interface UnifiedCameraHubProps {
  initialTab?: "lens" | "ironman" | "studio";
}

export default function UnifiedCameraHub({ initialTab = "lens" }: UnifiedCameraHubProps) {
  const [activeTab, setActiveTab] = useState<"lens" | "ironman" | "studio">(initialTab);

  return (
    <div className="relative w-full bg-black text-white flex flex-col">
      {/* Top Segmented Mode Slider */}
      <div className="sticky top-0 z-40 w-full p-2.5 sm:p-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl max-w-lg w-full">
          <button
            type="button"
            onClick={() => setActiveTab("lens")}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
              activeTab === "lens"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">⚡ Lens AR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ironman")}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center relative ${
              activeTab === "ironman"
                ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.02]"
                : "text-amber-400/90 hover:text-amber-300"
            }`}
          >
            <Glasses className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">🥽 Iron Man HUD</span>
            {activeTab !== "ironman" && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
              activeTab === "studio"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">📸 Snap Studio</span>
          </button>
        </div>
      </div>

      {/* Dynamic Mode Viewport */}
      <div className="flex-1 w-full flex flex-col">
        {activeTab === "lens" && (
          <div className="p-2 sm:p-4 max-w-5xl mx-auto w-full">
            <SpadasLensCamera />
          </div>
        )}
        {activeTab === "ironman" && (
          <IronmanHudCamera />
        )}
        {activeTab === "studio" && (
          <SpadasSnapStudio />
        )}
      </div>
    </div>
  );
}
