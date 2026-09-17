"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, ExternalLink, Image as ImageIcon, Calculator } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { openExternalUrlSafely } from "@/lib/android-bridge";

export interface RawComp {
  title?: string;
  price?: number;
  condition?: string;
  date_sold?: string;
  image?: string;
  thumbnail?: string;
  url?: string;
  id?: string;
}

interface RawCompsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  initialComps: RawComp[];
  currencySymbol: string;
  onRecalculate: (newMin: number, newMax: number, newAvg: number, activeCompsCount: number) => void;
}

class RawCompsErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error("[RawCompsModal] Fatal render error in comps modal:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Comps View Unavailable</h3>
            <p className="text-xs text-zinc-400">
              There was an issue displaying this item's comps data.
            </p>
            <button
              type="button"
              onClick={this.props.onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RawCompsModal({
  isOpen,
  onClose,
  scanId,
  initialComps,
  currencySymbol,
  onRecalculate,
}: RawCompsModalProps) {
  const [excludedCompIds, setExcludedCompIds] = useState<Set<number>>(new Set());
  const onRecalculateRef = useRef(onRecalculate);
  useEffect(() => {
    onRecalculateRef.current = onRecalculate;
  }, [onRecalculate]);

  const hasInitializedRef = useRef(false);

  // Load excluded comps from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`spadas_excluded_comps_${scanId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setExcludedCompIds(new Set(parsed));
          }
        } catch (e) {
          console.warn("Failed to parse excluded comps");
        }
      } else {
        setExcludedCompIds(new Set());
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [isOpen, scanId]);

  // Save to localStorage when exclusions change
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(`spadas_excluded_comps_${scanId}`, JSON.stringify(Array.from(excludedCompIds)));
    }
  }, [excludedCompIds, isOpen, scanId]);

  const activeComps = useMemo(() => {
    return initialComps.filter((_, idx) => !excludedCompIds.has(idx));
  }, [initialComps, excludedCompIds]);

  // Recalculate metrics when exclusions change
  useEffect(() => {
    if (!isOpen || initialComps.length === 0) return;

    // Don't trigger calculation on initial mount if there are no stored exclusions
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (excludedCompIds.size === 0) return;
    }
    
    if (activeComps.length === 0) {
      onRecalculateRef.current(0, 0, 0, 0);
      return;
    }

    const prices = activeComps.map((c) => Number(c.price) || 0).filter((p) => p > 0);
    if (prices.length === 0) {
      onRecalculateRef.current(0, 0, 0, 0);
      return;
    }

    prices.sort((a, b) => a - b);
    
    let min = prices[0];
    let max = prices[prices.length - 1];
    
    // Trim top/bottom 10% for outliers if enough comps
    if (prices.length >= 5) {
      const trimCount = Math.max(1, Math.floor(prices.length * 0.1));
      const trimmed = prices.slice(trimCount, prices.length - trimCount);
      if (trimmed.length > 0) {
        min = trimmed[0];
        max = trimmed[trimmed.length - 1];
      }
    }

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    onRecalculateRef.current(min, max, avg, activeComps.length);
  }, [activeComps, isOpen, initialComps.length, excludedCompIds]);

  const toggleComp = (index: number) => {
    setExcludedCompIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <RawCompsErrorBoundary onClose={onClose}>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-2xl bg-[#0a0a0c] sm:rounded-2xl border-t sm:border border-white/10 shadow-2xl flex flex-col h-[85vh] sm:h-[80vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-400" /> 
              Raw Valuation Data
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Select or exclude outliers to refine your estimate.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {initialComps.map((comp, idx) => {
            const isExcluded = excludedCompIds.has(idx);
            const price = Number(comp.price) || 0;
            const imgSrc = comp.image || comp.thumbnail;
            
            let dateStr = "Unknown Date";
            if (comp.date_sold) {
              try {
                dateStr = formatDistanceToNow(new Date(comp.date_sold), { addSuffix: true });
              } catch (e) {}
            }

            return (
              <div 
                key={comp.id || idx}
                className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isExcluded 
                    ? "bg-black/40 border-white/5 opacity-50 grayscale" 
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                }`}
                onClick={() => toggleComp(idx)}
              >
                <div className="h-16 w-16 rounded-lg bg-zinc-900 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                  {imgSrc && !imgSrc.includes("data:image") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc} alt="Comp" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-zinc-700" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className={`text-xs font-bold truncate ${isExcluded ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                      {comp.title || "Unknown Item"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span className="truncate">{comp.condition || "Used"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className={`font-mono font-bold ${isExcluded ? "text-zinc-600" : "text-emerald-400"}`}>
                      {currencySymbol}{price.toFixed(2)}
                    </div>
                    {!isExcluded && (
                      <button 
                        type="button"
                        onClick={(e) => openExternalUrlSafely(comp.url, comp.title, e)}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer py-1 px-1.5 rounded hover:bg-white/10 transition active:scale-95"
                        title="View original comp listing on eBay AU"
                      >
                        <span>VIEW ORIG</span>
                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                      </button>
                    )}
                    {isExcluded && (
                      <span className="text-[10px] text-rose-500 font-bold font-mono">
                        EXCLUDED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {initialComps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Calculator className="h-12 w-12 mb-4 opacity-20" />
              <p>No raw comp data available for this scan.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0 flex items-center justify-between">
          <div className="text-xs font-mono text-zinc-400">
            Using <span className="text-white font-bold">{activeComps.length}</span> of {initialComps.length} comps
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-full text-sm transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  </RawCompsErrorBoundary>
);
}
