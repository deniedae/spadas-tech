"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight, AlertTriangle, Filter, Scale, CheckSquare, Square, Lock } from "lucide-react";
import { ClearAllHistoryButton } from "./delete-button";
import { ScanItemCard } from "./scan-item-card";
import ItemComparisonModal, { ComparisonItem } from "@/components/item-comparison-modal";
import EbayListingModal from "@/components/ebay-listing-modal";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";

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
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [activeEbayItem, setActiveEbayItem] = useState<ComparisonItem | null>(null);

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.active || d.plan === "Pro") {
          setIsPro(true);
        }
      })
      .catch(() => {});
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
            <Camera className="w-4 h-4" />
            <span>SPADAS LENS AR PERSISTENCE</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Scan History Feed</h1>
          <p className="text-slate-400 text-sm mt-1">
            Showing page {page} of {totalPages} ({totalCount} total scans recorded)
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {items.length > 0 && (
            <ClearAllHistoryButton onClearedAll={() => setItems([])} />
          )}
          <Link
            href="/lens"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Camera className="w-4 h-4" />
            <span>Launch AR Scanner</span>
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs & Selection Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold px-3 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filter Status:</span>
          </span>
          <Link
            href="/history?status=all"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStatus === "all"
                ? "bg-slate-800 text-slate-100 border border-slate-700 shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            All Scans
          </Link>
          <Link
            href="/history?status=completed"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStatus === "completed"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow"
                : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
            }`}
          >
            Completed Only
          </Link>
          <Link
            href="/history?status=failed"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStatus === "failed"
                ? "bg-rose-950/80 text-rose-300 border border-rose-800/80 shadow"
                : "text-slate-400 hover:text-rose-400 hover:bg-slate-900"
            }`}
          >
            Failed Only
          </Link>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {selectedIds.length} Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <div className="font-semibold text-amber-200">Database Scan History Table Status</div>
            <div className="text-xs text-amber-400/80 mt-0.5">
              {error.message || "Unable to retrieve scan history records."}
            </div>
          </div>
        </div>
      )}

      {/* Scan List */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
          <Camera className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">No scan records found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {activeStatus === "all"
              ? "Scans executed in Spadas Lens will automatically persist to your account history feed."
              : `No scan records match status filter: '${activeStatus}'.`}
          </p>
          <Link
            href="/lens"
            className="inline-block mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors"
          >
            Scan Your First Item
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((scan) => {
            const isSelected = selectedIds.includes(scan.id);
            return (
              <div key={scan.id} className="relative flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSelect(scan.id)}
                  className="p-1 text-slate-500 hover:text-emerald-400 transition cursor-pointer shrink-0"
                  title={isSelected ? "Deselect item" : "Select item for comparison"}
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-700 hover:text-slate-500" />
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in max-w-[92vw]">
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                setIsPaywallOpen(true);
                return;
              }
              setIsCompareOpen(true);
            }}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-6 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition cursor-pointer whitespace-nowrap"
          >
            <Scale className="w-4 h-4 text-slate-950" />
            <span>Compare Selected ({selectedIds.length} Items)</span>
            <span className="bg-slate-950/80 text-amber-300 border border-amber-400/40 text-[10px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> PRO
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
          condition={activeEbayItem.condition}
          description={`Authentic ${activeEbayItem.brand || ""} ${activeEbayItem.name}. Clean pre-owned condition, tested & working.`}
          imageUrls={activeEbayItem.imageUrl ? [activeEbayItem.imageUrl] : []}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <Link
            href={`/history?page=${Math.max(1, page - 1)}&status=${activeStatus}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-800 transition-colors flex items-center gap-2 ${
              page <= 1
                ? "pointer-events-none opacity-40 text-slate-600 bg-slate-900"
                : "bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Page</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/history?page=${Math.min(totalPages, page + 1)}&status=${activeStatus}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-800 transition-colors flex items-center gap-2 ${
              page >= totalPages
                ? "pointer-events-none opacity-40 text-slate-600 bg-slate-900"
                : "bg-slate-900 text-slate-200 hover:bg-slate-800"
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
