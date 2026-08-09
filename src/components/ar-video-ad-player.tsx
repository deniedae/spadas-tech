"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2, DollarSign } from "lucide-react";

export default function ARVideoAdPlayer() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioTriggered, setAudioTriggered] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setAudioTriggered(false);
            return 0;
          }
          const next = prev + 1;
          if (next >= 40 && !audioTriggered) {
            setAudioTriggered(true);
            playChimeSound();
          }
          return next;
        });
      }, 150); // 15s total loop duration
    }
    return () => clearInterval(interval);
  }, [isPlaying, audioTriggered]);

  const playChimeSound = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.3); // High profit chime

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // AudioContext fallback
    }
  };

  const seconds = ((progress / 100) * 15).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Mobile Video Frame */}
      <div className="relative mx-auto w-full max-w-[290px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950 flex flex-col justify-between p-4 select-none">
        {/* Background Image with Pan Animation */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/ar-ad-mockup.jpg"
            alt="Spadas AR Scanner Video Ad"
            fill
            className={`object-cover transition-transform duration-700 ${
              progress > 30 && progress < 70 ? "scale-105" : "scale-100"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
        </div>

        {/* Dynamic AR Scanner Layer */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              SPADAS LENS AR • LIVE
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="h-7 w-7 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Top Stage Indicator */}
          <div className="text-[10px] text-slate-300 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 font-mono">
            {progress < 25 && "STAGE 1: Scanning Thrift Shelf..."}
            {progress >= 25 && progress < 65 && "STAGE 2: Bounding Box Locked! 🔔"}
            {progress >= 65 && "STAGE 3: Auto AI Draft Generated"}
          </div>
        </div>

        {/* Dynamic Bounding Box Overlay (Simulated AR Scan) */}
        {progress >= 25 && progress <= 75 && (
          <div className="relative z-10 my-auto mx-auto w-[85%] rounded-2xl border-2 border-cyan-400 bg-cyan-500/10 backdrop-blur-[2px] p-3 shadow-2xl shadow-cyan-500/30 animate-pulse">
            <div className="flex items-center justify-between border-b border-cyan-400/40 pb-1.5 mb-2">
              <span className="text-[11px] font-extrabold text-cyan-200 uppercase tracking-wider">
                Vintage Rangefinder Camera
              </span>
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-300">Est. Goodwill Cost: $5.00</div>
              <div className="inline-flex items-center gap-1 font-black text-emerald-300 text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-400/40">
                <DollarSign className="h-3 w-3" /> +$48.50 Net Profit
              </div>
            </div>
          </div>
        )}

        {/* Audio Chime Notification Popup */}
        {audioTriggered && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 bg-emerald-500 text-slate-950 px-4 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 animate-bounce">
            <Sparkles className="h-4 w-4" /> 🔔 High-Profit Chime ($48.50)
          </div>
        )}

        {/* Bottom Ad Controls */}
        <div className="relative z-10 space-y-2">
          {/* Action CTA Overlay */}
          {progress > 65 && (
            <div className="bg-blue-600/90 backdrop-blur-md rounded-xl p-2.5 text-center text-white text-xs font-bold space-y-1 shadow-lg border border-blue-400/40">
              <div>Try Spadas Lens Free Today</div>
              <div className="text-[10px] text-blue-200 font-normal">Use Creator Code: FLIP20</div>
            </div>
          )}

          {/* Scrubber Progress Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
              <span>{seconds}s</span>
              <span>15.0s</span>
            </div>
          </div>

          {/* Player Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={() => {
                setProgress(0);
                setAudioTriggered(false);
                setIsPlaying(true);
              }}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Interactive Simulated Video Ad Player (15s Loop + Audio Chime)
      </div>
    </div>
  );
}
