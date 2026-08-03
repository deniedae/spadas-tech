"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Volume2, VolumeX, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw } from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";

interface DetectedHit {
  id: string;
  name: string;
  category: string;
  estimatedValue: number;
  estRoi: number;
  verdict: "BUY" | "CAUTION" | "PASS";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number }; // percentage coords
}

export default function SpadasLensCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeHits, setActiveHits] = useState<DetectedHit[]>([]);
  const [capturedLog, setCapturedLog] = useState<DetectedHit[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Simulated AI vision detection library for thrift store scanning
  const MOCK_DETECTABLE_ITEMS = [
    { name: "Pokemon Yellow Version Game Boy", category: "Retro Gaming", estimatedValue: 95, estRoi: 340, verdict: "BUY" as const, confidence: 0.94 },
    { name: "Vintage 90s Nike Spellout Windbreaker", category: "Streetwear", estimatedValue: 110, estRoi: 280, verdict: "BUY" as const, confidence: 0.91 },
    { name: "Sony PS5 DualSense Controller", category: "Gaming", estimatedValue: 65, estRoi: 190, verdict: "BUY" as const, confidence: 0.96 },
    { name: "North Face 700 Nuptse Puffer Jacket", category: "Outerwear", estimatedValue: 185, estRoi: 420, verdict: "BUY" as const, confidence: 0.98 },
    { name: "Canon AE-1 35mm SLR Camera", category: "Vintage Tech", estimatedValue: 160, estRoi: 310, verdict: "BUY" as const, confidence: 0.89 },
    { name: "Generic Fast Fashion T-Shirt", category: "Clothing", estimatedValue: 8, estRoi: 0, verdict: "PASS" as const, confidence: 0.78 },
    { name: "Game Boy Color Atomic Purple", category: "Retro Gaming", estimatedValue: 115, estRoi: 260, verdict: "BUY" as const, confidence: 0.92 },
    { name: "Charizard Base Set Holo Card", category: "Collectibles", estimatedValue: 290, estRoi: 650, verdict: "BUY" as const, confidence: 0.95 },
  ];

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setScanning(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access required for Spadas Lens AR Sourcing.");
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setScanning(false);
    setActiveHits([]);
  };

  // Speak Audio Cue
  const speakCue = (text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  // Play AR Chime Sound
  const playChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  // Real-time AR frame scanning interval
  useEffect(() => {
    if (!scanning) return;

    const interval = setInterval(() => {
      // Pick random 1 or 2 items to project as AR bounding boxes
      const numHits = Math.random() > 0.4 ? 1 : 2;
      const newHits: DetectedHit[] = [];

      for (let i = 0; i < numHits; i++) {
        const item = MOCK_DETECTABLE_ITEMS[Math.floor(Math.random() * MOCK_DETECTABLE_ITEMS.length)];
        const hit: DetectedHit = {
          id: `hit-${Date.now()}-${i}`,
          ...item,
          bbox: {
            x: Math.floor(Math.random() * 45) + 15,
            y: Math.floor(Math.random() * 45) + 15,
            width: Math.floor(Math.random() * 25) + 25,
            height: Math.floor(Math.random() * 25) + 25,
          },
        };
        newHits.push(hit);

        // If high-value BUY hit, trigger audio & save to log
        if (hit.verdict === "BUY") {
          playChime();
          speakCue(`Grab ${hit.name}. Value ${fmtMoney(hit.estimatedValue)}.`);
          setCapturedLog((prev) => [hit, ...prev.filter((p) => p.name !== hit.name)].slice(0, 10));
        }
      }

      setActiveHits(newHits);
    }, 3200);

    return () => clearInterval(interval);
  }, [scanning, soundEnabled]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Video Viewport Container */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-slate-950 shadow-2xl">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-3 text-slate-300">
            <ShieldAlert className="h-12 w-12 text-amber-400" />
            <p className="text-sm font-semibold">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white shadow-md hover:bg-cyan-500"
            >
              <RefreshCw className="h-4 w-4" /> Retry Camera Access
            </button>
          </div>
        ) : stream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Radar Scanning HUD overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none border-[3px] border-cyan-500/30 rounded-3xl">
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-slate-950/70 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/30">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                LIVE AR SPADAS LENS RADAR
              </div>
            </div>

            {/* AR Bounding Box Overlays */}
            {activeHits.map((hit) => {
              const isBuy = hit.verdict === "BUY";
              const borderColor = isBuy ? "border-emerald-400 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10";
              const badgeBg = isBuy ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white";

              return (
                <div
                  key={hit.id}
                  style={{
                    left: `${hit.bbox.x}%`,
                    top: `${hit.bbox.y}%`,
                    width: `${hit.bbox.width}%`,
                    height: `${hit.bbox.height}%`,
                  }}
                  className={`absolute z-20 transition-all duration-300 rounded-2xl border-2 shadow-2xl flex flex-col justify-between p-3 animate-pulse ${borderColor}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeBg}`}>
                      {isBuy ? `🟩 HIGH ROI HIT (+${hit.estRoi}%)` : `🟥 PASS / LOW MARGIN`}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-950/85 backdrop-blur-md p-2 text-white border border-white/10 space-y-0.5">
                    <p className="text-xs font-bold truncate">{hit.name}</p>
                    {isBuy && (
                      <p className="text-[11px] font-extrabold text-emerald-400">
                        Est. Value: {fmtMoney(hit.estimatedValue)} AUD
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Placeholder View before starting */
          <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <Camera className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-xl font-bold">Start Spadas Lens AR Stream</h3>
              <p className="text-xs text-slate-300">
                Pan your camera across clothing racks or shelves. Spadas AI scans frame-by-frame and chimes in your ear when high-margin items appear.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 text-sm font-bold text-white shadow-xl hover:opacity-90 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" /> Start Live AR Camera
            </button>
          </div>
        )}

        {/* Camera Controls Bar */}
        {stream && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between gap-3 rounded-2xl bg-slate-950/80 backdrop-blur-md p-3 border border-white/20">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Scanning 30 FPS...</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                <span>{soundEnabled ? "Audio Cues ON" : "Muted"}</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex h-9 items-center rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500"
              >
                Stop Stream
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Captured High-ROI Hits Log */}
      {capturedLog.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Scanned High-ROI Hits ({capturedLog.length})
            </h3>
            <span className="text-xs text-muted-foreground">Captured from Live AR Stream</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {capturedLog.map((item) => (
              <div key={item.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 uppercase">
                    +{item.estRoi}% ROI
                  </span>
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                </div>
                <h4 className="text-sm font-bold text-foreground leading-snug">{item.name}</h4>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  Est. Market Value: {fmtMoney(item.estimatedValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
