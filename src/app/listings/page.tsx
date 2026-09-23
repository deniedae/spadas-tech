"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import EditListingDialog from "@/components/edit-listing-dialog";
import ExportListingDialog from "@/components/export-listing-dialog";
import NewListingDialog from "@/components/new-listing-dialog";
import EbayListingModal from "@/components/ebay-listing-modal";
import { toast } from "sonner";
import { fmtMoney, calcProfit, calcInventoryValue } from "@/app/lib/listings";
import { fetchUserListings, deleteListingFromFirestore } from "@/app/lib/firestore-listings";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import {
  Package,
  Search,
  ImageIcon,
  Trash2,
  PackageOpen,
  AlertCircle,
  X,
  Camera,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Zap,
  ShieldAlert,
  ExternalLink,
  Scan,
  Headphones,
} from "lucide-react";
import dynamic from "next/dynamic";
import { openSpadasSupport } from "@/components/dashboard-support-desk";

const DashboardSupportDesk = dynamic(() => import("@/components/dashboard-support-desk"), {
  ssr: false,
});
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import DashboardCards from "@/components/dashboard-cards";

export interface Listing {
  id: string;
  product: string;
  description?: string;
  price: number | string | null;
  cost: number | string | null;
  purchase_price?: number | string | null;
  sold_price?: number | string | null;
  shipping_cost?: number | string | null;
  fees?: number | string | null;
  sold_at?: string | null;
  status: "Draft" | "Active" | "Sold" | string;
  image_url: string | null;
  created_at?: string;
}

type FilterType = "ALL" | "FAST_FLIPS" | "TRAPS" | "Draft" | "Active" | "Sold";

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterType>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "profit_high" | "price_high" | "price_low">("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected item for 1-click eBay publish modal
  const [ebayPublishItem, setEbayPublishItem] = useState<Listing | null>(null);

  useEffect(() => {
    void loadListings();
  }, [router]);

  async function loadListings() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      let primaryListings: Listing[] = [];

      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        primaryListings = data || [];
      } catch (sbErr: any) {
        console.warn("Supabase fetch failed, attempting Firestore fallback:", sbErr);
      }

      // If Supabase was empty or failed, attempt Firestore sync fallback
      if (primaryListings.length === 0) {
        try {
          const firestoreItems = await fetchUserListings(user.id);
          if (firestoreItems && firestoreItems.length > 0) {
            primaryListings = firestoreItems as unknown as Listing[];
          }
        } catch (fsErr) {
          console.warn("Firestore sync fallback also empty/failed:", fsErr);
        }
      }

      setListings(primaryListings);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  async function updateListingStatus(
    id: string,
    newStatus: "Draft" | "Active" | "Sold"
  ) {
    const updated = listings.map((l) =>
      l.id === id ? { ...l, status: newStatus } : l
    );
    setListings(updated);

    try {
      const { error } = await supabase
        .from("listings")
        .update({
          status: newStatus,
          sold_at: newStatus === "Sold" ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Listing marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status on server");
      void loadListings();
    }
  }

  async function deleteListing(id: string) {
    const previous = [...listings];
    setListings((prev) => prev.filter((l) => l.id !== id));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from("listings")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
    } catch {}

    try {
      await deleteListingFromFirestore(id, user.id);
    } catch {}

    toast.success("Listing deleted!");
    loadListings();
  }

  // Compute Items with Turnover Velocity Profiles
  const listingsWithVelocity = useMemo(() => {
    return listings.map((item) => {
      const velocity = calculateSalesVelocity({
        productName: item.product,
        category: "",
      });
      const profit = calcProfit(item);
      const cost = Number(item.cost || item.purchase_price) || 0;
      const price = Number(item.price) || 0;
      return {
        ...item,
        velocity,
        calculatedProfit: profit,
        calculatedCost: cost,
        calculatedPrice: price,
      };
    });
  }, [listings]);

  const fastFlipsCount = useMemo(
    () => listingsWithVelocity.filter((i) => i.velocity.sellThroughRate > 90).length,
    [listingsWithVelocity]
  );
  const trapsCount = useMemo(
    () =>
      listingsWithVelocity.filter(
        (i) => i.velocity.sellThroughRate < 25 || i.velocity.isHoarderRisk
      ).length,
    [listingsWithVelocity]
  );

  // Filtered & Sorted Listings
  const filteredListings = useMemo(() => {
    return listingsWithVelocity
      .filter((item) => {
        const matchesSearch = (item.product || "")
          .toLowerCase()
          .includes(search.toLowerCase());
        if (!matchesSearch) return false;

        if (statusFilter === "ALL") return true;
        if (statusFilter === "FAST_FLIPS") return item.velocity.sellThroughRate > 90;
        if (statusFilter === "TRAPS")
          return (
            item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk
          );
        return item.status === statusFilter;
      })
      .sort((a, b) => {
        if (sortBy === "profit_high")
          return b.calculatedProfit - a.calculatedProfit;
        if (sortBy === "price_high") return b.calculatedPrice - a.calculatedPrice;
        if (sortBy === "price_low") return a.calculatedPrice - b.calculatedPrice;
        return 0; // default newest from db
      });
  }, [listingsWithVelocity, search, statusFilter, sortBy]);

  // Metrics
  const totalListings = listings.length;
  const draftListings = listings.filter((item) => item.status === "Draft").length;
  const activeListings = listings.filter((item) => item.status === "Active").length;
  const soldListings = listings.filter((item) => item.status === "Sold").length;
  const totalProfit = listings.reduce((total, item) => total + calcProfit(item), 0);
  const inventoryValue = calcInventoryValue(listings);

  if (loading) {
    return (
      <main
        className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-zinc-100 pb-28 md:pb-24 overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded bg-zinc-800 animate-pulse" />
            <div className="h-3.5 w-72 rounded bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-[#0E1118] border border-zinc-800 animate-pulse"
            />
          ))}
        </div>
        <div className="h-10 w-full rounded bg-[#0E1118] border border-zinc-800 animate-pulse" />
      </main>
    );
  }

  return (
    <main
      className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-zinc-100 pb-28 md:pb-24 overflow-y-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" }}
    >
      {/* Executive Portfolio Header */}
      <div className="p-5 sm:p-6 rounded-2xl glass-card card-specular surface-elevation-2 border border-white/10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Active Portfolio & Listings
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Direct Sync
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Secondary market catalog with sell-through rate velocity and 1-tap marketplace dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadListings}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-95"
            title="Refresh Listings"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <Link
            href="/lens"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs transition shadow-md active:scale-95 cursor-pointer"
          >
            <Scan className="h-3.5 w-3.5" />
            <span>Launch Lens AR</span>
          </Link>

          <NewListingDialog />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-mono text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded p-1 text-rose-300 hover:bg-rose-500/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Real-Time Dashboard KPI Cards */}
      <DashboardCards
        totalListings={totalListings}
        soldListings={soldListings}
        totalProfit={totalProfit}
        inventoryValue={inventoryValue}
      />

      {/* Control Bar: Precision Filters, Search & Sort */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 glass-card card-specular border border-white/[0.08] p-3 rounded-2xl">
          {/* Segmented Mechanical Status Tabs with Inset Pressed State */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 select-none">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                statusFilter === "ALL"
                  ? "bg-white text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06]"
              }`}
            >
              <span>All [{totalListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("FAST_FLIPS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                statusFilter === "FAST_FLIPS"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-emerald-400 bg-white/[0.04] border border-white/[0.06]"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>High Velocity [{fastFlipsCount}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("TRAPS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                statusFilter === "TRAPS"
                  ? "bg-rose-500 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-rose-400 bg-white/[0.04] border border-white/[0.06]"
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Low Turnover [{trapsCount}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                statusFilter === "Active"
                  ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-sky-400 bg-white/[0.04] border border-white/[0.06]"
              }`}
            >
              <span>Active [{activeListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Draft")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                statusFilter === "Draft"
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-amber-300 bg-white/[0.04] border border-white/[0.06]"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Drafts [{draftListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Sold")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                statusFilter === "Sold"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-emerald-400 bg-white/[0.04] border border-white/[0.06]"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Sold [{soldListings}]</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter by title, brand, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-xl bg-[#090C13] border border-white/10 pl-8 pr-7 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded-xl bg-[#090C13] border border-white/10 px-2.5 text-xs font-semibold text-zinc-300 focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="profit_high">Highest Margin</option>
              <option value="price_high">Highest Price</option>
              <option value="price_low">Lowest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Data Grid View */}
      {filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 glass-card card-specular surface-elevation-1 p-12 sm:p-16 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 text-zinc-400 shadow-inner">
            <PackageOpen className="h-6 w-6 stroke-1 text-zinc-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              {search ? "No matching listings found" : "No items in this filter"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No items found matching "${search}". Adjust search query.`
                : "Point your camera at thrift or retail inventory using Lens AR to populate your catalog."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/lens"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Scan className="h-3.5 w-3.5" />
              <span>SCAN SPECIMEN</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: Card List with Direct eBay Publish Action Bars */}
          <div className="block sm:hidden space-y-3">
            {filteredListings.map((item) => {
              const isFastFlip = item.velocity.sellThroughRate > 90;
              const isTrap =
                item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk;

              return (
                <div key={item.id} className="p-4 rounded-2xl glass-card card-specular surface-elevation-1 border border-white/[0.08] hover:border-white/20 transition-all space-y-3">
                  <div className="flex items-start gap-3">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0 shadow-inner"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-white/10 text-zinc-500 shrink-0">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-100 text-xs truncate">
                        {item.product}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500">
                        ID: {String(item.id || "").slice(0, 8)}
                      </span>

                      {/* Price & Profit Row */}
                      <div className="flex items-center justify-between mt-1.5 text-[11px] font-semibold">
                        <div className="text-zinc-400 font-mono">
                          <span className="text-zinc-500">Cost:</span> {fmtMoney(item.calculatedCost)}
                          <span className="text-zinc-600 mx-1">→</span>
                          <span className="text-zinc-200">{fmtMoney(item.calculatedPrice)}</span>
                        </div>
                        <div
                          className={`font-mono font-bold ${
                            item.calculatedProfit > 0
                              ? "text-emerald-400"
                              : item.calculatedProfit < 0
                              ? "text-rose-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {item.calculatedProfit > 0
                            ? `+${fmtMoney(item.calculatedProfit)}`
                            : fmtMoney(item.calculatedProfit)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Velocity, Status Badge & Direct eBay Publish Action Bar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                          isFastFlip
                            ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/50"
                            : isTrap
                            ? "bg-rose-900/30 text-rose-300 border-rose-700/50"
                            : "bg-white/[0.04] text-zinc-400 border-white/10"
                        }`}
                      >
                        {isFastFlip && "⚡"}
                        {isTrap && "🛑"}
                        {item.velocity.velocityLabel}
                      </span>
                      <span className="text-zinc-500 font-mono">
                        ~{item.velocity.estDaysToSell}d
                      </span>
                    </div>

                    {/* Status Badge + Direct eBay Publish Action Button */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          updateListingStatus(item.id, e.target.value as any)
                        }
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 border cursor-pointer transition focus:outline-none ${
                          item.status === "Sold"
                            ? "bg-emerald-900/20 text-emerald-400 border-emerald-700/40"
                            : item.status === "Draft"
                            ? "bg-amber-900/20 text-amber-400 border-amber-700/40"
                            : "bg-sky-900/20 text-sky-400 border-sky-700/40"
                        }`}
                      >
                        <option value="Draft" className="bg-zinc-900 text-amber-400">
                          Draft
                        </option>
                        <option value="Active" className="bg-zinc-900 text-sky-400">
                          Active
                        </option>
                        <option value="Sold" className="bg-zinc-900 text-emerald-400">
                          Sold
                        </option>
                      </select>

                      {/* Direct eBay Publish Bar */}
                      <button
                        type="button"
                        onClick={() => setEbayPublishItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 text-[10px] font-bold transition cursor-pointer shrink-0 active:scale-95"
                        title="Publish directly to eBay"
                      >
                        <ShoppingBag className="w-3 h-3 text-amber-400" />
                        <span>EBAY</span>
                      </button>

                      <EditListingDialog listing={item} onUpdated={loadListings} />
                      <ExportListingDialog listing={item} />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <button
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer active:scale-95"
                              title="Delete listing"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                        <AlertDialogContent className="bg-[#0E1118] border-white/10 text-zinc-100 rounded-2xl glass-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              This action will permanently delete &ldquo;{item.product}&rdquo;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/[0.04] border-white/10 text-zinc-300 rounded-xl hover:bg-white/[0.08]">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteListing(item.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop/Tablet View: High-Density Table with Direct eBay Publish Bar Alongside Status Badge */}
          <div className="hidden sm:block overflow-hidden rounded-2xl glass-card card-specular surface-elevation-1 border border-white/[0.08]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    <th scope="col" className="py-3 px-3.5">
                      Product Item
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-right">
                      List Price
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-right">
                      Cost Basis
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-right">
                      Net Profit
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-center">
                      Sales Speed
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-center">
                      Turn Days
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-center">
                      Status & eBay Publish
                    </th>
                    <th scope="col" className="py-3 px-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.04] text-xs">
                  {filteredListings.map((item) => {
                    const isFastFlip = item.velocity.sellThroughRate > 90;
                    const isTrap =
                      item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk;

                    return (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-white/[0.03]"
                      >
                        {/* Product Info Column */}
                        <td className="py-3 px-3.5 font-sans">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.product}
                                width={36}
                                height={36}
                                loading="lazy"
                                className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0 shadow-inner"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-950 text-zinc-500">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[200px] sm:max-w-xs md:max-w-sm">
                              <p className="font-bold text-zinc-100 text-xs truncate group-hover:text-cyan-400 transition">
                                {item.product}
                              </p>
                              <span className="text-[10px] font-mono text-zinc-500">
                                ID: {String(item.id || "").slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* List Price (Tabular Monospace) */}
                        <td className="py-3 px-3.5 text-right tabular-nums font-mono font-semibold text-zinc-200">
                          {fmtMoney(item.calculatedPrice)}
                        </td>

                        {/* Cost Basis (Tabular Monospace) */}
                        <td className="py-3 px-3.5 text-right tabular-nums font-mono text-zinc-400 font-semibold">
                          {fmtMoney(item.calculatedCost)}
                        </td>

                        {/* Estimated Profit (Tabular Monospace) */}
                        <td
                          className={`py-3 px-3.5 text-right tabular-nums font-mono font-bold ${
                            item.calculatedProfit > 0
                              ? "text-emerald-400"
                              : item.calculatedProfit < 0
                              ? "text-rose-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {item.calculatedProfit > 0
                            ? `+${fmtMoney(item.calculatedProfit)}`
                            : fmtMoney(item.calculatedProfit)}
                        </td>

                        {/* Step 2: Sales Velocity (Strictly Color-Coded) */}
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border tabular-nums ${
                              isFastFlip
                                ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/50"
                                : isTrap
                                ? "bg-rose-900/30 text-rose-300 border-rose-700/50"
                                : "bg-white/[0.04] text-zinc-400 border-white/10"
                            }`}
                          >
                            {isFastFlip && "⚡ "}
                            {isTrap && "🛑 "}
                            {item.velocity.velocityLabel}
                          </span>
                        </td>

                        {/* Turn Days (Tabular Monospace) */}
                        <td className="py-3 px-3.5 text-center text-[11px] tabular-nums font-mono font-semibold text-zinc-400">
                          {item.velocity.estDaysToSell}
                        </td>

                        {/* Status Badge + Direct Accessible eBay Publish Action Button */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                updateListingStatus(item.id, e.target.value as any)
                              }
                              className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border cursor-pointer transition focus:outline-none ${
                                item.status === "Sold"
                                  ? "bg-emerald-900/20 text-emerald-400 border-emerald-700/40"
                                  : item.status === "Draft"
                                  ? "bg-amber-900/20 text-amber-400 border-amber-700/40"
                                  : "bg-sky-900/20 text-sky-400 border-sky-700/40"
                              }`}
                            >
                              <option value="Draft" className="bg-zinc-900 text-amber-400">
                                Draft
                              </option>
                              <option value="Active" className="bg-zinc-900 text-sky-400">
                                Active
                              </option>
                              <option value="Sold" className="bg-zinc-900 text-emerald-400">
                                Sold
                              </option>
                            </select>

                            {/* Direct eBay Publish Action Button */}
                            <button
                              type="button"
                              onClick={() => setEbayPublishItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 text-[10px] font-bold transition cursor-pointer shrink-0 active:scale-95"
                              title="Publish directly to eBay"
                            >
                              <ShoppingBag className="w-3 h-3 text-amber-400" />
                              <span>EBAY</span>
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditListingDialog listing={item} onUpdated={loadListings} />
                            <ExportListingDialog listing={item} />

                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <button
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer active:scale-95"
                                    title="Delete listing"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                }
                              />
                              <AlertDialogContent className="bg-[#0E1118] border-white/10 text-zinc-100 rounded-2xl glass-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-zinc-400">
                                    This action will permanently delete &ldquo;{item.product}&rdquo;.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-white/[0.04] border-white/10 text-zinc-300 rounded-xl hover:bg-white/[0.08]">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteListing(item.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Live eBay Publish Modal */}
      {ebayPublishItem && (
        <EbayListingModal
          isOpen={!!ebayPublishItem}
          onClose={() => {
            setEbayPublishItem(null);
            loadListings();
          }}
          title={ebayPublishItem.product}
          price={Number(ebayPublishItem.price) || 25}
          currency={(ebayPublishItem as any).currency}
          description={ebayPublishItem.description || ""}
          imageUrls={ebayPublishItem.image_url ? [ebayPublishItem.image_url] : []}
        />
      )}
      <DashboardSupportDesk />
    </main>
  );
}
