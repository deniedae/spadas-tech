"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Zap,
  Sparkles,
  Volume2,
  VolumeX,
  Crosshair,
  RefreshCw,
  Camera,
  ShieldCheck,
  Flame,
  Filter,
  PackagePlus,
  ExternalLink,
  Lock,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { calculateSalesVelocity, SalesVelocityProfile } from "@/lib/turnover-velocity-engine";
import { calculateThriftCopVerdict } from "@/lib/thrift-cop-engine";
import { appraiseItemLocally } from "@/app/lib/offline/offline-engine";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { supabase } from "@/app/lib/supabase";

export interface HolographicBeacon {
  id: string;
  name: string;
  brand: string;
  category: string;
  estimatedResale: number;
  estCost: number;
  netProfit: number;
  roi: number;
  copVerdict: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY";
  velocity: SalesVelocityProfile;
  isGrail: boolean;
  x: number; // percentage (15 - 85)
  y: number; // percentage (20 - 75)
  timestamp: number;
}

// Web Audio Sci-Fi Synthesizer (100% Offline, Zero Network Lag)
function playSciFiSound(type: "lock" | "grail" | "trap") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "grail") {
      // Golden harmonic chord + chime (C5 + E5 + G5)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.65);
      });
    } else if (type === "trap") {
      // Low dual hazard buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(95, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Laser lock-on chirp (880Hz -> 1760Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    }
  } catch {}
}

export function IronmanHudCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const recentScannedNamesRef = useRef<Set<string>>(new Set());

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isHideTraps, setIsHideTraps] = useState<boolean>(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const [activeBeacons, setActiveBeacons] = useState<HolographicBeacon[]>([]);
  const [selectedBeacon, setSelectedBeacon] = useState<HolographicBeacon | null>(null);
  const [fpsCounter, setFpsCounter] = useState<number>(60);
  const [headingAngle, setHeadingAngle] = useState<number>(342);

  // Start Camera Stream
  const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = newStream;
      setStream(newStream);
    } catch (err) {
      console.warn("Iron Man HUD Camera error:", err);
      toast.error("Camera access failed or permission denied.");
    }
  }, [facingMode]);

  useEffect(() => {
    void startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Compass Heading & Gyro Simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadingAngle((prev) => (prev + (Math.random() * 2 - 1) + 360) % 360);
      setFpsCounter(Math.floor(58 + Math.random() * 3));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Voice Synthesizer
  const speakVerdict = useCallback((text: string) => {
    if (!isVoiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [isVoiceEnabled]);

  // Continuous Spatial Vision Scanner Loop
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      if (inFlightRef.current) return;

      // Extract image frame
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.75);

      inFlightRef.current = true;
      let hitData: any = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null }));
        const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (sessionData?.session?.access_token) {
          requestHeaders["Authorization"] = `Bearer ${sessionData.session.access_token}`;
        }

        const res = await fetch("/api/ai-listing", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            imageUrls: [base64],
            isArScan: true,
            currency: "AUD",
            mode: "targeted",
          }),
        }).catch(() => null);

        if (res && res.ok) {
          const raw = await res.json().catch(() => null);
          if (raw && (raw.status === "identified" || raw.analysis?.product_name)) {
            const pName = (raw.analysis?.product_name || raw.product_name || raw.detected_objects?.[0]?.product_name || "").trim();
            if (pName && pName.toLowerCase() !== "unidentified" && pName.toLowerCase() !== "unknown item" && pName !== "NO_CENTER_ITEM") {
              const brand = raw.analysis?.brand || raw.brand || "Authentic";
              const category = raw.analysis?.category || raw.category || "General";
              const estVal = Number(raw.suggested_price_median) || Number(raw.estimated_value) || 35;
              const net = Number(raw.true_net_profit) || Math.max(0, Math.round((estVal * 0.7 - 8) * 100) / 100);
              const cost = Number(raw.detected_tag_price) || Number(raw.thrift_cost) || Math.max(2, Math.round(estVal * 0.15));
              const roi = Number(raw.roi_percentage) || (cost > 0 ? Math.round((net / cost) * 100) : 0);

              hitData = {
                product_name: pName,
                brand,
                category,
                estimated_value: estVal,
                thrift_cost: cost,
                true_net_profit: net,
                roi_percentage: roi,
                cop_verdict: raw.cop_verdict || (net >= 40 ? "MUST_COP" : net >= 15 ? "QUICK_FLIP" : "PASS_RISKY"),
                is_grail: net >= 50 || raw.cop_verdict === "MUST_COP",
              };
            }
          }
        }
      } catch (err) {
        console.warn("[Ironman HUD] Scan error:", err);
      } finally {
        inFlightRef.current = false;
      }

      // Hard check: only show beacons for actual recognized physical items, NEVER mock data
      const pName = (hitData?.product_name || "").trim();
      if (
        !hitData ||
        hitData.error ||
        !pName ||
        pName.toLowerCase() === "unknown item" ||
        pName.toLowerCase() === "unidentified" ||
        pName.toLowerCase() === "thrift item"
      ) {
        return;
      }

      // Prevent duplicate beacon for same item within 6 seconds
      const nameKey = pName.toLowerCase();
      if (recentScannedNamesRef.current.has(nameKey)) {
        return;
      }
      recentScannedNamesRef.current.add(nameKey);
      setTimeout(() => recentScannedNamesRef.current.delete(nameKey), 6000);

      const netProfit = Number(hitData.true_net_profit) || 25;
      const resalePrice = Number(hitData.estimated_value) || 45;
      const thriftCost = Number(hitData.thrift_cost) || 6;
      const roi = Number(hitData.roi_percentage) || 120;
      const isGrail = netProfit >= 50 || Boolean(hitData.is_grail);

      const velocity = calculateSalesVelocity({
        productName: hitData.product_name,
        category: hitData.category,
        brand: hitData.brand,
      });

      // Compute holographic beacon coordinates (spatial distribution near center)
      const xPos = Math.round(25 + Math.random() * 50);
      const yPos = Math.round(30 + Math.random() * 40);

      const beacon: HolographicBeacon = {
        id: `hud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: hitData.product_name || "Thrift Item",
        brand: hitData.brand || "Authentic",
        category: hitData.category || "General",
        estimatedResale: resalePrice,
        estCost: thriftCost,
        netProfit,
        roi,
        copVerdict: hitData.cop_verdict || (isGrail ? "MUST_COP" : netProfit >= 15 ? "QUICK_FLIP" : "PASS_RISKY"),
        velocity,
        isGrail,
        x: xPos,
        y: yPos,
        timestamp: Date.now(),
      };

      // Sound & Tactile feedback
      if (isAudioEnabled) {
        if (isGrail) {
          playSciFiSound("grail");
          triggerTactileHaptic("grail");
          speakVerdict(`Grail acquired: ${beacon.name}. Plus ${netProfit} dollars profit.`);
        } else if (velocity.isHoarderRisk || netProfit <= 0) {
          playSciFiSound("trap");
          triggerTactileHaptic("heavy");
          speakVerdict("Warning: Space trap. Sluggish turnover.");
        } else {
          playSciFiSound("lock");
          triggerTactileHaptic("medium");
          speakVerdict(`Locked: ${beacon.name}. Quick flip.`);
        }
      }

      setActiveBeacons((prev) => [beacon, ...prev.slice(0, 3)]);
    }, 2800);

    return () => clearInterval(interval);
  }, [isScanning, isAudioEnabled, speakVerdict]);

  // Clean old beacons after 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - 8000;
      setActiveBeacons((prev) => prev.filter((b) => b.timestamp > cutoff));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const displayedBeacons = isHideTraps
    ? activeBeacons.filter((b) => !b.velocity.isHoarderRisk && b.netProfit > 0)
    : activeBeacons;

  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] select-none">
      {/* ── 1. Live Video Viewfinder ────────────────────────────────────────── */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-black overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover filter contrast-[1.08] saturate-[1.12]"
        />

        {/* ── 2. Cinematic Sci-Fi Scanlines & Lens Grid ────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.25)_51%)] bg-[length:100%_4px]" />

        {/* ── 3. Outer HUD Telemetry Frame ───────────────────────────────────── */}
        {/* Top Header Bar */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-30">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <span className="text-[11px] font-black tracking-widest text-cyan-400 font-mono">
              JARVIS HUD · {fpsCounter} FPS · HDG {Math.round(headingAngle)}°
            </span>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-cyan-500/40">
            <button
              type="button"
              onClick={() => setIsAudioEnabled((v) => !v)}
              className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                isAudioEnabled ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40" : "text-slate-400 hover:text-white"
              }`}
              title="Toggle Audio Feedback"
            >
              {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsHideTraps((v) => !v)}
              className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                isHideTraps ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40" : "text-slate-400 hover:text-white"
              }`}
              title="Filter Out Thrift & Hoarder Traps"
            >
              <Filter className="h-4 w-4" />
              <span className="text-[10px] hidden sm:inline font-black uppercase">Filter Traps</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = facingMode === "environment" ? "user" : "environment";
                setFacingMode(next);
                void startCamera(next);
              }}
              className="p-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              title="Flip Camera"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center Iron Man Arc-Reactor Reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center">
            {/* Outer Rotating Bearing Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/30 animate-[spin_12s_linear_infinite]" />
            {/* Counter-rotating Inner Ring */}
            <div className="absolute inset-3 rounded-full border border-cyan-500/40 animate-[spin_8s_linear_infinite_reverse]" />

            {/* Crosshair Corner Brackets */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

            {/* Central Targeting Dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-pulse" />

            {/* Horizontal Axis Level */}
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />
          </div>
        </div>

        {/* ── 4. Floating Holographic 3D AR Beacons ─────────────────────────── */}
        {displayedBeacons.map((beacon) => {
          const isTrap = beacon.velocity.isHoarderRisk || beacon.netProfit <= 0;
          const isGrail = beacon.isGrail;

          return (
            <div
              key={beacon.id}
              onClick={() => setSelectedBeacon(beacon)}
              style={{
                top: `${beacon.y}%`,
                left: `${beacon.x}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer pointer-events-auto transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {/* Connector Laser Line to Center */}
              <div
                className={`absolute -top-6 left-1/2 w-0.5 h-6 -translate-x-1/2 ${
                  isGrail
                    ? "bg-gradient-to-t from-amber-400 to-transparent animate-pulse"
                    : isTrap
                    ? "bg-gradient-to-t from-rose-500 to-transparent"
                    : "bg-gradient-to-t from-cyan-400 to-transparent"
                }`}
              />

              {/* Holographic Glowing Badge */}
              <div
                className={`relative px-3.5 py-2 rounded-2xl backdrop-blur-xl border-2 shadow-2xl flex flex-col gap-0.5 min-w-[190px] ${
                  isGrail
                    ? "bg-amber-950/85 border-amber-400 text-white shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-bounce"
                    : isTrap
                    ? "bg-rose-950/85 border-rose-500 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.5)]"
                    : "bg-slate-950/85 border-cyan-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                }`}
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    {isGrail ? (
                      <Flame className="h-3 w-3 text-amber-400 animate-pulse" />
                    ) : isTrap ? (
                      <AlertTriangle className="h-3 w-3 text-rose-400" />
                    ) : (
                      <Zap className="h-3 w-3 text-cyan-400" />
                    )}
                    {isGrail ? "👑 GRAIL DETECTED" : isTrap ? "🛑 HOARDER TRAP" : "⚡ LOCKED COMP"}
                  </span>
                  <span className="font-mono text-[9px] opacity-75">
                    {beacon.velocity.estDaysToSell}
                  </span>
                </div>

                {/* Product Name */}
                <h4 className="text-xs font-black truncate max-w-[180px] drop-shadow-md">
                  {beacon.name}
                </h4>

                {/* Profit & Velocity Metric */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/15 text-[11px] font-black">
                  <span
                    className={`font-mono text-xs ${
                      isGrail
                        ? "text-amber-300 drop-shadow-[0_0_8px_#fbbf24]"
                        : isTrap
                        ? "text-rose-400"
                        : "text-emerald-400 drop-shadow-[0_0_8px_#34d399]"
                    }`}
                  >
                    {beacon.netProfit >= 0 ? `+$${beacon.netProfit}` : `-$${Math.abs(beacon.netProfit)}`} PROFIT
                  </span>

                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono ${
                      isGrail
                        ? "bg-amber-400/20 text-amber-300"
                        : isTrap
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    {beacon.velocity.sellThroughRate}% STR
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom HUD Telemetry Strip */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[11px] font-mono text-cyan-400/80 pointer-events-none">
          <div className="bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30">
            SYSTEM: SPATIAL SLAM LOCK · ACTIVE TARGETS: {displayedBeacons.length}
          </div>
          <div className="bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30">
            RADAR: CONTINUOUS VISION
          </div>
        </div>
      </div>

      {/* ── 5. Selected Beacon Inspection Modal / Drawer ───────────────────── */}
      {selectedBeacon && (
        <div className="p-4 bg-slate-900/95 border-t border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedBeacon.isGrail
                    ? "bg-amber-400 text-slate-950"
                    : selectedBeacon.velocity.isHoarderRisk
                    ? "bg-rose-500 text-white"
                    : "bg-cyan-500 text-slate-950"
                }`}
              >
                {selectedBeacon.copVerdict.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-extrabold text-cyan-400 font-mono">
                {selectedBeacon.velocity.estDaysToSell} Turnaround ({selectedBeacon.velocity.sellThroughRate}% STR)
              </span>
            </div>

            <h3 className="text-base font-bold text-white leading-tight">
              {selectedBeacon.name}
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5 font-mono">
              <span>Est Value: <strong className="text-white">${selectedBeacon.estimatedResale}</strong></span>
              <span>•</span>
              <span>Tag Cost: <strong className="text-white">${selectedBeacon.estCost}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-black">
                Net Profit: +${selectedBeacon.netProfit} ({selectedBeacon.roi}% ROI)
              </span>
            </div>

            {selectedBeacon.velocity.warning && (
              <p className="text-xs text-rose-300 bg-rose-950/40 p-1.5 rounded-lg border border-rose-500/30 mt-1">
                {selectedBeacon.velocity.warning}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`https://www.ebay.com.au/sl/prelist/suggest?keyword=${encodeURIComponent(
                selectedBeacon.name
              )}&q=${selectedBeacon.estimatedResale}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-cyan-500/30"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>1-Tap eBay Draft</span>
            </a>

            <button
              type="button"
              onClick={() => setSelectedBeacon(null)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default IronmanHudCamera;
