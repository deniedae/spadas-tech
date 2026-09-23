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
  WifiOff,
  Package,
} from "lucide-react";
import {
  RapidThriftItem,
  getPhotoBlob,
} from "@/lib/rapid-thrift-engine";
import { useHaulStore } from "@/lib/haul-store";
import { useQuickSnapQueue, quickSnapQueue } from "@/lib/quick-snap-queue";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import { formatAUD } from "@/app/lib/listings";
import dynamic from "next/dynamic";
import { toast } from "sonner";
const EbayListingModal = dynamic(() => import("@/components/ebay-listing-modal"), { ssr: false });
const DeepVerifyModal = dynamic(() => import("@/components/deep-verify-modal").then((m) => m.DeepVerifyModal), { ssr: false });
const RawCompsModal = dynamic(() => import("@/components/raw-comps-modal"), { ssr: false });
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
    addItem,
    removeItem,
    clearHaul,
    setItems,
    updateItem,
    refresh: refreshItems,
  } = useHaulStore();

  const [activeCompsItem, setActiveCompsItem] = useState<RapidThriftItem | null>(null);

  const photoUrlsRef = React.useRef<Record<string, string>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "profitable" | "grails" | "traps">("all");
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // In-flight commitment states for UI stability
  const [committingId, setCommittingId] = useState<string | null>(null);
  const [isBatchCommitting, setIsBatchCommitting] = useState<boolean>(false);
  const [refetchingCompsId, setRefetchingCompsId] = useState<string | null>(null);
  const [editingQueryItemId, setEditingQueryItemId] = useState<string | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState<string>("");

  // Modals state
  const [ebayItem, setEbayItem] = useState<RapidThriftItem | null>(null);
  const [verifyItem, setVerifyItem] = useState<RapidThriftItem | null>(null);

  const handleCloseEbayModal = useCallback(() => setEbayItem(null), []);
  const handleCloseVerifyModal = useCallback(() => setVerifyItem(null), []);

  const handleRecalculateComps = useCallback((newMin: number, newMax: number, newAvg: number, activeCount: number) => {
    if (!activeCompsItem) return;
    updateItem(activeCompsItem.id, {
      minPrice: newMin,
      maxPrice: newMax,
      estimatedValue: newAvg,
      compsCount: activeCount,
      trueNetProfit: newAvg - (activeCompsItem.thriftCost || 0)
    });
  }, [activeCompsItem, updateItem]);

  const refetchHaulItemComps = useCallback(
    async (itemId: string, searchTitle?: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const queryToUse = (searchTitle || item.searchTitle || item.productName || "").trim();
      if (!queryToUse) {
        toast.error("Please enter a title to search comps.");
        return;
      }

      setRefetchingCompsId(itemId);
      updateItem(itemId, { status: "fetching_comps", searchTitle: queryToUse });
      const toastId = `comps-fetch-${itemId}`;
      toast.loading(`Searching sold comps for "${queryToUse}"...`, { id: toastId });

      try {
        const res = await fetch("/api/ebay-australia-comps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryToUse,
            brand: item.brand,
            category: item.category,
            condition: item.condition,
            currency,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        if (data && data.compsCount > 0) {
          const medianPrice = Number(data.median) || Number(item.estimatedValue) || 25;
          const cost = Number(item.thriftCost) || 5;
          const fee = medianPrice * 0.134 + 0.33;
          const shipping = data.crossBorderShippingCost ? 25 : 8.50;
          const recalculatedNet = Math.max(0, Math.round((medianPrice - cost - fee - shipping) * 100) / 100);
          const recalculatedRoi = cost > 0 ? Math.round((recalculatedNet / cost) * 100) : 0;
          const recalculatedVerdict = recalculatedNet >= 40 ? "MUST_COP" : recalculatedNet >= 15 ? "QUICK_FLIP" : "PASS_RISKY";

          updateItem(itemId, {
            status: "completed",
            estimatedValue: medianPrice,
            minPrice: data.minPrice,
            maxPrice: data.maxPrice,
            compsCount: data.compsCount,
            rawComps: data.comps || data.rawComps || [],
            comps: data.comps || data.rawComps || [],
            searchTitle: queryToUse,
            trueNetProfit: recalculatedNet,
            roiPercentage: recalculatedRoi,
            copVerdict: recalculatedVerdict,
            isGrail: recalculatedNet >= 50,
          });

          toast.success(`Found ${data.compsCount} sold comps for "${queryToUse}"!`, { id: toastId });
          setEditingQueryItemId(null);
        } else {
          updateItem(itemId, { status: "completed", compsCount: 0 });
          toast.info("No comps found on eBay AU or US for this query.", { id: toastId });
        }
      } catch (err: any) {
        console.warn("[Haul Section] Refetch comps error:", err);
        updateItem(itemId, { status: "completed" });
        toast.error("Failed to fetch comps. Please check your connection.", { id: toastId });
      } finally {
        setRefetchingCompsId(null);
      }
    },
    [items, currency, updateItem]
  );

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
      "Sales Speed",
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
        `"${vel.velocityLabel} (${vel.sellThroughRate}% sell-through)"`,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 sm:p-6 rounded-2xl glass-card card-specular surface-elevation-2 border border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
                  Haul Batch Manager
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm cursor-pointer active:scale-95"
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
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
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
        <div className="p-4 sm:p-5 rounded-2xl glass-card card-specular surface-elevation-1 border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition duration-200">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-400">Lot Units Sourced</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">{items.length}</span>
            <span className="text-[11px] text-zinc-500 ml-2">
              ({stats.profitableCount} Profitable)
            </span>
          </div>
        </div>

        {/* Metric 2: Gross Valuation Comps */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card card-specular surface-elevation-1 border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition duration-200">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-400">Est. Gross Comps</span>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-zinc-100 tabular-nums tracking-tight">
              ${totalGrossValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">{currency}</span>
          </div>
        </div>

        {/* Metric 3: Total Cost Basis */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card card-specular surface-elevation-1 border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition duration-200">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-400">Capital Basis (Cost)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums tracking-tight">
              ${totalCostBasis.toFixed(2)}
            </span>
            <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">{currency}</span>
          </div>
        </div>

        {/* Metric 4: Projected Net Margin & ROI */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card card-specular surface-elevation-1 border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition duration-200">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-400">Projected Net Margin</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-1 flex-wrap">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
                +${stats.totalProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-500/80 ml-1.5 font-mono">{currency}</span>
            </div>
            {aggregateRoi > 0 && (
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                +{aggregateRoi}% ROI
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-2xl glass-card card-specular border border-white/[0.08]">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic("selection");
              setActiveTabFilter("all");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "all"
                ? "bg-white text-slate-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06]"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "profitable"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-emerald-400 bg-white/[0.04] border border-white/[0.06]"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "grails"
                ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-amber-300 bg-white/[0.04] border border-white/[0.06]"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 ${
              activeTabFilter === "traps"
                ? "bg-rose-500 text-white font-bold shadow-sm"
                : "text-zinc-400 hover:text-rose-400 bg-white/[0.04] border border-white/[0.06]"
            }`}
          >
            Stale Capital Risks
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <input
            type="text"
            placeholder="Search haul..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full h-8 pl-3 pr-8 rounded-xl bg-[#090C13] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Lot Manifest List / Empty State / Hydration Skeleton */}
      {!isHydrated ? (
        <div className="space-y-3 pb-28 md:pb-24">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl glass-card card-specular border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-zinc-900/80 border border-white/5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2 py-1">
                  <div className="h-3 w-20 bg-zinc-800/80 rounded" />
                  <div className="h-4 w-48 sm:w-64 bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-900 rounded" />
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <div className="h-6 w-20 bg-zinc-800 rounded" />
                <div className="h-3 w-14 bg-zinc-900 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-2xl glass-card card-specular surface-elevation-1 border border-white/10 space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 text-zinc-400 shadow-inner">
            <ShoppingBag className="h-6 w-6 stroke-1 text-zinc-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm font-bold text-white">No items in Haul</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Launch the Camera to scan items, and they will automatically aggregate here with real-time sell-through comps and net profit calculations.
            </p>
          </div>
          <div className="flex justify-center gap-3 mt-4">
            {onSwitchToLens && (
              <button
                type="button"
                onClick={onSwitchToLens}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs transition cursor-pointer shadow-sm active:scale-95"
              >
                <Scan className="h-3.5 w-3.5" />
                <span>Launch Scanner</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const sampleItem: RapidThriftItem = {
                  id: `sample-${Date.now()}`,
                  photoId: `photo-sample`,
                  status: "completed",
                  productName: "Vintage Nike Embroidered Swoosh Crewneck",
                  brand: "Nike",
                  category: "Streetwear & Apparel",
                  condition: "Used - Good",
                  estimatedValue: 85,
                  thriftCost: 8,
                  trueNetProfit: 65,
                  roiPercentage: 812,
                  copVerdict: "MUST_COP",
                  isGrail: true,
                  timestamp: Date.now(),
                  syncStatus: "synced"
                };
                addItem(sampleItem);
                toast.success("Sample scan added to Haul!");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 rounded-xl font-medium text-xs transition cursor-pointer shadow-sm active:scale-95"
            >
              <span>View Sample Scan</span>
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center rounded-2xl glass-card card-specular border border-white/[0.08] text-zinc-400 text-xs font-semibold">
          No items match the active search filter.
        </div>
      ) : (
        <div
          className="space-y-3 pb-28 md:pb-24"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" }}
        >
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
                className={`p-4 sm:p-5 rounded-2xl glass-card card-specular surface-elevation-1 border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/25 ${
                  isHighProfit
                    ? "bg-amber-950/20 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                    : isProfit
                    ? "bg-emerald-950/20 border-emerald-500/20"
                    : isTrap
                    ? "bg-rose-950/20 border-rose-500/20"
                    : "border-white/[0.08]"
                }`}
              >
                {/* Left Side: Thumbnail & Identification */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shrink-0 flex items-center justify-center shadow-inner">
                    {photoUrl || item.thumbnailUrl || item.image || item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl || item.thumbnailUrl || item.image || item.imageUrl}
                        alt={item.productName || "Haul Item"}
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <Package className="h-5 w-5" />
                        <span className="text-[9px] font-semibold mt-0.5">PHOTO</span>
                      </div>
                    )}
                    {item.status === "analyzing" && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center backdrop-blur-xs">
                        <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isMeaningfulMeta(item.brand) && (
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          {item.brand.trim()}
                        </span>
                      )}
                      {item.copVerdict && (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            item.copVerdict === "MUST_COP"
                              ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                              : item.copVerdict === "QUICK_FLIP"
                              ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                              : item.copVerdict === "VERIFY_FIRST"
                              ? "bg-amber-900/30 text-amber-300 border border-amber-700/50"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {item.copVerdict.replace(/_/g, " ")}
                        </span>
                      )}
                      {item.needsVerification && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50 flex items-center gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" /> VERIFY REQUIRED
                        </span>
                      )}
                      {item.syncStatus === "pending" && (
                        <button 
                          onClick={() => quickSnapQueue.retryItem(item.id)}
                          className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                          <WifiOff className="h-2.5 w-2.5" /> RETRY SYNC
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-100 truncate">
                      {item.productName || (item.status === "completed" ? "Sourced Thrift Item" : "Analyzing Thrift Item...")}
                    </h3>

                    {/* Financial Metrics Row */}
                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex items-center gap-2 font-semibold text-xs flex-wrap">
                        <span className="text-zinc-500">
                          Cost: <strong className="text-zinc-300">${(item.thriftCost || 0).toFixed(2)}</strong>
                        </span>
                        <span className="text-zinc-700">→</span>
                        <span className="text-zinc-500">
                          Value: <strong className="text-zinc-300">${(item.estimatedValue || 0).toFixed(2)}</strong>
                        </span>
                        <span className="text-zinc-700">•</span>
                        <span
                          className={`font-bold ${
                            (item.trueNetProfit || 0) > 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatAUD(item.trueNetProfit || 0)} Net
                        </span>
                      </div>
                      
                      {item.status === "fetching_comps" || refetchingCompsId === item.id ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                            Fetching sold comps...
                          </span>
                        </div>
                      ) : item.compsCount ? (
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <div className="text-[10px] text-zinc-500 font-semibold">
                            Based on {item.compsCount} sold comps
                          </div>
                          <span className="text-zinc-700">|</span>
                          <div className="text-[10px] text-zinc-500 font-semibold">
                            Range: ${item.minPrice?.toFixed(2)} – ${item.maxPrice?.toFixed(2)}
                          </div>
                          <span className="text-zinc-700">|</span>
                          <button 
                            onClick={() => setActiveCompsItem(item)}
                            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                          >
                            View Comps
                          </button>
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          {editingQueryItemId === item.id ? (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <input
                                type="text"
                                value={customSearchQuery}
                                onChange={(e) => setCustomSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (!item.comps || item.comps.length === 0) {
                                      void refetchHaulItemComps(item.id, customSearchQuery);
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingQueryItemId(null);
                                  }
                                }}
                                placeholder="Edit title for comps..."
                                className="bg-slate-900 border border-cyan-500/40 text-white text-[11px] px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 w-48 sm:w-64"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!item.comps || item.comps.length === 0) {
                                    void refetchHaulItemComps(item.id, customSearchQuery);
                                  }
                                }}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer active:scale-95"
                              >
                                Search
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingQueryItemId(null)}
                                className="text-[10px] text-zinc-400 hover:text-white px-1.5 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-zinc-600 font-semibold italic">
                                Comp data unavailable
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQueryItemId(item.id);
                                  setCustomSearchQuery(item.searchTitle || item.productName || "");
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-md transition cursor-pointer active:scale-95"
                                title="Edit title and search comps"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Retry Comps</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Velocity Pill */}
                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          velocity.turnoverTier === "RAPID_FIRE"
                            ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/50"
                            : velocity.turnoverTier === "HOARDER_RISK"
                            ? "bg-rose-900/30 text-rose-300 border-rose-700/50"
                            : "bg-cyan-900/30 text-cyan-300 border-cyan-700/50"
                        }`}
                      >
                        {velocity.turnoverTier === "RAPID_FIRE" && "⚡ "}
                        {velocity.turnoverTier === "HOARDER_RISK" && "🛑 "}
                        {velocity.velocityLabel} ({velocity.sellThroughRate}% sold • ~{velocity.estDaysToSell}d turn)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Control Suite */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddToInventory(item)}
                      disabled={committingId === item.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 text-xs font-semibold transition cursor-pointer active:scale-95"
                      title="Draft directly to eBay Australia"
                    >
                      <span>EBAY</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </button>

                    {item.needsVerification && (
                      <button
                        type="button"
                        onClick={() => setVerifyItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer active:scale-95"
                        title="Run Deep Forensic Verification"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>AUDIT</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer active:scale-95"
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

      {/* Persistent Floating Action Footer for Quick Intake & CSV Export on Mobile (Anchored strictly above bottom nav) */}
      {items.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 md:hidden pointer-events-none animate-fade-in">
          <div className="max-w-md mx-auto flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-950/95 border border-white/10 backdrop-blur-xl shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={handleBatchCommitToInventory}
              disabled={isBatchCommitting || stats.profitableCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md active:scale-95 disabled:opacity-40"
              title="Commit All Profitable Items to Inventory"
            >
              {isBatchCommitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />
              ) : (
                <PackagePlus className="h-3.5 w-3.5" />
              )}
              <span>Commit All ({stats.profitableCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic("tap");
                handleExportCsv();
              }}
              className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-zinc-100 border border-white/10 text-xs font-semibold active:scale-95 transition"
              title="Export Manifest CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
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

      {/* Raw Comps Modal */}
      {activeCompsItem && (
        <RawCompsModal
          isOpen={!!activeCompsItem}
          onClose={() => setActiveCompsItem(null)}
          scanId={activeCompsItem.id}
          initialComps={Array.isArray(activeCompsItem.rawComps) ? activeCompsItem.rawComps : []}
          currencySymbol="$"
          onRecalculate={handleRecalculateComps}
        />
      )}
    </div>
  );
}
