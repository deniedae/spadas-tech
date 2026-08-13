"use client";

import React, { useState } from "react";
import { Camera, Layers, Sparkles, MapPin, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ProductMode {
  id: string;
  badge: string;
  title: string;
  icon: string;
  description: string;
  metrics: { label: string; value: string }[];
  actionText: string;
  actionHref: string;
}

const MODES: ProductMode[] = [
  {
    id: "lens-ar",
    badge: "LIVE 60FPS AR CAMERA",
    title: "Spadas Lens AR Vision",
    icon: "📷",
    description: "Continuous camera scanning over shelves & racks with real-time profit overlays, audio chimes, and live 30-day eBay AU sold comps.",
    metrics: [
      { label: "Frame Rate", value: "60 FPS" },
      { label: "Comp Accuracy", value: "100% AUD" },
      { label: "Scan Speed", value: "< 1.5 Seconds" },
    ],
    actionText: "Try Lens AR Scanner",
    actionHref: "/lens",
  },
  {
    id: "cross-lister",
    badge: "1-CLICK MULTI-POST",
    title: "Multi-Platform Cross-Lister",
    icon: "⚡",
    description: "Cross-list inventory across eBay, Facebook Marketplace, Depop, Vinted, and Poshmark in 1 tap with platform-specific descriptions.",
    metrics: [
      { label: "Supported Channels", value: "5 Marketplaces" },
      { label: "Copy Speed", value: "Instant" },
      { label: "Fee Calculators", value: "Automatic" },
    ],
    actionText: "Explore Cross-Lister",
    actionHref: "/listings",
  },
  {
    id: "future-grail",
    badge: "PREDICTIVE ANALYTICS",
    title: "30-Day Value Projection",
    icon: "🔮",
    description: "Cross-references scanned digicams & Y2K fashion against spiking TikTok hashtags & Reddit mentions before market prices adjust.",
    metrics: [
      { label: "Trend Sources", value: "TikTok & Reddit" },
      { label: "Prediction Window", value: "30 Days" },
      { label: "ROI Boost", value: "+85% Average" },
    ],
    actionText: "View Value Curves",
    actionHref: "/radar",
  },
  {
    id: "waze-radar",
    badge: "SPATIAL GPS RADAR",
    title: "The Waze for Resellers",
    icon: "🗺️",
    description: "Live spatial GPS map tracking high-yield op shops, flea markets, and live crowdsourced reseller reports nearby.",
    metrics: [
      { label: "Yield Heatmaps", value: "Real-Time GPS" },
      { label: "Store Reports", value: "Live Crowdsourced" },
      { label: "SLAM Clusters", value: "Anonymized" },
    ],
    actionText: "Launch Waze Radar",
    actionHref: "/radar",
  },
];

export default function LandingProductTabs() {
  const [activeMode, setActiveMode] = useState<ProductMode>(MODES[0]);

  return (
    <section className="my-16 space-y-8 animate-fade-in select-none">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Full-Suite Reseller Platform
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
          Everything You Need to Scale
        </h2>
        <p className="text-sm text-slate-300">
          Tap through the 4 core product engines built for high-volume resellers.
        </p>
      </div>

      {/* Interactive Tabs Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setActiveMode(mode)}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition cursor-pointer border ${
              activeMode.id === mode.id
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105"
                : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span className="text-base">{mode.icon}</span>
            <span>{mode.title}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Showcase Card */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 px-3 py-0.5 text-[10px] font-black text-cyan-300">
              {activeMode.badge}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <span>{activeMode.icon}</span>
              <span>{activeMode.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {activeMode.description}
            </p>
          </div>

          <Link
            href={activeMode.actionHref}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-sm font-extrabold text-white shadow-xl shadow-cyan-500/20 hover:opacity-90 transition shrink-0 active:scale-95"
          >
            <span>{activeMode.actionText}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          {activeMode.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl bg-slate-950 p-4 border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">{m.label}</span>
              <span className="text-base sm:text-xl font-black text-cyan-400 mt-1 block">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
