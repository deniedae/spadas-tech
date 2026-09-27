"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Zap, Info } from "lucide-react";
import { ADMOB_CONFIG, getActiveBannerAdUnitId } from "@/lib/admob";

interface AdMobBannerProps {
  isPro?: boolean;
  className?: string;
  slotPlacement?: "bottom-dock" | "inline-feed" | "dashboard-footer" | "calculator-bottom";
  showUpgradeCta?: boolean;
}

export default function AdMobBanner({
  isPro = false,
  className = "",
  slotPlacement = "inline-feed",
  showUpgradeCta = true,
}: AdMobBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!isPro) {
      try {
        if (typeof window !== "undefined") {
          ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle =
            (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []).push({});
          setAdLoaded(true);
        }
      } catch {
        // Fallback gracefully to sponsor card
      }
    }
  }, [isPro]);

  // Pro subscribers never see ads
  if (isPro || !mounted) {
    return null;
  }

  const activeAdUnitId = getActiveBannerAdUnitId();
  const isTestAd = activeAdUnitId === ADMOB_CONFIG.testBannerAdUnitId;

  return (
    <div
      className={`w-full flex flex-col items-center justify-center my-3 px-2 ${className}`}
      data-admob-slot={slotPlacement}
      data-ad-unit={activeAdUnitId}
    >
      {/* Compliance Header: Must explicitly label advertisements per AdMob / Google policy */}
      <div className="w-full max-w-[420px] flex items-center justify-between px-2 py-0.5 text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
        <span className="flex items-center gap-1">
          <Info className="w-2.5 h-2.5 text-zinc-500" />
          Advertisement
          {isTestAd && (
            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans normal-case">
              Test Mode
            </span>
          )}
        </span>
        {showUpgradeCta && (
          <Link
            href="/settings"
            className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 lowercase font-sans text-[11px]"
          >
            <Sparkles className="w-2.5 h-2.5" />
            remove ads with pro
          </Link>
        )}
      </div>

      {/* Google AdSense / AdMob Web Ad Container */}
      <div className="w-full max-w-[420px] min-h-[60px] bg-zinc-900/90 border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg backdrop-blur-md relative flex flex-col items-center justify-center p-1.5 transition-all hover:border-zinc-700/60">
        {/* Real Google AdSense Banner Slot */}
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", minWidth: "300px", height: "50px", textAlign: "center" }}
          data-ad-client="ca-pub-1804367864263274"
          data-ad-slot="1361556776"
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />

        {/* Fallback House Sponsor Ad (Displays if Google ad unit is still undergoing AdMob review or loading) */}
        {!adLoaded && (
          <div className="w-full flex items-center justify-between p-1">
            <div className="flex items-center gap-2.5 z-10 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-inner">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                  Spadas Pro Sourcing
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 py-0.2 rounded font-normal">
                    0.4s Scans
                  </span>
                </span>
                <span className="text-[11px] text-zinc-400 truncate">
                  Unlimited scans, live eBay sold comps & 1-tap export
                </span>
              </div>
            </div>
            <div className="shrink-0 ml-2 z-10">
              <Link
                href="/settings"
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
