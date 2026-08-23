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

export interface LensControlsBarProps {
  scan: {
    mode: "live" | "deep" | "sweep";
    setMode: (m: "live" | "deep" | "sweep") => void;
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
    zoomLevel: number;
    setZoomLevel: (z: number) => void;
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
    <div className="w-full box-border rounded-2xl bg-slate-950/95 backdrop-blur-md p-3 sm:p-4 border border-slate-800/80 shadow-2xl space-y-3">
      {/* ── ROW 1: Focused Primary Controls (Always Visible) ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              scan.setMode("sweep");
              toast.success("⚡ Continuous Sweep Active (Walk & Scan)");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              scan.mode === "sweep"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Sweep
          </button>
          <button
            type="button"
            onClick={() => {
              scan.setMode("live");
              toast.success("🎯 Live Focus Mode Active");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              scan.mode === "live"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🎯 Focus
          </button>
          <button
            type="button"
            onClick={() => {
              scan.setMode("deep");
              toast.success("🔬 Deep Fusion Active");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              scan.mode === "deep"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🔬 Deep
          </button>
        </div>

        {/* Scan Now & Auto-Scan Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={scan.onScanNow}
            disabled={scan.isAnalyzing}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scan.isAnalyzing ? "animate-spin" : ""}`} />
            <span>{scan.isAnalyzing ? "Scanning..." : "Scan Now"}</span>
          </button>

          <button
            type="button"
            onClick={() => scan.setAutoActive(!scan.autoActive)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition cursor-pointer ${
              scan.autoActive
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black"
                : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{scan.autoActive ? "Auto: ON" : "Auto: OFF"}</span>
          </button>

          {/* Grail Mode Icon-Only Toggle */}
          <button
            type="button"
            onClick={() => {
              prefs.setGrailMode(!prefs.grailMode);
              toast.success(
                !prefs.grailMode ? "🚨 AR Grail Detector Active ($80+ Alert)!" : "Grail Detector muted."
              );
            }}
            title={prefs.grailMode ? "Grail Mode ON ($80+ Alert)" : "Grail Mode OFF"}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
              prefs.grailMode
                ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30 animate-pulse"
                : "bg-white/10 text-slate-400 border-white/20 hover:bg-white/20 hover:text-white"
            }`}
          >
            <Trophy className="h-4 w-4" />
          </button>

          {/* Expandable Options Drawer Toggle ("⚙️ More") */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer ${
              isMoreOpen
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/10 text-slate-300 border-white/20 hover:bg-white/20 hover:text-white"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Options</span>
            {isMoreOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Stop Camera Button */}
          <button
            type="button"
            onClick={scan.onStop}
            className="inline-flex h-9 items-center gap-1 rounded-xl bg-red-600/90 hover:bg-red-500 px-3 text-xs font-bold text-white cursor-pointer transition active:scale-95"
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
          {/* Secondary Controls Grid */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left group: Hardware & Audio */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Torch / Flashlight */}
              <button
                type="button"
                onClick={hardware.onToggleTorch}
                title={hardware.torchSupported ? "Toggle Hardware Flashlight" : "Flashlight not supported on this device"}
                className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition cursor-pointer ${
                  hardware.torchEnabled
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Sun className={`h-3.5 w-3.5 ${hardware.torchEnabled ? "text-slate-950 animate-pulse" : "text-amber-400"}`} />
                <span>{hardware.torchEnabled ? "Torch ON" : "Torch"}</span>
              </button>

              {/* Zoom Buttons (1x, 2x, 3x) */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-xl p-0.5">
                <Search className="h-3 w-3 text-cyan-400 ml-1.5 mr-0.5 shrink-0" />
                {[1, 2, 3].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => hardware.setZoomLevel(z)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      hardware.zoomLevel === z
                        ? "bg-cyan-400 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              {/* Sound Cues Toggle */}
              <button
                type="button"
                onClick={audio.onToggleSound}
                className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer ${
                  audio.soundEnabled
                    ? "bg-slate-900 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {audio.soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
                <span>{audio.soundEnabled ? "Audio ON" : "Muted"}</span>
              </button>

              {/* Voice Control Toggle */}
              <button
                type="button"
                onClick={audio.onToggleVoice}
                className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer ${
                  audio.voiceListening
                    ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {audio.voiceListening ? <Mic className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> : <MicOff className="h-3.5 w-3.5 text-slate-500" />}
                <span>{audio.voiceListening ? "Voice Active" : "Voice"}</span>
              </button>
            </div>

            {/* Right group: Currency, Nav, Pro */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Currency Selector */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-xl p-0.5">
                {(["AUD", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((c) => {
                  const conf = CURRENCY_CONFIGS[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        prefs.setCurrency(c);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("spadas_selected_currency", c);
                        }
                        toast.success(`Switched Comps to ${conf.flag} ${c} (${conf.ebaySite})`);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        prefs.currency === c
                          ? "bg-emerald-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
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
                onClick={nav.onGuide}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                title="Open AR Camera Framing Guide"
              >
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                <span>Guide</span>
              </button>

              {/* History Button */}
              <button
                type="button"
                onClick={nav.onHistory}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer transition shadow-sm shadow-emerald-500/20"
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
                  onClick={prefs.onUpgrade}
                  className="inline-flex h-8 items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 px-3 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:scale-105 transition cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-slate-950 animate-pulse" />
                  <span>Upgrade Pro</span>
                </button>
              )}

              {/* Debug Toggle for Owner */}
              {debug?.isOwner && (
                <button
                  type="button"
                  onClick={() => debug.setShowDebugDrawer(!debug.showDebugDrawer)}
                  className={`inline-flex h-8 items-center gap-1 rounded-xl border px-2 text-xs font-bold transition cursor-pointer ${
                    debug.showDebugDrawer
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <Bug className="h-3 w-3 text-amber-400" />
                  <span>Debug</span>
                </button>
              )}
            </div>
          </div>

          {/* Profit Threshold Slider & Presets Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
            <div className="flex items-center gap-2 text-xs">
              <Sliders className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-300 text-[11px]">Chime Min Profit:</span>
              <span className="font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded text-xs">
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
                onChange={(e) => prefs.updateProfitThreshold(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold mr-1">Presets:</span>
              {[10, 20, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => prefs.updateProfitThreshold(preset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                    prefs.minProfitThreshold === preset
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Owner Diagnostics Drawer Panel */}
          {debug?.isOwner && debug?.showDebugDrawer && (
            <div className="w-full rounded-xl bg-slate-950 border border-amber-500/30 p-3 shadow-2xl space-y-2.5 backdrop-blur-md mt-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <h4 className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    Live AR Scan Diagnostics & Debugger
                  </h4>
                </div>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    debug.isMockFallback
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {debug.isMockFallback ? "⚠️ MOCK FALLBACK MODE" : "🟢 LIVE OPENAI VISION"}
                </span>
              </div>

              {debug.lastRawApiResponse ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-semibold block">Detected Item</span>
                      <span className="font-bold text-white truncate block text-[11px]">
                        {debug.lastRawApiResponse.analysis?.product_name ||
                          debug.lastRawApiResponse.detected_objects?.[0]?.product_name ||
                          "Unidentified Item"}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-semibold block">Market Comp</span>
                      <span className="font-extrabold text-cyan-300 block text-[11px]">
                        ${debug.lastRawApiResponse.suggested_price_min || 0} - ${debug.lastRawApiResponse.suggested_price_max || 0} {debug.lastRawApiResponse.suggested_price_currency || "AUD"}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-semibold block">Comps Source</span>
                      <span className="font-bold text-emerald-400 block text-[11px]">
                        {debug.lastRawApiResponse.comps_source === "browse_api"
                          ? "eBay Browse API"
                          : debug.lastRawApiResponse.comps_source === "sold_comps_api"
                          ? "Sold Comps API"
                          : "AI Estimate"}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-semibold block">Scan Engine</span>
                      <span className="font-bold text-amber-300 block text-[11px]">
                        {debug.lastRawApiResponse.isMockFallback ? "Simulated Catalog" : "OpenAI GPT-4o Vision"}
                      </span>
                    </div>
                  </div>

                  {debug.latestApiError && (
                    <div className="bg-red-950/60 border border-red-500/40 rounded-lg p-2 space-y-0.5">
                      <span className="text-[9px] font-bold text-red-300 uppercase tracking-wider block">
                        Latest API Error:
                      </span>
                      <span className="text-xs font-mono text-red-200 block break-words">
                        {debug.latestApiError}
                      </span>
                    </div>
                  )}

                  <pre className="text-[9px] text-emerald-400 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono overflow-x-auto max-h-32">
                    {JSON.stringify(debug.lastRawApiResponse, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-2 text-slate-500 text-[11px]">
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
