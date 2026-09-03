"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Zap,
  TrendingUp,
  DollarSign,
  Trash2,
  ExternalLink,
  ShieldCheck,
  PackagePlus,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Camera,
} from "lucide-react";
import {
  RapidThriftItem,
  RapidSessionStats,
  getPhotoBlob,
  computeSessionStats,
} from "@/lib/rapid-thrift-engine";
import { toast } from "sonner";

interface RapidThriftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: RapidThriftItem[];
  onDeleteItem: (id: string) => void;
  onClearSession: () => void;
  onAddToInventory?: (item: RapidThriftItem) => void;
  onOpenVerify?: (item: RapidThriftItem) => void;
  currency?: string;
}

export const RapidThriftDrawer: React.FC<RapidThriftDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onDeleteItem,
  onClearSession,
  onAddToInventory,
  onOpenVerify,
  currency = "AUD",
}) => {
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);

  const stats: RapidSessionStats = useMemo(() => computeSessionStats(items), [items]);

  // Asynchronously load photo Blobs from IndexedDB (Zero Base64 in LocalStorage)
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    let isMounted = true;
    setLoadingPhotos(true);

    const loadAllPhotos = async () => {
      const urls: Record<string, string> = {};
      for (const item of items) {
        if (!item.photoId) continue;
        try {
          const blob = await getPhotoBlob(item.photoId);
          if (blob && isMounted) {
            urls[item.photoId] = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.warn("[Rapid Drawer] Photo load error for photoId:", item.photoId, err);
        }
      }
      if (isMounted) {
        setPhotoUrls((prev) => {
          // Clean up old object URLs to prevent memory leaks
          Object.values(prev).forEach((url) => {
            if (!Object.values(urls).includes(url)) {
              URL.revokeObjectURL(url);
            }
          });
          return urls;
        });
        setLoadingPhotos(false);
      }
    };

    void loadAllPhotos();

    return () => {
      isMounted = false;
    };
  }, [isOpen, items]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(photoUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoUrls]);

  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error("No items in session to export.");
      return;
    }
    const headers = ["Item Name", "Brand", "Category", "Condition", "Est Value", "Thrift Cost", "Net Profit", "Cop Verdict", "Timestamp"];
    const rows = items.map((itm) => [
      `"${(itm.productName || "Scanned Item").replace(/"/g, '""')}"`,
      `"${(itm.brand || "Authentic").replace(/"/g, '""')}"`,
      `"${(itm.category || "General").replace(/"/g, '""')}"`,
      `"${(itm.condition || "Used").replace(/"/g, '""')}"`,
      itm.estimatedValue || 0,
      itm.thriftCost || 0,
      itm.trueNetProfit || 0,
      itm.copVerdict || "PASS_RISKY",
      new Date(itm.timestamp).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `spadas_rapid_haul_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Rapid Haul exported to CSV!");
  };

  const handleBatchAddToInventory = () => {
    const profitable = items.filter((i) => (i.trueNetProfit || 0) >= 10 && i.status === "completed");
    if (profitable.length === 0) {
      toast.info("No completed profitable items to add.");
      return;
    }
    profitable.forEach((itm) => onAddToInventory?.(itm));
    toast.success(`Added ${profitable.length} profitable finds to inventory!`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rapid-haul-title"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-md transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl mx-auto rounded-t-3xl border-t border-x border-slate-800 bg-slate-950/95 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle Drag Indicator */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-800" />
        </div>

        {/* Header Title & Ticker */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 id="rapid-haul-title" className="text-base font-black text-white flex items-center gap-2">
                <span>Rapid Thrift Haul</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {items.length} Snapped
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Saved background photos and live profit metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Rapid Thrift Haul"
              className="h-8 w-8 rounded-full border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Haul Stats Bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-900/50 border-b border-slate-800/80 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Est. Profit
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              +${stats.totalProfit} {currency}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Flips Found
            </span>
            <span className="text-base font-black text-cyan-400 font-mono">
              {stats.profitableCount} / {stats.totalItems}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center gap-1">
              <Flame className="h-3 w-3 text-amber-400 inline" /> Grails (&gt;$50)
            </span>
            <span className="text-base font-black text-amber-400 font-mono">
              {stats.grailsCount}
            </span>
          </div>
        </div>

        {/* Processing Banner (when background queue is active) */}
        {stats.queuedItems > 0 && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              <span className="font-bold">
                Analyzing {stats.queuedItems} item{stats.queuedItems > 1 ? "s" : ""} in background...
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-200/80">
              Hands-free pocket mode active
            </span>
          </div>
        )}

        {/* Items List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Camera className="h-10 w-10 mx-auto text-slate-600 stroke-1" />
              <p className="text-sm font-bold text-slate-300">Your Rapid Haul is Empty</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Turn on Rapid Mode in the camera, tap the shutter as you walk down aisles, and your photos will appear here automatically!
              </p>
            </div>
          ) : (
            items.map((item) => {
              const photoUrl = photoUrls[item.photoId];
              const isHighProfit = (item.trueNetProfit || 0) >= 50 || item.isGrail;
              const isProfit = (item.trueNetProfit || 0) > 10;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition flex gap-3.5 items-center ${
                    item.status === "analyzing" || item.status === "queued"
                      ? "bg-slate-900/40 border-slate-800 animate-pulse"
                      : isHighProfit
                      ? "bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5"
                      : isProfit
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  {/* Photo Thumbnail from IndexedDB */}
                  <div className="relative h-18 w-18 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={item.productName || "Scanned Thrift Photo"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <Camera className="h-5 w-5" />
                        <span className="text-[9px] mt-0.5 font-mono">Photo</span>
                      </div>
                    )}

                    {item.status === "analyzing" && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {item.brand || "Authentic"}
                      </span>
                      {item.copVerdict && (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                            item.copVerdict === "MUST_COP"
                              ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                              : item.copVerdict === "QUICK_FLIP"
                              ? "bg-emerald-500 text-slate-950 font-black"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.copVerdict.replace(/_/g, " ")}
                        </span>
                      )}
                      {item.needsVerification && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verify
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                      {item.productName || "Analyzing thrift item..."}
                    </h4>

                    {/* Financial Rollup */}
                    {item.status === "completed" ? (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-emerald-400 font-black font-mono">
                          +${item.trueNetProfit || 0} Profit
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-[11px]">
                          Est ${item.estimatedValue}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-[11px]">
                          Cost ${item.thriftCost}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-300/80 italic mt-0.5">
                        Evaluating comps & thrift margin...
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {onAddToInventory && item.status === "completed" && (
                      <button
                        type="button"
                        onClick={() => onAddToInventory(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Add to Spadas Inventory"
                      >
                        <PackagePlus className="h-3 w-3" /> Add
                      </button>
                    )}
                    {item.needsVerification && onOpenVerify && (
                      <button
                        type="button"
                        onClick={() => onOpenVerify(item)}
                        className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black transition cursor-pointer flex items-center gap-1"
                        title="Run Deep Forensic Verification"
                      >
                        <ShieldCheck className="h-3 w-3" /> Verify
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Batch Actions */}
        {items.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchAddToInventory}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <PackagePlus className="h-3.5 w-3.5" /> Save All Profitable
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                title="Export session to CSV"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>

            <button
              type="button"
              onClick={onClearSession}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Haul
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
