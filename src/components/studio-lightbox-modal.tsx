"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  X,
  Sliders,
  Sun,
  Layers,
  Download,
  Loader2,
  RefreshCw,
  Eye,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import {
  processStudioLightbox,
  StudioPreset,
  StudioLightboxOptions,
} from "@/lib/image-studio-engine";

interface StudioLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onApply: (enhancedDataUrl: string) => void;
  title?: string;
}

export function StudioLightboxModal({
  isOpen,
  onClose,
  imageSrc,
  onApply,
  title = "Scanned Item",
}: StudioLightboxModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<StudioPreset>("pure_white");
  const [addShadow, setAddShadow] = useState(true);
  const [enhanceLighting, setEnhanceLighting] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [sensitivity, setSensitivity] = useState(0.45);
  const [viewMode, setViewMode] = useState<"after" | "before">("after");

  const runStudioEnhancement = async (overridePreset?: StudioPreset) => {
    if (!imageSrc) return;
    setIsProcessing(true);
    try {
      const opts: StudioLightboxOptions = {
        preset: overridePreset || activePreset,
        addShadow,
        enhanceLighting,
        autoCenter,
        sensitivity,
      };
      const result = await processStudioLightbox(imageSrc, opts);
      setProcessedUrl(result);
    } catch (err: any) {
      console.warn("Studio Lightbox processing failed:", err);
      toast.error(err?.message || "Failed to process studio background");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isOpen && imageSrc) {
      void runStudioEnhancement();
    }
  }, [isOpen, imageSrc, activePreset, addShadow, enhanceLighting, autoCenter, sensitivity]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!processedUrl) return;
    triggerTactileHaptic("success");
    onApply(processedUrl);
    toast.success("✨ Studio Lightbox photo applied to listing!");
    onClose();
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    const link = document.createElement("a");
    link.href = processedUrl;
    link.download = `spadas_studio_${Date.now()}.${activePreset === "transparent" ? "png" : "jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded studio photo");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white">AI Studio Lightbox</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                  eBay Top Rated
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Pure catalog white background &amp; studio relighting</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Frame */}
        <div className="relative flex-1 min-h-[260px] max-h-[360px] bg-slate-900/90 flex items-center justify-center p-4 overflow-hidden">
          {/* Transparent Checkerboard Pattern if transparent preset */}
          {activePreset === "transparent" && viewMode === "after" && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #1e293b 1px)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 8px 8px",
              }}
            />
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <span className="text-xs font-bold font-mono">Generating Studio Isolation...</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(viewMode === "after" ? processedUrl : imageSrc) || imageSrc}
              alt="Studio preview"
              className="max-h-[300px] w-auto max-w-full object-contain rounded-xl shadow-lg transition-all duration-300"
            />
          )}

          {/* Before / After Toggle Button */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                setViewMode("before");
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                viewMode === "before"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                setViewMode("after");
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                viewMode === "after"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Studio ✨
            </button>
          </div>
        </div>

        {/* Studio Presets & Controls */}
        <div className="p-4 space-y-3.5 bg-slate-950 border-t border-slate-800/80 overflow-y-auto">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Marketplace Backdrop Preset
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "pure_white" as const, label: "eBay White", icon: "🏛️" },
                { id: "luxury_slate" as const, label: "Noir Slate", icon: "👑" },
                { id: "warm_minimal" as const, label: "Warm Clay", icon: "🌾" },
                { id: "transparent" as const, label: "Cutout PNG", icon: "🪄" },
              ].map((p) => {
                const isSelected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      triggerTactileHaptic("selection");
                      setActivePreset(p.id);
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-white font-black shadow-sm"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{p.icon}</span>
                    <span className="text-[10px] font-bold truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Studio Lightbox Toggles */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                setEnhanceLighting(!enhanceLighting);
              }}
              className={`p-2 rounded-xl border text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                enhanceLighting
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              <Sun className="h-3 w-3" />
              <span>Studio Light</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                setAddShadow(!addShadow);
              }}
              className={`p-2 rounded-xl border text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                addShadow
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>Contact Shadow</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                setAutoCenter(!autoCenter);
              }}
              className={`p-2 rounded-xl border text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                autoCenter
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              <Check className="h-3 w-3" />
              <span>Auto-Center</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Download high-res studio image"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isProcessing || !processedUrl}
              onClick={handleApply}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Apply Studio Photo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
