"use client";

import React, { useEffect, useState, useRef } from "react";
import { playLevelLockSound, triggerLevelLockHaptic } from "@/lib/audio-haptic-engine";

interface OpticalHorizonLevelerProps {
  soundEnabled?: boolean;
}

export default function OpticalHorizonLeveler({ soundEnabled = true }: OpticalHorizonLevelerProps) {
  const [roll, setRoll] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [isLevel, setIsLevel] = useState<boolean>(false);
  const [hasOrientation, setHasOrientation] = useState<boolean>(false);
  const wasLevelRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setHasOrientation(true);
        // Smooth roll & pitch
        const currentRoll = Math.max(-45, Math.min(45, Math.round(e.gamma)));
        const currentPitch = Math.max(-45, Math.min(45, Math.round(e.beta - 45))); // biased for upright viewfinder holding

        setRoll(currentRoll);
        setPitch(currentPitch);

        const level = Math.abs(currentRoll) <= 1.5;
        setIsLevel(level);

        if (level && !wasLevelRef.current) {
          triggerLevelLockHaptic();
          if (soundEnabled) {
            playLevelLockSound();
          }
        }
        wasLevelRef.current = level;
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, { passive: true });
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [soundEnabled]);

  return (
    <div className="pointer-events-none select-none flex items-center justify-center relative w-48 h-8">
      {/* Horizon Level Line */}
      <div
        style={{
          transform: `rotate(${roll}deg)`,
          transition: "transform 100ms ease-out, border-color 150ms ease",
        }}
        className="relative w-36 h-[2px] flex items-center justify-between"
      >
        {/* Left Wing */}
        <div
          className={`h-full w-12 rounded-full transition-colors duration-150 ${
            isLevel
              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
              : "bg-white/40 shadow-sm"
          }`}
        />

        {/* Center Level Reticle Dot & Level Readout */}
        <div className="flex items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-150 ${
              isLevel
                ? "border-emerald-400 bg-emerald-400/30 scale-110 shadow-[0_0_8px_#34d399]"
                : "border-white/50 bg-transparent"
            }`}
          />
        </div>

        {/* Right Wing */}
        <div
          className={`h-full w-12 rounded-full transition-colors duration-150 ${
            isLevel
              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
              : "bg-white/40 shadow-sm"
          }`}
        />
      </div>

      {/* Numerical Pitch & Roll Degree Telemetry */}
      {hasOrientation && (
        <div
          className={`absolute -bottom-4 text-[9px] font-mono font-bold tracking-widest uppercase transition-colors ${
            isLevel ? "text-emerald-400" : "text-white/40"
          }`}
        >
          {isLevel ? "HORIZON LEVEL 0.0°" : `${roll > 0 ? "+" : ""}${roll}°`}
        </div>
      )}
    </div>
  );
}
