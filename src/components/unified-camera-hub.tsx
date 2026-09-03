"use client";

import { useState } from "react";
import { Camera, Zap, Sparkles } from "lucide-react";
import SpadasLensCamera from "@/components/spadas-lens-camera";
import { SpadasSnapStudio } from "@/components/spadas-snap-studio";

export default function UnifiedCameraHub() {
  const [activeTab, setActiveTab] = useState<"lens" | "studio">("lens");

  return (
    <div className="relative w-full bg-black text-white flex flex-col">
      {/* Top Segmented Mode Slider */}
      <div className="sticky top-0 z-40 w-full p-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-center">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl max-w-sm w-full">
          <button
            type="button"
            onClick={() => setActiveTab("lens")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "lens"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>⚡ Lens AR (Walk & Pan)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "studio"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>📸 Snap Studio (Multi-Shot)</span>
          </button>
        </div>
      </div>

      {/* Dynamic Mode Viewport */}
      <div className="flex-1 w-full flex flex-col">
        {activeTab === "lens" ? (
          <div className="p-2 sm:p-4 max-w-5xl mx-auto w-full">
            <SpadasLensCamera />
          </div>
        ) : (
          <SpadasSnapStudio />
        )}
      </div>
    </div>
  );
}
