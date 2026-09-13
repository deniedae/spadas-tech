"use client";

import React, { useState } from "react";
import {
  Zap,
  RefreshCw,
  Sliders,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sun,
  Search,
  Trophy,
  Sparkles,
  HelpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Bug,
  Terminal,
  Settings2,
  Square,
} from "lucide-react";
import { CURRENCY_CONFIGS, SupportedCurrency } from "@/app/lib/currency-routing";
import { toast } from "sonner";
import { triggerTactileHaptic } from "@/lib/android-bridge";

export interface LensControlsBarProps {
  scan: {
    mode: "snap" | "sweep" | "barcode" | "live" | "deep";
    setMode: (m: any) => void;
    isAnalyzing: boolean;
    autoActive: boolean;
    setAutoActive: (v: boolean) => void;
    onScanNow: () => void;
    onStop: () => void;
    cameraMoving?: boolean;
    rateLimited?: boolean;
  };
  hardware: {
    torchEnabled: boolean;
    torchSupported: boolean;
    onToggleTorch: () => void;
    zoomLevel?: number;
    setZoomLevel?: (z: number) => void;
  };
  audio: {
    soundEnabled: boolean;
    onToggleSound: () => void;
    voiceListening: boolean;
    voiceSupported?: boolean;
    onToggleVoice: () => void;
  };
  prefs: {
    grailMode: boolean;
    setGrailMode: (v: boolean) => void;
    currency: SupportedCurrency;
    setCurrency: (c: SupportedCurrency) => void;
    isPro: boolean;
    onUpgrade: () => void;
    minProfitThreshold: number;
    updateProfitThreshold: (val: number) => void;
  };
  nav: {
    onGuide: () => void;
    onHistory: () => void;
  };
  debug?: {
    isOwner: boolean;
    showDebugDrawer: boolean;
    setShowDebugDrawer: (v: boolean) => void;
    lastRawApiResponse?: any;
    latestApiError?: string | null;
    isMockFallback?: boolean;
  };
}

export default function LensControlsBar({
  scan,
  hardware,
  audio,
  prefs,
  nav,
  debug,
}: LensControlsBarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div className="w-full box-border rounded-2xl glass-hud backdrop-blur-xl bg-black/80 p-3 sm:p-4 border border-white/10 shadow-2xl space-y-3">
      {/* ── ROW 1: Focused Primary Controls (Always Visible) ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Scan Frame Primary Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("medium");
              scan.onScanNow();
            }}
            disabled={scan.isAnalyzing}
            className="inline-flex h-9 items-center gap-2 rounded-xl px-4 sm:px-5 text-xs sm:text-sm font-black bg-gradient-to-r from-[#00F2FE] via-cyan-400 to-teal-400 hover:brightness-110 active:scale-95 text-black shadow-[0_0_25px_rgba(0,242,254,0.45)] border border-[#00F2FE]/60 transition cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${scan.isAnalyzing ? "animate-spin text-black" : "text-black"}`} />
            <span>{scan.isAnalyzing ? "Analyzing Frame..." : "Scan Frame"}</span>
          </button>
        </div>

        {/* Right: Grail Mode, Options & Stop */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Grail Mode Icon-Only Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextGrail = !prefs.grailMode;
              triggerTactileHaptic(nextGrail ? "grail" : "light");
              prefs.setGrailMode(nextGrail);
              toast.success(
                nextGrail ? "🚨 AR Grail Detector Active ($80+ Alert)!" : "Grail Detector muted."
              );
            }}
            title={prefs.grailMode ? "Grail Mode ON ($80+ Alert)" : "Grail Mode OFF"}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer active:scale-95 ${
              prefs.grailMode
                ? "bg-[#CCFF00] text-black border-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.55)] animate-pulse font-black"
                : "glass text-zinc-400 border-white/10 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Trophy className="h-4 w-4" />
          </button>

          {/* Expandable Options Drawer Toggle ("⚙️ More") */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              setIsMoreOpen(!isMoreOpen);
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer active:scale-95 ${
              isMoreOpen
                ? "badge-neon-cyan"
                : "glass text-zinc-300 border-white/10 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5 text-[#00F2FE]" />
            <span>Options</span>
            {isMoreOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Stop Camera Button */}
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("warning");
              scan.onStop();
            }}
            className="inline-flex h-9 items-center gap-1 rounded-xl badge-error px-3 text-xs font-bold cursor-pointer transition active:scale-95 hover:bg-rose-500/20"
            title="Stop Camera Stream"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* ── ROW 2: Collapsed Options & Tools Tray (Toggled via "Options") ───── */}
      {isMoreOpen && (
        <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-fade-in">
          {/* Secondary Controls Grid: Tight, High-Performance Layout */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left group: Hardware & Audio (Torch, Sound, Voice) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Torch / Flashlight (gracefully hidden if unsupported by active lens) */}
              {hardware.torchSupported && (
                <button
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic("light");
                    hardware.onToggleTorch();
                  }}
                  title={hardware.torchEnabled ? "Turn Flashlight OFF" : "Turn Flashlight ON"}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
                    hardware.torchEnabled
                      ? "badge-active text-[#00F2FE]"
                      : "glass border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Sun className={`h-3.5 w-3.5 ${hardware.torchEnabled ? "text-[#00F2FE] animate-pulse" : "text-[#00F2FE]"}`} />
                  <span>{hardware.torchEnabled ? "Torch ON" : "Torch"}</span>
                </button>
              )}

              {/* Sound Cues Toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("light");
                  audio.onToggleSound();
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer active:scale-95 ${
                  audio.soundEnabled
                    ? "badge-active text-[#00F2FE]"
                    : "glass border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {audio.soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#00F2FE]" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
                <span>{audio.soundEnabled ? "Audio ON" : "Muted"}</span>
              </button>

              {/* Voice Control Toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("light");
                  audio.onToggleVoice();
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer active:scale-95 ${
                  audio.voiceListening
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                    : "glass border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {audio.voiceListening ? <Mic className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> : <MicOff className="h-3.5 w-3.5 text-zinc-500" />}
                <span>{audio.voiceListening ? "Voice Active" : "Voice"}</span>
              </button>
            </div>

            {/* Right group: Currency, Nav, Pro */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Currency Selector */}
              <div className="flex items-center gap-0.5 glass border border-white/[0.08] rounded-xl p-0.5">
                {(["AUD", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((c) => {
                  const conf = CURRENCY_CONFIGS[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        triggerTactileHaptic("selection");
                        prefs.setCurrency(c);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("spadas_selected_currency", c);
                        }
                        toast.success(`Switched Comps to ${conf.flag} ${c} (${conf.ebaySite})`);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 active:scale-95 ${
                        prefs.currency === c
                          ? "badge-active text-[#00F2FE]"
                          : "text-zinc-400 hover:text-white"
                      }`}
                      title={`Switch to ${c} (${conf.ebaySite})`}
                    >
                      <span className="text-[10px]">{conf.flag}</span>
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>

              {/* Guide Button */}
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("light");
                  nav.onGuide();
                }}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/[0.08] glass px-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer transition active:scale-95"
                title="Open AR Camera Framing Guide"
              >
                <HelpCircle className="h-3.5 w-3.5 text-[#00F2FE]" />
                <span>Guide</span>
              </button>

              {/* History Button */}
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("light");
                  nav.onHistory();
                }}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/[0.08] glass px-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer transition active:scale-95"
                title="Open Scan History Feed"
              >
                <History className="h-3.5 w-3.5 text-emerald-400" />
                <span>History</span>
              </button>

              {/* Pro Badge / Upgrade */}
              {prefs.isPro ? (
                <div className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-2.5 text-xs font-black text-emerald-300">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>👑 PRO</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic("medium");
                    prefs.onUpgrade();
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 text-xs font-black text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-slate-950 animate-pulse" />
                  <span>Upgrade Pro</span>
                </button>
              )}

              {/* Debug Toggle for Owner */}
              {debug?.isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic("light");
                    debug.setShowDebugDrawer(!debug.showDebugDrawer);
                  }}
                  className={`inline-flex h-8 items-center gap-1 rounded-xl border px-2 text-xs font-bold transition cursor-pointer active:scale-95 ${
                    debug.showDebugDrawer
                      ? "badge-active text-[#00F2FE]"
                      : "glass border-white/[0.08] text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bug className="h-3 w-3 text-[#00F2FE]" />
                  <span>Debug</span>
                </button>
              )}
            </div>
          </div>

          {/* Profit Threshold Slider & Presets Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs">
              <Sliders className="h-3.5 w-3.5 text-[#CCFF00] shrink-0" />
              <span className="hud-label">Chime Min Profit:</span>
              <span className="badge-neon-lime">
                ${prefs.minProfitThreshold} {prefs.currency}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={prefs.minProfitThreshold}
                onChange={(e) => {
                  triggerTactileHaptic("selection");
                  prefs.updateProfitThreshold(Number(e.target.value));
                }}
                className="w-full accent-[#CCFF00] h-1.5 bg-zinc-900 border border-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="hud-label mr-1">Presets:</span>
              {[10, 20, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic("selection");
                    prefs.updateProfitThreshold(preset);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer active:scale-95 ${
                    prefs.minProfitThreshold === preset
                      ? "bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.4)]"
                      : "glass border border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Owner Diagnostics Drawer Panel */}
          {debug?.isOwner && debug?.showDebugDrawer && (
            <div className="w-full rounded-xl glass-hud border border-white/[0.08] p-3 shadow-2xl space-y-2.5 mt-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#00F2FE] shrink-0" />
                  <h4 className="hud-label text-zinc-200">
                    Live AR Scan Diagnostics & Debugger
                  </h4>
                </div>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    debug.isMockFallback
                      ? "badge-info"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {debug.isMockFallback ? "⚠️ MOCK FALLBACK MODE" : "🟢 LIVE OPENAI VISION"}
                </span>
              </div>

              {debug.lastRawApiResponse ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="glass border border-white/[0.06] rounded-lg p-2 space-y-0.5">
                      <span className="hud-label block">Detected Item</span>
                      <span className="font-bold text-white truncate block text-[11px]">
                        {debug.lastRawApiResponse.analysis?.product_name ||
                          debug.lastRawApiResponse.detected_objects?.[0]?.product_name ||
                          "Unidentified Item"}
                      </span>
                    </div>

                    <div className="glass border border-white/[0.06] rounded-lg p-2 space-y-0.5">
                      <span className="hud-label block">Market Comp</span>
                      <span className="font-extrabold text-[#00F2FE] block text-[11px]">
                        ${debug.lastRawApiResponse.suggested_price_min || 0} - ${debug.lastRawApiResponse.suggested_price_max || 0} {debug.lastRawApiResponse.suggested_price_currency || "AUD"}
                      </span>
                    </div>

                    <div className="glass border border-white/[0.06] rounded-lg p-2 space-y-0.5">
                      <span className="hud-label block">Comps Source</span>
                      <span className="font-bold text-emerald-400 block text-[11px]">
                        {debug.lastRawApiResponse.comps_source === "browse_api"
                          ? "eBay Browse API"
                          : debug.lastRawApiResponse.comps_source === "sold_comps_api"
                          ? "Sold Comps API"
                          : "AI Estimate"}
                      </span>
                    </div>

                    <div className="glass border border-white/[0.06] rounded-lg p-2 space-y-0.5">
                      <span className="hud-label block">Scan Engine</span>
                      <span className="font-bold text-zinc-300 block text-[11px]">
                        {debug.lastRawApiResponse.isMockFallback ? "Simulated Catalog" : "OpenAI GPT-4o Vision"}
                      </span>
                    </div>
                  </div>

                  {debug.latestApiError && (
                    <div className="glass-hud border border-rose-500/30 rounded-lg p-2 space-y-0.5">
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">
                        Latest API Error:
                      </span>
                      <span className="text-xs font-mono text-rose-300 block break-words">
                        {debug.latestApiError}
                      </span>
                    </div>
                  )}

                  <pre className="text-[9px] text-emerald-400 glass border border-white/[0.06] rounded-lg p-2 font-mono overflow-x-auto max-h-32">
                    {JSON.stringify(debug.lastRawApiResponse, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-2 text-zinc-500 text-[11px]">
                  No frame scan payload recorded yet. Tap "Scan Now" to capture diagnostics.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
