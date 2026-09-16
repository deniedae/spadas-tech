"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Zap, ShoppingBag } from "lucide-react";
import SpadasLensCamera, { releasePersistentMediaStream } from "@/components/spadas-lens-camera";
import { SpadasSnapStudio } from "@/components/spadas-snap-studio";
import { useHaulStore } from "@/lib/haul-store";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface UnifiedCameraHubProps {
  initialTab?: "lens" | "studio" | "haul" | "ironman";
}

export default function UnifiedCameraHub({ initialTab = "lens" }: UnifiedCameraHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lens" | "studio">(
    initialTab === "studio" ? "studio" : "lens"
  );
  const { haulCount } = useHaulStore();

  useEffect(() => {
    if (initialTab === "haul") {
      router.replace("/haul");
    }
  }, [initialTab, router]);

  const handleTabChange = (tab: "lens" | "studio") => {
    if (activeTab !== tab) {
      triggerTactileHaptic("selection");
      if (tab === "studio") {
        releasePersistentMediaStream();
      }
      setActiveTab(tab);
    }
  };

  return (
    <div className="relative w-full bg-[#08090D] text-white flex flex-col">
      {/* Top Segmented Mode Slider — Pro Tool Workspace Bar */}
      <div className="sticky top-0 z-40 w-full px-2.5 sm:px-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] pb-2 sm:pb-2.5 glass-nav border-b border-white/[0.06] flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D0F15] border border-white/[0.08] shadow-lg max-w-md w-full">
          {/* Mode 1: Lens AR */}
          <button
            type="button"
            onClick={() => handleTabChange("lens")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
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
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95 ${
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
            className="py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-center text-zinc-300 hover:text-white hover:bg-white/[0.04] active:scale-95"
            title="Open Haul Session & Manifest"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate tracking-tight">Haul</span>
            {haulCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {haulCount}
              </span>
            )}
          </button>
        </div>
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
