"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  History,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  Cloud,
  ShieldCheck,
  Tag,
  Camera,
} from "lucide-react";
import type { DetectedHit } from "@/types/lens";

interface QuickHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  hits: DetectedHit[];
  onClearHistory?: () => void;
  onDeleteHit?: (id: string) => void;
  onSaveDraft?: (hit: DetectedHit) => void;
  onSelectHit?: (hit: DetectedHit) => void;
  pendingSyncCount?: number;
  currency?: string;
  onNavigateFullHistory?: () => void;
}

type VerdictFilter = "ALL" | "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS";

export const QuickHistoryDrawer: React.FC<QuickHistoryDrawerProps> = ({
  isOpen,
  onClose,
  hits,
  onClearHistory,
  onDeleteHit,
  onSaveDraft,
  onSelectHit,
  pendingSyncCount = 0,
  currency = "AUD",
  onNavigateFullHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<VerdictFilter>("ALL");
  const [expandedHitId, setExpandedHitId] = useState<string | null>(null);

  const filteredHits = useMemo(() => {
    return hits.filter((hit) => {
      // Verdict filter
      if (activeFilter === "MUST_COP" && hit.copVerdict !== "MUST_COP") return false;
      if (activeFilter === "QUICK_FLIP" && hit.copVerdict !== "QUICK_FLIP") return false;
      if (activeFilter === "FAIR_MARGIN" && hit.copVerdict !== "FAIR_MARGIN") return false;
      if (
        activeFilter === "PASS" &&
        hit.copVerdict !== "PASS_RISKY" &&
        hit.verdict !== "PASS"
      )
        return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (hit.name || "").toLowerCase().includes(q);
        const brandMatch = (hit.brand || "").toLowerCase().includes(q);
        const catMatch = (hit.category || "").toLowerCase().includes(q);
        if (!nameMatch && !brandMatch && !catMatch) return false;
      }

      return true;
    });
  }, [hits, activeFilter, searchQuery]);

  const totalFilteredProfit = useMemo(() => {
    return filteredHits.reduce((sum, h) => sum + (h.trueNetProfit || h.estimatedProfit || 0), 0);
  }, [filteredHits]);

  const toggleExpand = (id: string) => {
    setExpandedHitId((prev) => (prev === id ? null : id));
  };

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return "Recently";
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-auto rounded-t-3xl border-t border-x border-slate-800 bg-slate-950/95 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Pull Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-700" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <History className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">Scan History</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-cyan-400">
                  {hits.length}
                </span>
                {pendingSyncCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                    <CloudOff className="h-2.5 w-2.5" />
                    <span>{pendingSyncCount} offline</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <Cloud className="h-2.5 w-2.5" /> Cloud Synced
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Offline-first persistent scan ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateFullHistory && (
              <button
                type="button"
                onClick={onNavigateFullHistory}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-600 transition cursor-pointer"
                title="Open full page history"
              >
                <span>Full Feed</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search & Profit Filter Tabs */}
        <div className="px-4 sm:px-6 py-3 space-y-2.5 border-b border-slate-800/80 bg-slate-950/40">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by product, brand, or category..."
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-1.5 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-bold">
            {(
              [
                { key: "ALL", label: "All Items" },
                { key: "MUST_COP", label: "👑 Must-Cop" },
                { key: "QUICK_FLIP", label: "⚡ Quick Flip" },
                { key: "FAIR_MARGIN", label: "Fair Margin" },
                { key: "PASS", label: "⛔ Pass" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer ${
                  activeFilter === filter.key
                    ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scanned Items Scroll List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-2.5">
          {filteredHits.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Camera className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-slate-400">
                {hits.length === 0
                  ? "No scanned items in your session yet."
                  : "No items match your filter criteria."}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                {hits.length === 0
                  ? "Point Spadas Lens at any item or tap the shutter button to instantly value items."
                  : "Try clearing your search query or switching to 'All Items'."}
              </p>
            </div>
          ) : (
            filteredHits.map((hit) => {
              const isExpanded = expandedHitId === hit.id;
              const profit = hit.trueNetProfit ?? hit.estimatedProfit ?? 0;
              const roi = hit.roiPercentage ?? hit.estRoi ?? 0;
              const tagPrice = hit.tagPrice ?? hit.estCost ?? 0;
              const resale = hit.estimatedValue || 0;
              const conditionGrade = hit.conditionGrade || "Good";

              return (
                <div
                  key={hit.id}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 transition-all overflow-hidden"
                >
                  {/* Card Header Row (Click to Expand / Collapse) */}
                  <div
                    onClick={() => toggleExpand(hit.id)}
                    className="p-3 flex items-center gap-3 cursor-pointer select-none"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {hit.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={hit.image}
                          alt={hit.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-slate-600" />
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                          {hit.brand || "Authentic"}
                        </span>
                        {/* Condition Grade Badge */}
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                            conditionGrade === "Mint"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : conditionGrade === "Good"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : conditionGrade === "Fair"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {conditionGrade}
                        </span>

                        {hit.copVerdict && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                              hit.copVerdict === "MUST_COP"
                                ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                                : hit.copVerdict === "QUICK_FLIP"
                                ? "bg-emerald-500 text-slate-950 font-black"
                                : hit.copVerdict === "FAIR_MARGIN"
                                ? "bg-cyan-900/60 text-cyan-300 border border-cyan-700/50"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hit.copVerdict.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                        {hit.name}
                      </h4>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(hit.timestamp)}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Cost:{" "}
                          <strong className="text-slate-200">
                            ${tagPrice.toFixed(2)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Sold:{" "}
                          <strong className="text-slate-200">
                            ${resale.toFixed(2)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Profit Pill & Toggle Chevron */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div
                        className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl shadow-sm ${
                          profit >= 25
                            ? "bg-emerald-500 text-slate-950 font-black"
                            : profit >= 10
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        +${profit.toFixed(2)} {currency}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span>{roi.toFixed(0)}% ROI</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* One-Tap Expanded Details Accordion */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 space-y-2.5 text-xs animate-in fade-in duration-150">
                      {/* Deep Wear Inspection Details */}
                      {hit.wearInspection && (
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-cyan-400" />
                            <span>Visual Wear & Micro-Features Assessment</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            {hit.wearInspection.surface_wear && (
                              <div className="text-slate-300">
                                <span className="text-slate-500">Surface: </span>
                                {hit.wearInspection.surface_wear}
                              </div>
                            )}
                            {hit.wearInspection.scratching && (
                              <div className="text-slate-300">
                                <span className="text-slate-500">Scratches: </span>
                                {hit.wearInspection.scratching}
                              </div>
                            )}
                            {hit.wearInspection.oxidisation && (
                              <div className="text-slate-300">
                                <span className="text-slate-500">Oxidisation: </span>
                                {hit.wearInspection.oxidisation}
                              </div>
                            )}
                            {hit.wearInspection.packaging_completeness && (
                              <div className="text-slate-300">
                                <span className="text-slate-500">Box/Tags: </span>
                                {hit.wearInspection.packaging_completeness}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Defect Notes */}
                      {hit.defectNotes && hit.defectNotes.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            Reported Flaws:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {hit.defectNotes.map((note, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300"
                              >
                                {note}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comps Info & Actions */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <div>
                          <span>Comps: </span>
                          <strong className="text-slate-200">
                            {hit.ebayCompsCount ? `${hit.ebayCompsCount} cleared sales` : "AI Normalized Comps"}
                          </strong>
                        </div>

                        <div className="flex items-center gap-2">
                          {onSaveDraft && (
                            <button
                              type="button"
                              onClick={() => onSaveDraft(hit)}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 px-2.5 py-1 text-[11px] font-black transition cursor-pointer shadow-xs"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Draft</span>
                            </button>
                          )}

                          {onDeleteHit && (
                            <button
                              type="button"
                              onClick={() => onDeleteHit(hit.id)}
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-400 transition cursor-pointer p-1"
                              title="Delete from history"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Summary & Clear Action */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Filtered Resale Net Profit
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-400">
              +${totalFilteredProfit.toFixed(2)} {currency}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onClearHistory && hits.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Clear all scanned history from this device?")) {
                    onClearHistory();
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-950/30 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear History</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
