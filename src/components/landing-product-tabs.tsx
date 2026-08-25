"use client";

import React, { useState } from "react";
import { Camera, Layers, Sparkles, Calculator, ArrowRight, ShieldCheck, CheckCircle2, ShoppingBag } from "lucide-react";
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
    icon: "🔮",
    description: "Continuous camera scanning over thrift shelves & clothing racks with real-time profit overlays, audio chimes, and live 30-day eBay AU sold comps.",
    metrics: [
      { label: "Scan Speed", value: "< 1.2 Seconds" },
      { label: "Comp Accuracy", value: "100% Live AUD" },
      { label: "Detection Mode", value: "Continuous 60FPS" },
    ],
    actionText: "Try Lens AR Scanner",
    actionHref: "/lens",
  },
  {
    id: "ai-studio",
    badge: "MARKETPLACE COPYWRITER",
    title: "AI Listing Studio",
    icon: "🤖",
    description: "Generate high-converting 80-character eBay SEO titles, condition notes, and detailed descriptions from single or multi-angle photos in seconds.",
    metrics: [
      { label: "eBay SEO Titles", value: "80-Char Max" },
      { label: "Multi-Platform", value: "eBay, FB, Depop" },
      { label: "Generation Time", value: "2.4 Seconds" },
    ],
    actionText: "Try AI Generator",
    actionHref: "/generator",
  },
  {
    id: "ebay-sync",
    badge: "AUTOMATED PUBLISHING",
    title: "1-Click eBay AU Publishing",
    icon: "🛍️",
    description: "Seamlessly publish scan drafts directly to your eBay account in the background. Automated inventory management, Australian warehouse registration, and live offers.",
    metrics: [
      { label: "API Integration", value: "Official REST" },
      { label: "Publish Speed", value: "1-Tap Instant" },
      { label: "Sync Status", value: "Live Background" },
    ],
    actionText: "Manage Listings",
    actionHref: "/listings",
  },
  {
    id: "profit-calc",
    badge: "REAL-TIME FEE SIMULATOR",
    title: "Reseller Profit Calculator",
    icon: "💰",
    description: "Simulate exact net profit, margin %, and ROI % across eBay Australia (13.4% + $0.33), Depop, and Facebook Marketplace before spending a single dollar.",
    metrics: [
      { label: "Marketplace Fees", value: "Exact 13.4%" },
      { label: "Postage Satchels", value: "AusPost Pre-set" },
      { label: "Margin Insights", value: "Instant ROI %" },
    ],
    actionText: "Calculate Profits",
    actionHref: "/calculator",
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
          Explore the 4 core product engines built for high-volume thrifters and resellers.
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
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105 font-black"
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
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/20 hover:opacity-90 transition shrink-0 active:scale-95 cursor-pointer"
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
