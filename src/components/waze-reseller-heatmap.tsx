"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Flame, Sparkles, Navigation, Plus, AlertCircle, RefreshCw, Radio } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";

interface StoreHeatPoint {
  id: string;
  name: string;
  category: string;
  yieldScore: number; // 0..100
  address: string;
  distMiles: number;
  recentScannedItem?: string;
  recentProfit?: number;
  recentReport?: string;
  reportTime?: string;
  status: "HOT" | "MODERATE" | "COOL";
  coordinates: { x: number; y: number }; // Percentage coords on canvas map
}

const INITIAL_STORES: StoreHeatPoint[] = [
  {
    id: "store-schofields-salvos",
    name: "Salvos Stores Schofields",
    category: "Fresh Rollout • Thrift & Media",
    yieldScore: 99,
    address: "Railway Terrace, Schofields NSW",
    distMiles: 0.8,
    recentScannedItem: "Nintendo Switch & Digicam Bundle",
    recentProfit: 195,
    recentReport: "🚨 FRESH STOCK ROLLOUT! 3+ unique resellers scanned high-profit items in past 30 mins!",
    reportTime: "4m ago",
    status: "HOT",
    coordinates: { x: 45, y: 28 },
  },
  {
    id: "store-1",
    name: "Salvos Stores Newtown",
    category: "Thrift & Vintage Clothing",
    yieldScore: 96,
    address: "King St, Newtown NSW",
    distMiles: 1.2,
    recentScannedItem: "Sony Cyber-shot DSC-W80",
    recentProfit: 110,
    recentReport: "🔥 Electronics bin just refilled 15 mins ago!",
    reportTime: "15m ago",
    status: "HOT",
    coordinates: { x: 38, y: 42 },
  },
  {
    id: "store-2",
    name: "Vinnies Paddington",
    category: "Designer & High-End Apparel",
    yieldScore: 91,
    address: "Oxford St, Paddington NSW",
    distMiles: 2.4,
    recentScannedItem: "Vintage Carhartt Detroit Jacket",
    recentProfit: 145,
    recentReport: "⚡ Heavy Y2K jacket stock on racks",
    reportTime: "32m ago",
    status: "HOT",
    coordinates: { x: 62, y: 35 },
  },
  {
    id: "store-3",
    name: "Red Cross Shop Surry Hills",
    category: "Media, Books & Electronics",
    yieldScore: 78,
    address: "Crown St, Surry Hills NSW",
    distMiles: 1.8,
    recentScannedItem: "Nintendo Game Boy Color Cyan",
    recentProfit: 85,
    recentReport: "📦 New box of retro video games put out",
    reportTime: "1h ago",
    status: "MODERATE",
    coordinates: { x: 50, y: 55 },
  },
  {
    id: "store-4",
    name: "Save the Children Op Shop",
    category: "Homewares & Collectibles",
    yieldScore: 64,
    address: "Glebe Point Rd, Glebe NSW",
    distMiles: 3.1,
    recentReport: "🧊 Pickers cleared out cameras this morning",
    reportTime: "2h ago",
    status: "COOL",
    coordinates: { x: 28, y: 68 },
  },
];

export default function WazeResellerHeatmap() {
  const [stores, setStores] = useState<StoreHeatPoint[]>(INITIAL_STORES);
  const [selectedStore, setSelectedStore] = useState<StoreHeatPoint | null>(INITIAL_STORES[0]);
  const [reportText, setReportText] = useState("");
  const [userLocation, setUserLocation] = useState<string>("Sydney, NSW");

  const handleReportSubmit = () => {
    if (!selectedStore || !reportText.trim()) return;

    setStores((prev) =>
      prev.map((s) =>
        s.id === selectedStore.id
          ? {
              ...s,
              recentReport: `💬 "${reportText.trim()}"`,
              reportTime: "Just now",
              yieldScore: Math.min(100, s.yieldScore + 5),
              status: "HOT",
            }
          : s
      )
    );

    setSelectedStore((prev) =>
      prev
        ? {
            ...prev,
            recentReport: `💬 "${reportText.trim()}"`,
            reportTime: "Just now",
            yieldScore: Math.min(100, prev.yieldScore + 5),
            status: "HOT",
          }
        : null
    );

    setReportText("");
    toast.success(`Live Waze report posted for ${selectedStore.name}!`);

    // Trigger 15ms haptic feedback
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(15); } catch {}
    }
  };

  const [spatialMeshMode, setSpatialMeshMode] = useState<boolean>(true);
  const [telemetryNodesCount, setTelemetryNodesCount] = useState<number>(412);

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-slate-950 p-6 md:p-8 space-y-6 shadow-2xl overflow-hidden box-border max-w-full">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 border border-cyan-400/40 px-3.5 py-1 text-xs font-black text-cyan-300">
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            LIVE SPATIAL AI HEAT MAPPING • THE WAZE FOR RESELLERS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-2">
            <span>Thrift Store Spatial AI Yield Mesh</span>
            <Flame className="h-6 w-6 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Silently mapping global shelf inventory density in real-time as live Spadas AR camera sensors capture 3D environmental telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextState = !spatialMeshMode;
              setSpatialMeshMode(nextState);
              toast.success(nextState ? "🌐 Spatial AI 3D Mesh Mode Active — Live Camera Sensor Telemetry Stream!" : "Switched to standard GPS map");
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer shrink-0 border ${
              spatialMeshMode
                ? "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white border-fuchsia-400 shadow-[0_0_24px_rgba(217,70,239,0.5)]"
                : "bg-slate-900 border-slate-800 text-cyan-300 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-fuchsia-300 animate-pulse" />
            <span>{spatialMeshMode ? "🌐 Spatial AI 3D Mesh ON" : "🌐 Enable Spatial AI Mesh"}</span>
          </button>

          <button
            type="button"
            onClick={() => toast.info("GPS Location Synced: " + userLocation)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            <Navigation className="h-4 w-4 text-cyan-400" />
            <span>{userLocation}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Store Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Spatial GPS Canvas Map Container */}
        <div className="lg:col-span-2 relative aspect-[16/10] sm:aspect-[16/9] w-full max-w-full rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl select-none">
          {/* Simulated Dark GPS Map Background Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

          {/* Road Network Lines Simulation */}
          <svg className="absolute inset-0 h-full w-full opacity-30 stroke-slate-700" strokeWidth="2">
            <line x1="10%" y1="20%" x2="90%" y2="80%" strokeDasharray="6 6" />
            <line x1="20%" y1="80%" x2="80%" y2="20%" strokeDasharray="6 6" />
            <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 4" />
          </svg>

          {/* Spatial AI 3D Environmental Point-Cloud Mesh Layer */}
          {spatialMeshMode && (
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-950/90 border border-fuchsia-500/50 px-2.5 py-1 text-[10px] font-black text-fuchsia-300 backdrop-blur-md shadow-lg animate-pulse">
                  <Sparkles className="h-3 w-3 text-fuchsia-400" />
                  <span>🌐 SPATIAL AI MESH ACTIVE • {telemetryNodesCount} TELEMETRY SENSORS STREAMING</span>
                </span>
                <span className="rounded-lg bg-slate-950/80 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/30">
                  LAT 33.8688° S | LON 151.2093° E
                </span>
              </div>

              {/* Point Cloud Density Nodes */}
              <div className="absolute top-1/3 left-1/4 h-24 w-24 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30 blur-sm animate-ping" />
              <div className="absolute top-1/2 left-2/3 h-32 w-32 rounded-full bg-cyan-500/15 border border-cyan-400/30 blur-sm animate-ping" />
            </div>
          )}

          {/* Interactive Heatmap Store Pins */}
          {stores.map((store) => {
            const isSelected = selectedStore?.id === store.id;
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStore(store)}
                style={{ top: `${store.coordinates.y}%`, left: `${store.coordinates.x}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform active:scale-95"
              >
                {/* Glowing Pulse Ring for Hot Stores */}
                {store.status === "HOT" && (
                  <span className="absolute -inset-3 rounded-full bg-amber-400/30 animate-ping" />
                )}

                {/* Main Pin Badge */}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-xl transition-all border ${
                    store.status === "HOT"
                      ? "bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50"
                      : store.status === "MODERATE"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  } ${isSelected ? "scale-110 ring-4 ring-white/50" : "group-hover:scale-105"}`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[110px]">{store.name.split(" ")[0]}</span>
                  <span className="text-[10px] font-black rounded bg-slate-950/40 px-1 py-0.2 text-white">
                    {store.yieldScore}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Store Inspector & Waze Crowdsourced Reporter */}
        <div className="space-y-4 w-full">
          {selectedStore ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    selectedStore.status === "HOT"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : selectedStore.status === "MODERATE"
                      ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/40"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {selectedStore.status === "HOT" ? "🔥 HIGH YIELD (90%+)" : "⚡ MODERATE YIELD"}
                  </span>
                  <h3 className="text-lg font-black text-white mt-1.5 leading-snug">{selectedStore.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{selectedStore.address} • {selectedStore.distMiles}m away</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">{selectedStore.yieldScore}%</span>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">Yield Rating</span>
                </div>
              </div>

              {/* Recent AR Scanned Grail Hit at Store */}
              {selectedStore.recentScannedItem && (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1">
                  <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider block">
                    👑 Recent Scanned Grail at Store:
                  </span>
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{selectedStore.recentScannedItem}</span>
                    <span className="text-emerald-400 font-extrabold">
                      +${selectedStore.recentProfit?.toFixed(2)} AUD
                    </span>
                  </div>
                </div>
              )}

              {/* Latest Live Reseller Crowdsourced Report */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-300">
                  <span>💬 Latest Live Waze Report:</span>
                  <span>{selectedStore.reportTime}</span>
                </div>
                <p className="text-xs font-semibold text-amber-200">
                  {selectedStore.recentReport}
                </p>
              </div>

              {/* Post Live Crowdsourced Reseller Report Input */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  📢 Post Live Reseller Status Report (Waze Mode):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Stocking new clothing racks right now..."
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReportSubmit()}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleReportSubmit}
                    className="inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 shadow-md hover:bg-cyan-400 transition cursor-pointer shrink-0 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" /> Post
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-6 text-center text-xs text-slate-400">
              Tap any store pin on the GPS map to inspect yield rating & live reports!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
