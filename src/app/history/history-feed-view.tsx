"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Scan,
  History,
  ChevronLeft,
  ChevronRight,
  Scale,
  CheckSquare,
  Square,
  Lock,
  Search,
  X,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { ClearAllHistoryButton } from "./delete-button";
import { ScanItemCard } from "./scan-item-card";
import ItemComparisonModal, { ComparisonItem } from "@/components/item-comparison-modal";
import EbayListingModal from "@/components/ebay-listing-modal";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import { supabase } from "@/app/lib/supabase";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface ScanRecord {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
  result_json: any;
  token_count: number;
  status: "completed" | "failed";
}

interface HistoryFeedViewProps {
  initialScans: ScanRecord[];
  totalCount: number;
  page: number;
  totalPages: number;
  activeStatus: string;
  error: { message: string } | null;
}

export function HistoryFeedView({
  initialScans,
  totalCount,
  page,
  totalPages,
  activeStatus,
  error,
}: HistoryFeedViewProps) {
  const [items, setItems] = useState<ScanRecord[]>(initialScans);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [activeEbayItem, setActiveEbayItem] = useState<ComparisonItem | null>(null);

  useEffect(() => {
    async function checkPro() {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      fetch("/api/stripe/status", { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : ({} as any)))
        .then((d: any) => {
          if (d?.active || d?.plan === "Pro") {
            setIsPro(true);
          }
        })
        .catch(() => {});
    }
    void checkPro();
  }, []);

  const toggleSelect = (id: string) => {
    triggerTactileHaptic("selection");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    triggerTactileHaptic("selection");
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((s) => {
      const res = s.result_json || {};
      const name = (
        res.analysis?.product_name ||
        res.detected_objects?.[0]?.product_name ||
        res.product_name ||
        ""
      ).toLowerCase();
      const brand = (res.analysis?.brand || res.brand || "").toLowerCase();
      const cat = (res.analysis?.category || res.category || "").toLowerCase();
      return name.includes(q) || brand.includes(q) || cat.includes(q);
    });
  }, [items, searchQuery]);

  const selectedComparisonItems: ComparisonItem[] = items
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => {
      const res = s.result_json || {};
      const name =
        res.analysis?.product_name ||
        res.detected_objects?.[0]?.product_name ||
        res.product_name ||
        "Scanned Item";
      const brand = res.analysis?.brand || res.brand || "Generic";
      const condition = res.analysis?.condition || "Used - Good";
      const estimatedValue = res.suggested_price_max || res.suggested_price_min || 25;
      const estimatedProfit = res.estimated_profit || Math.round(estimatedValue * 0.7 * 100) / 100;

      return {
        id: s.id,
        name,
        brand,
        category: res.analysis?.category,
        condition,
        estimatedValue,
        estimatedProfit,
        salesVelocity: res.sales_velocity,
        futureGrail: res.future_grail,
        imageUrl: s.image_url,
      };
    });

  return (
    <div className="space-y-6 pb-32 sm:pb-36 pb-[calc(env(safe-area-inset-bottom,0px)+8rem)]">
      {/* Executive Operational Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-2xl glass-card shadow-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] border border-white/[0.12] text-zinc-100 font-black shadow-md shrink-0">
              <History className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Scan History
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Archive
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Vision sessions, valuation comps &amp; secondary market listings.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Suite */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {items.length > 0 && (
            <ClearAllHistoryButton onClearedAll={() => setItems([])} />
          )}

          <Link
            href="/lens"
            onClick={() => triggerTactileHaptic("medium")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-[0_0_15px_rgba(0,242,254,0.3)] active:scale-95 cursor-pointer"
          >
            <Scan className="h-4 w-4 text-slate-950" />
            <span>Launch Lens AR</span>
          </Link>
        </div>
      </div>

      {/* Stat Bar — 8pt grid p-4 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl glass-card shadow-sm flex flex-col gap-2">
          <span className="hud-label">
            Total Scans
          </span>
          <span className="text-2xl font-black text-white font-mono tabular-nums leading-none">
            {totalCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card shadow-sm flex flex-col gap-2">
          <span className="hud-label">
            Pagination
          </span>
          <span className="text-base font-bold text-zinc-200 font-mono leading-none">
            {page} / {totalPages}
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card shadow-sm flex flex-col gap-2">
          <span className="hud-label">
            Active Filter
          </span>
          <span className="text-sm font-mono font-black uppercase text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.4)] leading-none">
            {activeStatus === "all" ? "All" : activeStatus}
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card shadow-sm flex flex-col gap-2">
          <span className="hud-label">
            Selected
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-[#CCFF00] font-mono tabular-nums leading-none drop-shadow-[0_0_8px_rgba(204,255,0,0.4)]">
              {selectedIds.length}
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerTactileHaptic("light");
                  setSelectedIds([]);
                }}
                className="text-[10px] font-mono text-zinc-500 hover:text-zinc-200 underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar — 8pt grid */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-2xl glass-card backdrop-blur-xl bg-white/[0.03] border border-white/10">
        {/* Status Filter Tabs */}
        <div className="scroll-x-snap flex items-center gap-2 pb-1 sm:pb-0">
          <Link
            href="/history?status=all"
            onClick={() => triggerTactileHaptic("selection")}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-transform duration-75 shrink-0 active:scale-95 ${
              activeStatus === "all"
                ? "bg-white text-zinc-950 shadow-sm font-black"
                : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
            }`}
          >
            All
          </Link>
          <Link
            href="/history?status=completed"
            onClick={() => triggerTactileHaptic("selection")}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-transform duration-75 shrink-0 active:scale-95 ${
              activeStatus === "completed"
                ? "bg-[#CCFF00] text-black font-black shadow-[0_0_16px_rgba(204,255,0,0.4)]"
                : "text-zinc-400 hover:text-[#CCFF00] bg-black/40 border border-white/5"
            }`}
          >
            Completed
          </Link>
          <Link
            href="/history?status=failed"
            onClick={() => triggerTactileHaptic("selection")}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-transform duration-75 shrink-0 active:scale-95 ${
              activeStatus === "failed"
                ? "bg-rose-500 text-white font-black shadow-[0_0_16px_rgba(244,63,94,0.4)]"
                : "text-zinc-400 hover:text-rose-400 bg-black/40 border border-white/5"
            }`}
          >
            Flagged
          </Link>

          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-2 rounded-xl text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-black/40 border border-white/10 transition-transform duration-75 cursor-pointer shrink-0 ml-1 active:scale-95"
            >
              {selectedIds.length === filteredItems.length ? "Deselect" : "Select All"}
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or brand..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/50 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 glass border border-white/[0.06] rounded-2xl text-xs flex gap-3 items-start">
          <div className="status-loading-dot mt-1" />
          <div>
            <div className="font-bold text-zinc-300">Database Scan History Status</div>
            <div className="text-zinc-500 mt-0.5">
              {error.message || "Unable to retrieve scan history records."}
            </div>
          </div>
        </div>
      )}

      {/* Scan List */}
      {items.length === 0 ? (
        <div className="text-center py-16 px-6 glass-card border border-white/[0.06] rounded-2xl space-y-3">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">
            <Scan className="w-7 h-7 stroke-1 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-white">No Scan Records Found</h3>
          <p className="text-zinc-400 text-xs max-w-md mx-auto">
            {activeStatus === "all"
              ? "Items scanned using Spadas Lens AR will automatically persist to your account history feed with full comps."
              : `No historical scan records match status filter: '${activeStatus}'.`}
          </p>
          <Link
            href="/lens"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 badge-active rounded-xl text-xs font-semibold hover:bg-[#00F2FE]/15 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Scan className="w-4 h-4" />
            <span>Scan Your First Item</span>
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center rounded-2xl glass-card border border-white/[0.06] text-zinc-500 font-mono text-xs">
          No scan records match current search filter: &quot;{searchQuery}&quot;
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((scan) => {
            const isSelected = selectedIds.includes(scan.id);
            return (
              <div key={scan.id} className="feed-card relative flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSelect(scan.id)}
                  className="p-1 text-zinc-600 hover:text-emerald-400 transition cursor-pointer shrink-0"
                  title={isSelected ? "Deselect item" : "Select item for side-by-side comparison"}
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-zinc-700 hover:text-zinc-500" />
                  )}
                </button>

                <div className="grow min-w-0">
                  <ScanItemCard
                    scan={scan}
                    onDeleted={() => {
                      setItems((prev) => prev.filter((s) => s.id !== scan.id));
                      setSelectedIds((prev) => prev.filter((i) => i !== scan.id));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Comparison Floating Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-[55] selection-bar-enter max-w-[92vw]">
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                triggerTactileHaptic("warning");
                setIsPaywallOpen(true);
                return;
              }
              triggerTactileHaptic("medium");
              setIsCompareOpen(true);
            }}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#00F2FE] via-teal-400 to-[#CCFF00] px-6 py-3 text-xs sm:text-sm font-black text-black shadow-[0_0_35px_rgba(0,242,254,0.55)] border border-white/20 hover:scale-105 active:scale-95 transition cursor-pointer whitespace-nowrap"
          >
            <Scale className="w-4 h-4 text-black" />
            <span>Compare Selected ({selectedIds.length} Items)</span>
            <span className="bg-black/90 text-[#00F2FE] border border-[#00F2FE]/40 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-[0_0_8px_rgba(0,242,254,0.3)]">
              <Lock className="w-2.5 h-2.5 text-[#00F2FE]" /> PRO
            </span>
          </button>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      <ItemComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        items={selectedComparisonItems}
        onListEbay={(compItem) => {
          setIsCompareOpen(false);
          setActiveEbayItem(compItem);
        }}
      />

      {/* Subscription Paywall Modal for Non-Pro Users */}
      <SubscriptionPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        currentScans={10}
      />

      {/* Ebay Listing Automation Modal */}
      {activeEbayItem && (
        <EbayListingModal
          isOpen={!!activeEbayItem}
          onClose={() => setActiveEbayItem(null)}
          title={activeEbayItem.name}
          brand={activeEbayItem.brand}
          price={activeEbayItem.estimatedValue}
          currency={(activeEbayItem as any).currency}
          condition={activeEbayItem.condition}
          description={`Authentic ${activeEbayItem.brand || ""} ${activeEbayItem.name}. Clean pre-owned condition, tested & working.`}
          imageUrls={activeEbayItem.imageUrl ? [activeEbayItem.imageUrl] : []}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-6">
          <Link
            href={`/history?page=${Math.max(1, page - 1)}&status=${activeStatus}`}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border border-white/[0.08] transition-colors flex items-center gap-2 ${
              page <= 1
                ? "pointer-events-none opacity-40 text-zinc-600 bg-zinc-900"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Page</span>
          </Link>
          <span className="text-xs font-mono text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/history?page=${Math.min(totalPages, page + 1)}&status=${activeStatus}`}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border border-white/[0.08] transition-colors flex items-center gap-2 ${
              page >= totalPages
                ? "pointer-events-none opacity-40 text-zinc-600 bg-zinc-900"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
