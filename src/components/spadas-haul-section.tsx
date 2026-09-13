"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ShoppingBag,
  PackagePlus,
  Trash2,
  Download,
  ExternalLink,
  ShieldCheck,
  Camera,
  Sparkles,
  TrendingUp,
  DollarSign,
  Flame,
  ArrowRight,
  Scan,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  ChevronRight,
  Tag,
  Loader2,
} from "lucide-react";
import {
  RapidThriftItem,
  getPhotoBlob,
} from "@/lib/rapid-thrift-engine";
import { useHaulStore } from "@/lib/haul-store";
import { useQuickSnapQueue } from "@/lib/quick-snap-queue";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import { toast } from "sonner";
import EbayListingModal from "@/components/ebay-listing-modal";
import { DeepVerifyModal } from "@/components/deep-verify-modal";
import { supabase } from "@/app/lib/supabase";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { isMeaningfulMeta } from "@/lib/lens-utils";

interface SpadasHaulSectionProps {
  onSwitchToLens?: () => void;
  currency?: string;
}

export function SpadasHaulSection({
  onSwitchToLens,
  currency = "AUD",
}: SpadasHaulSectionProps) {
  const {
    items,
    haulCount,
    stats,
    totalCostBasis,
    totalGrossValue,
    totalProfit,
    aggregateRoi,
    removeItem,
    clearHaul,
    setItems,
    refresh: refreshItems,
  } = useHaulStore();

  const photoUrlsRef = React.useRef<Record<string, string>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "profitable" | "grails" | "traps">("all");

  // In-flight commitment states for UI stability
  const [committingId, setCommittingId] = useState<string | null>(null);
  const [isBatchCommitting, setIsBatchCommitting] = useState<boolean>(false);

  // Modals state
  const [ebayItem, setEbayItem] = useState<RapidThriftItem | null>(null);
  const [verifyItem, setVerifyItem] = useState<RapidThriftItem | null>(null);

  const handleCloseEbayModal = useCallback(() => setEbayItem(null), []);
  const handleCloseVerifyModal = useCallback(() => setVerifyItem(null), []);

  // Quick Snap background queueing telemetry
  const { isProcessing, pendingCount } = useQuickSnapQueue();

  // Synchronize IndexedDB photo blobs for thumbnails without redundant re-fetching or thrashing
  useEffect(() => {
    let isMounted = true;

    // 1. Clean up removed items' object URLs
    const currentPhotoIds = new Set(items.map((i) => i.photoId).filter(Boolean) as string[]);
    let hasRemoved = false;
    for (const [id, url] of Object.entries(photoUrlsRef.current)) {
      if (!currentPhotoIds.has(id)) {
        URL.revokeObjectURL(url);
        delete photoUrlsRef.current[id];
        hasRemoved = true;
      }
    }

    // 2. Identify missing photos that need to be loaded
    const missingItems = items.filter(
      (item) => item.photoId && !photoUrlsRef.current[item.photoId]
    );

    if (missingItems.length === 0) {
      if (hasRemoved && isMounted) {
        setPhotoUrls({ ...photoUrlsRef.current });
      }
      return;
    }

    setLoadingPhotos(true);

    const loadMissingPhotos = async () => {
      let newlyLoaded = false;
      await Promise.all(
        missingItems.map(async (item) => {
          if (!item.photoId || photoUrlsRef.current[item.photoId]) return;
          try {
            const blob = await getPhotoBlob(item.photoId);
            if (blob && isMounted && !photoUrlsRef.current[item.photoId]) {
              photoUrlsRef.current[item.photoId] = URL.createObjectURL(blob);
              newlyLoaded = true;
            }
          } catch (err) {
            console.warn("[Spadas Haul] Failed loading photo for:", item.photoId, err);
          }
        })
      );

      if (isMounted) {
        if (newlyLoaded || hasRemoved) {
          setPhotoUrls({ ...photoUrlsRef.current });
        }
        setLoadingPhotos(false);
      }
    };

    void loadMissingPhotos();

    return () => {
      isMounted = false;
    };
  }, [items]);

  // Clean up all object URLs strictly on component unmount
  useEffect(() => {
    return () => {
      Object.values(photoUrlsRef.current).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      photoUrlsRef.current = {};
    };
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search text match
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = (item.productName || "").toLowerCase().includes(q);
        const matchBrand = (item.brand || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCat) return false;
      }

      // Tab filter
      if (activeTabFilter === "profitable") {
        return (item.trueNetProfit || 0) >= 10;
      }
      if (activeTabFilter === "grails") {
        return (item.trueNetProfit || 0) >= 40 || item.isGrail;
      }
      if (activeTabFilter === "traps") {
        const vel = calculateSalesVelocity({
          productName: item.productName,
          category: item.category,
          brand: item.brand,
        });
        return vel.turnoverTier === "HOARDER_RISK" || (item.trueNetProfit || 0) <= 0;
      }

      return true;
    });
  }, [items, searchFilter, activeTabFilter]);

  // Handle single item add to inventory
  const handleAddToInventory = useCallback(
    async (item: RapidThriftItem) => {
      if (committingId === item.id) return;
      setCommittingId(item.id);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        const listingPayload = {
          user_id: user?.id || null,
          product: item.productName || "Sourced Thrift Item",
          category: item.category || "General",
          price: item.estimatedValue || 25,
          estimated_profit: item.trueNetProfit || 15,
          status: "Active",
          confidence: 0.95,
          currency: currency,
          cost_price: item.thriftCost || 5,
          image_url: item.thumbnailUrl || item.image || item.imageUrl || photoUrls[item.photoId] || null,
        };

        const { error } = await supabase.from("listings").insert([listingPayload]);
        if (error) {
          console.warn("[Spadas Haul] Database insert warning:", error);
          toast.error(`Database commit error: ${error.message || "Unable to save"}`);
          return;
        }
        toast.success(`"${item.productName || "Item"}" committed to Active Inventory!`);
      } catch (err) {
        console.error("[Spadas Haul] Failed to commit to inventory:", err);
        toast.error("Failed to commit item to inventory.");
      } finally {
        setCommittingId(null);
      }
    },
    [committingId, currency, photoUrls]
  );

  // Handle batch save all profitable finds
  const handleBatchCommitToInventory = useCallback(async () => {
    if (isBatchCommitting) return;
    const profitable = items.filter((i) => (i.trueNetProfit || 0) >= 10);
    if (profitable.length === 0) {
      toast.info("No completed profitable items (>$10 net margin) to commit.");
      return;
    }

    setIsBatchCommitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      const payloads = profitable.map((item) => ({
        user_id: user?.id || null,
        product: item.productName || "Sourced Thrift Item",
        category: item.category || "General",
        price: item.estimatedValue || 25,
        estimated_profit: item.trueNetProfit || 15,
        status: "Active",
        confidence: 0.95,
        currency: currency,
        cost_price: item.thriftCost || 5,
        image_url: item.thumbnailUrl || item.image || item.imageUrl || photoUrls[item.photoId] || null,
      }));

      const { error } = await supabase.from("listings").insert(payloads);
      if (error) {
        console.warn("[Spadas Haul] Batch insert warning:", error);
        toast.error(`Batch commit error: ${error.message || "Failed to commit batch"}`);
        return;
      }
      toast.success(`Committed ${profitable.length} profitable finds to Active Inventory!`);
    } catch (err) {
      console.error("[Spadas Haul] Batch commit error:", err);
      toast.error("Error committing batch to inventory.");
    } finally {
      setIsBatchCommitting(false);
    }
  }, [isBatchCommitting, items, currency, photoUrls]);

  // Handle item deletion
  const handleDeleteItem = useCallback(
    async (id: string) => {
      await removeItem(id);
      toast.success("Item removed from sourcing haul.");
    },
    [removeItem]
  );

  // Handle session clear
  const handleClearSession = useCallback(async () => {
    if (!confirm("Clear all items in this sourcing haul session? This will reset the active manifest.")) {
      return;
    }
    await clearHaul();
    toast.success("Sourcing haul cleared.");
  }, [clearHaul]);

  // Export CSV Lot Manifest
  const handleExportCsv = useCallback(() => {
    if (items.length === 0) {
      toast.error("No items in session to export.");
      return;
    }
    const headers = [
      "Item Name",
      "Brand",
      "Category",
      "Condition",
      "Est Value ($)",
      "Thrift Cost ($)",
      "Net Profit ($)",
      "STR Velocity",
      "Cop Verdict",
      "Timestamp",
    ];
    const rows = items.map((itm) => {
      const vel = calculateSalesVelocity({
        productName: itm.productName,
        category: itm.category,
        brand: itm.brand,
      });
      return [
        `"${(itm.productName || "Scanned Item").replace(/"/g, '""')}"`,
        `"${(itm.brand || "Authentic").replace(/"/g, '""')}"`,
        `"${(itm.category || "General").replace(/"/g, '""')}"`,
        `"${(itm.condition || "Used").replace(/"/g, '""')}"`,
        itm.estimatedValue || 0,
        itm.thriftCost || 0,
        itm.trueNetProfit || 0,
        `"${vel.velocityLabel} (${vel.sellThroughRate}% STR)"`,
        itm.copVerdict || "PASS_RISKY",
        new Date(itm.timestamp).toISOString(),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `spadas_haul_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Haul Lot Manifest exported to CSV!");
  }, [items]);

  const ebayItemImageUrls = useMemo(() => {
    if (!ebayItem?.photoId || !photoUrls[ebayItem.photoId]) return [];
    return [photoUrls[ebayItem.photoId]];
  }, [ebayItem?.photoId, photoUrls]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Executive Sourcing Control Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-[#0A0D15]/90 border border-white/[0.08] shadow-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Haul
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active Sourcing Lot
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Secondary market lot underwriting, margin velocity & batch inventory dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Global Batch Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onSwitchToLens && (
            <button
              type="button"
              onClick={onSwitchToLens}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition shadow-sm cursor-pointer active:scale-95"
              title="Launch Scanner to rapid-fire photos directly from the active live stream"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <Camera className="h-4 w-4 text-slate-950" />
              )}
              <span>Quick Snap Camera</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-950 text-cyan-300">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("medium");
              void handleBatchCommitToInventory();
            }}
            disabled={items.length === 0 || isBatchCommitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95"
          >
            {isBatchCommitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
            ) : (
              <PackagePlus className="h-4 w-4" />
            )}
            <span>{isBatchCommitting ? "Committing..." : "Commit All Profitable"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("tap");
              handleExportCsv();
            }}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            title="Export Manifest CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("warning");
                void handleClearSession();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer active:scale-95"
              title="Clear Sourcing Run"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Lot</span>
            </button>
          )}
        </div>
      </div>

      {/* Background Analyzing Banner if items are queued */}
      {stats.queuedItems > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
            <span className="font-bold">
              Analyzing {stats.queuedItems} item{stats.queuedItems > 1 ? "s" : ""} in background...
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const repaired = items.map((i) => ({
                ...i,
                status: "completed" as const,
                productName: i.productName && i.productName !== "Scanned Sourcing Item" ? i.productName : "Sourced Thrift Item",
              }));
              setItems(repaired);
              toast.success("All lot items resolved to completed state.");
            }}
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer transition"
          >
            Instant Reveal
          </button>
        </div>
      )}

      {/* Quantitative Executive Financial Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Lot Size */}
        <div className="p-4 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Lot Units Sourced</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{items.length}</span>
            <span className="text-[11px] font-mono text-zinc-500 ml-2">
              ({stats.profitableCount} Profitable)
            </span>
          </div>
        </div>

        {/* Metric 2: Gross Valuation Comps */}
        <div className="p-4 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Est. Gross Comps</span>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-zinc-200 font-mono">
              ${totalGrossValue.toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 ml-1.5">{currency}</span>
          </div>
        </div>

        {/* Metric 3: Total Cost Basis */}
        <div className="p-4 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Capital Basis (Cost)</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              ${totalCostBasis.toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 ml-1.5">{currency}</span>
          </div>
        </div>

        {/* Metric 4: Projected Net Margin & ROI */}
        <div className="p-4 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Projected Net Margin</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                +${stats.totalProfit.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-emerald-500/80 ml-1.5">{currency}</span>
            </div>
            {aggregateRoi > 0 && (
              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                +{aggregateRoi}% ROI
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-2xl bg-[#0A0D15]/60 border border-white/[0.08]">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              setActiveTabFilter("all");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "all"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-zinc-400 hover:text-white bg-zinc-900/60"
            }`}
          >
            All Items [{items.length}]
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              setActiveTabFilter("profitable");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "profitable"
                ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                : "text-zinc-400 hover:text-emerald-400 bg-zinc-900/60"
            }`}
          >
            High Margin [{stats.profitableCount}]
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              setActiveTabFilter("grails");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "grails"
                ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                : "text-zinc-400 hover:text-amber-300 bg-zinc-900/60"
            }`}
          >
            Grails (&gt;$40) [{stats.grailsCount}]
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              setActiveTabFilter("traps");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "traps"
                ? "bg-rose-500 text-white font-black shadow-sm"
                : "text-zinc-400 hover:text-rose-400 bg-zinc-900/60"
            }`}
          >
            Stale Capital Risks
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search lot items or brands..."
            className="w-full h-8 pl-3 pr-8 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Lot Manifest List / Empty State */}
      {items.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-3xl bg-[#0A0D15]/60 border border-white/[0.08] space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-zinc-900/80 border border-zinc-800 text-zinc-500">
            <ShoppingBag className="h-8 w-8 stroke-1 text-zinc-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">No Sourcing Lot Units Logged</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Launch Spadas Lens AR, scan thrift aisles or apparel racks, and every captured item will automatically aggregate here with real-time sell-through comps and net profit calculations.
            </p>
          </div>
          {onSwitchToLens && (
            <button
              type="button"
              onClick={onSwitchToLens}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
            >
              <Scan className="h-4 w-4" />
              <span>Launch Lens AR Scanner</span>
            </button>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-[#0A0D15]/60 border border-white/[0.08] text-zinc-500 font-mono text-xs">
          No items match the active search filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const photoUrl = photoUrls[item.photoId];
            const velocity = calculateSalesVelocity({
              productName: item.productName,
              category: item.category,
              brand: item.brand,
            });
            const isHighProfit = (item.trueNetProfit || 0) >= 40 || item.isGrail;
            const isProfit = (item.trueNetProfit || 0) >= 10;
            const isTrap = velocity.turnoverTier === "HOARDER_RISK" || (item.trueNetProfit || 0) <= 0;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isHighProfit
                    ? "bg-[#0E1320] border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : isProfit
                    ? "bg-[#0A0E18] border-emerald-500/30"
                    : isTrap
                    ? "bg-[#140C0E] border-rose-500/30"
                    : "bg-[#0A0D15]/80 border-white/[0.08]"
                }`}
              >
                {/* Left Side: Thumbnail & Identification */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 flex items-center justify-center">
                    {photoUrl || item.thumbnailUrl || item.image || item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl || item.thumbnailUrl || item.image || item.imageUrl}
                        alt={item.productName || "Haul Item"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <Camera className="h-5 w-5" />
                        <span className="text-[9px] font-mono mt-0.5">PHOTO</span>
                      </div>
                    )}
                    {item.status === "analyzing" && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isMeaningfulMeta(item.brand) && (
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">
                          {item.brand.trim()}
                        </span>
                      )}
                      {item.copVerdict && (
                        <span
                          className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.copVerdict === "MUST_COP"
                              ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                              : item.copVerdict === "QUICK_FLIP"
                              ? "bg-emerald-500 text-slate-950 font-black"
                              : item.copVerdict === "VERIFY_FIRST"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {item.copVerdict.replace(/_/g, " ")}
                        </span>
                      )}
                      {item.needsVerification && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" /> VERIFY REQUIRED
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-100 truncate">
                      {item.productName || (item.status === "completed" ? "Sourced Thrift Item" : "Analyzing Thrift Item...")}
                    </h3>

                    {/* Financial Metrics Row */}
                    <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                      <span className="text-zinc-400">
                        Cost: <strong className="text-zinc-200">${(item.thriftCost || 0).toFixed(2)}</strong>
                      </span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-zinc-400">
                        Comps: <strong className="text-zinc-200">${(item.estimatedValue || 0).toFixed(2)}</strong>
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span
                        className={`font-black ${
                          (item.trueNetProfit || 0) > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {(item.trueNetProfit || 0) > 0
                          ? `+$${(item.trueNetProfit || 0).toFixed(2)} Net`
                          : `$${(item.trueNetProfit || 0).toFixed(2)} Net`}
                      </span>
                    </div>

                    {/* Velocity Pill */}
                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          velocity.turnoverTier === "RAPID_FIRE"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : velocity.turnoverTier === "HOARDER_RISK"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        }`}
                      >
                        {velocity.turnoverTier === "RAPID_FIRE" && "⚡ "}
                        {velocity.turnoverTier === "HOARDER_RISK" && "🛑 "}
                        {velocity.velocityLabel} ({velocity.sellThroughRate}% STR • ~{velocity.estDaysToSell}d turn)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Control Suite */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddToInventory(item)}
                      disabled={committingId === item.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-black transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Commit item to active inventory"
                    >
                      {committingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />
                      ) : (
                        <PackagePlus className="h-3.5 w-3.5" />
                      )}
                      <span>{committingId === item.id ? "SAVING" : "INTAKE"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEbayItem(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F97316]/20 to-amber-500/20 hover:from-[#F97316]/30 hover:to-amber-500/30 text-[#F97316] border border-[#F97316]/40 text-xs font-mono font-bold transition cursor-pointer"
                      title="Draft directly to eBay Australia"
                    >
                      <span>EBAY</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </button>

                    {item.needsVerification && (
                      <button
                        type="button"
                        onClick={() => setVerifyItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition cursor-pointer"
                        title="Run Deep Forensic Verification"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>AUDIT</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Remove item from haul"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1-Click Live eBay Publish Modal */}
      {ebayItem && (
        <EbayListingModal
          isOpen={!!ebayItem}
          onClose={handleCloseEbayModal}
          title={ebayItem.productName || "Sourced Thrift Item"}
          price={Number(ebayItem.estimatedValue) || 25}
          currency={currency}
          description={`Authentic ${ebayItem.productName || "Thrift Item"}. Professionally sourced & verified via Spadas Lens.`}
          imageUrls={ebayItemImageUrls}
        />
      )}

      {/* Deep Forensic Verification Modal */}
      {verifyItem && (
        <DeepVerifyModal
          isOpen={!!verifyItem}
          onClose={handleCloseVerifyModal}
          productName={verifyItem.productName || "Scanned Specimen"}
          brand={verifyItem.brand || "Designer Brand"}
          category={verifyItem.category || "Luxury / Fashion"}
          initialImage={photoUrls[verifyItem.photoId] || undefined}
        />
      )}
    </div>
  );
}
