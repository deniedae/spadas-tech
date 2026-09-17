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
      <main className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-zinc-100">
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
    <main className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-zinc-100 pb-32 sm:pb-36 pb-[calc(env(safe-area-inset-bottom,0px)+8rem)]">
      {/* Executive Portfolio Header */}
      <div className="p-5 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Active Portfolio & Listings
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-900/50 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
            onClick={() => openSpadasSupport({ mode: "chat" })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs transition cursor-pointer active:scale-95"
            title="Launch AI Resale Copilot & Support Desk"
          >
            <Headphones className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Support Desk</span>
          </button>

          <button
            type="button"
            onClick={loadListings}
            className="h-9 w-9 flex items-center justify-center rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
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
          className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-mono text-rose-300"
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded">
          {/* Segmented Mechanical Status Tabs with Inset Pressed State */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 select-none">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "ALL"
                  ? "bg-white text-zinc-950"
                  : "text-zinc-400 hover:text-white bg-zinc-800"
              }`}
            >
              <span>All [{totalListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("FAST_FLIPS")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "FAST_FLIPS"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-zinc-400 hover:text-emerald-400 bg-zinc-800"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>High Velocity [{fastFlipsCount}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("TRAPS")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "TRAPS"
                  ? "bg-rose-500 text-white"
                  : "text-zinc-400 hover:text-rose-400 bg-zinc-800"
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Low Turnover [{trapsCount}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "Active"
                  ? "bg-sky-500 text-slate-950"
                  : "text-zinc-400 hover:text-sky-400 bg-zinc-800"
              }`}
            >
              <span>Active [{activeListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Draft")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "Draft"
                  ? "bg-amber-400 text-slate-950"
                  : "text-zinc-400 hover:text-amber-300 bg-zinc-800"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Drafts [{draftListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Sold")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "Sold"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-zinc-400 hover:text-emerald-400 bg-zinc-800"
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
                className="h-8 w-full rounded bg-zinc-800 border border-zinc-700 pl-8 pr-7 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded bg-zinc-800 border border-zinc-700 px-2.5 text-xs font-semibold text-zinc-300 focus:border-cyan-500 focus:outline-none cursor-pointer"
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
        <div className="flex flex-col items-center justify-center rounded border border-zinc-800 bg-zinc-900 p-10 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
            <PackageOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              {search ? "No matching listings found" : "No items in this filter"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {search
                ? `No items found matching "${search}". Adjust search query.`
                : "Point your camera at junkyard or thrift inventory using Lens AR to populate your catalog."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/lens"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-semibold inline-block"
            >
              <span>+ SCAN SPECIMEN</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: High-Density Card List with Direct eBay Publish Action Bars */}
          <div className="block sm:hidden divide-y divide-zinc-800 border border-zinc-800 rounded bg-zinc-900 overflow-hidden">
            {filteredListings.map((item) => {
              const isFastFlip = item.velocity.sellThroughRate > 90;
              const isTrap =
                item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk;

              return (
                <div key={item.id} className="p-3 hover:bg-[#12151E] transition-colors space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded object-cover border border-zinc-800 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded bg-zinc-800 border border-zinc-700 text-zinc-500 shrink-0 mt-0.5">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-100 text-xs truncate">
                        {item.product}
                      </p>
                      <span className="text-[10px] text-zinc-500">
                        ID: {String(item.id || "").slice(0, 8)}
                      </span>

                      {/* Price & Profit Row */}
                      <div className="flex items-center justify-between mt-1 text-[11px] font-semibold">
                        <div className="text-zinc-400">
                          <span className="text-zinc-500">Cost:</span> {fmtMoney(item.calculatedCost)}
                          <span className="text-zinc-600 mx-1">→</span>
                          <span className="text-zinc-200">{fmtMoney(item.calculatedPrice)}</span>
                        </div>
                        <div
                          className={`${
                            item.calculatedProfit > 0
                              ? "text-emerald-500"
                              : item.calculatedProfit < 0
                              ? "text-rose-500"
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
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${
                          isFastFlip
                            ? "bg-emerald-900/30 text-emerald-400 border-emerald-900/50"
                            : isTrap
                            ? "bg-rose-900/30 text-rose-400 border-rose-900/50"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {isFastFlip && "⚡"}
                        {isTrap && "🛑"}
                        {item.velocity.sellThroughRate}% STR
                      </span>
                      <span className="text-zinc-500">
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
                        className={`text-[10px] font-semibold rounded px-1.5 py-1 border cursor-pointer transition focus:outline-none ${
                          item.status === "Sold"
                            ? "bg-emerald-900/20 text-emerald-500 border-emerald-900/40"
                            : item.status === "Draft"
                            ? "bg-amber-900/20 text-amber-500 border-amber-900/40"
                            : "bg-sky-900/20 text-sky-500 border-sky-900/40"
                        }`}
                      >
                        <option value="Draft" className="bg-zinc-900 text-amber-500">
                          Draft
                        </option>
                        <option value="Active" className="bg-zinc-900 text-sky-500">
                          Active
                        </option>
                        <option value="Sold" className="bg-zinc-900 text-emerald-500">
                          Sold
                        </option>
                      </select>

                      {/* Direct eBay Publish Bar */}
                      <button
                        type="button"
                        onClick={() => setEbayPublishItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px] font-semibold transition cursor-pointer shrink-0"
                        title="Publish directly to eBay"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>EBAY PUBLISH</span>
                      </button>

                      <EditListingDialog listing={item} onUpdated={loadListings} />
                      <ExportListingDialog listing={item} />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <button
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition cursor-pointer"
                              title="Delete listing"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          }
                        />
                        <AlertDialogContent className="bg-[#0E1118] border-zinc-800 text-zinc-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              This action will permanently delete &ldquo;{item.product}&rdquo;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-[#161922] border-zinc-700 text-zinc-300">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteListing(item.id)}
                              className="bg-[#DC2626] hover:bg-rose-700 text-white font-bold"
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
          <div className="hidden sm:block overflow-hidden rounded-xl border border-zinc-800 bg-[#0E1118]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-400 font-semibold">
                    <th scope="col" className="py-2 px-3">
                      Product Item
                    </th>
                    <th scope="col" className="py-2 px-3 text-right">
                      List Price
                    </th>
                    <th scope="col" className="py-2 px-3 text-right">
                      Cost Basis
                    </th>
                    <th scope="col" className="py-2 px-3 text-right">
                      Net Profit
                    </th>
                    <th scope="col" className="py-2 px-3 text-center">
                      STR% (Velocity)
                    </th>
                    <th scope="col" className="py-2 px-3 text-center">
                      Turn Days
                    </th>
                    <th scope="col" className="py-2 px-3 text-center">
                      Status & eBay Publish
                    </th>
                    <th scope="col" className="py-2 px-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800/60 text-xs">
                  {filteredListings.map((item) => {
                    const isFastFlip = item.velocity.sellThroughRate > 90;
                    const isTrap =
                      item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk;

                    return (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-[#12151E]"
                      >
                        {/* Product Info Column */}
                        <td className="py-2 px-3 font-sans">
                          <div className="flex items-center gap-2.5">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.product}
                                width={32}
                                height={32}
                                loading="lazy"
                                className="h-8 w-8 rounded object-cover border border-zinc-800 shrink-0"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-800 bg-[#161922] text-zinc-500">
                                <ImageIcon className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[200px] sm:max-w-xs md:max-w-sm">
                              <p className="font-semibold text-zinc-100 text-xs truncate group-hover:text-[#F97316] transition">
                                {item.product}
                              </p>
                              <span className="text-[10px] text-zinc-500">
                                ID: {String(item.id || "").slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* List Price (Tabular Monospace) */}
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-zinc-200">
                          {fmtMoney(item.calculatedPrice)}
                        </td>

                        {/* Cost Basis (Tabular Monospace) */}
                        <td className="py-2 px-3 text-right tabular-nums text-zinc-400 font-semibold">
                          {fmtMoney(item.calculatedCost)}
                        </td>

                        {/* Estimated Profit (Tabular Monospace) */}
                        <td
                          className={`py-2 px-3 text-right tabular-nums font-semibold ${
                            item.calculatedProfit > 0
                              ? "text-emerald-500"
                              : item.calculatedProfit < 0
                              ? "text-rose-500"
                              : "text-zinc-400"
                          }`}
                        >
                          {item.calculatedProfit > 0
                            ? `+${fmtMoney(item.calculatedProfit)}`
                            : fmtMoney(item.calculatedProfit)}
                        </td>

                        {/* Step 2: STR% Velocity (Strictly Color-Coded) */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border tabular-nums ${
                              isFastFlip
                                ? "bg-emerald-900/30 text-emerald-400 border-emerald-900/50"
                                : isTrap
                                ? "bg-rose-900/30 text-rose-400 border-rose-900/50"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}
                          >
                            {isFastFlip && "⚡ "}
                            {isTrap && "🛑 "}
                            {item.velocity.sellThroughRate}% STR
                          </span>
                        </td>

                        {/* Turn Days (Tabular Monospace) */}
                        <td className="py-2 px-3 text-center text-[11px] tabular-nums font-semibold text-zinc-400">
                          {item.velocity.estDaysToSell}
                        </td>

                        {/* Status Badge + Direct Accessible eBay Publish Action Button */}
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                updateListingStatus(item.id, e.target.value as any)
                              }
                              className={`text-[10px] font-semibold rounded px-1.5 py-0.5 border cursor-pointer transition focus:outline-none ${
                                item.status === "Sold"
                                  ? "bg-emerald-900/20 text-emerald-500 border-emerald-900/40"
                                  : item.status === "Draft"
                                  ? "bg-amber-900/20 text-amber-500 border-amber-900/40"
                                  : "bg-sky-900/20 text-sky-500 border-sky-900/40"
                              }`}
                            >
                              <option value="Draft" className="bg-zinc-900 text-amber-500">
                                Draft
                              </option>
                              <option value="Active" className="bg-zinc-900 text-sky-500">
                                Active
                              </option>
                              <option value="Sold" className="bg-zinc-900 text-emerald-500">
                                Sold
                              </option>
                            </select>

                            {/* Direct eBay Publish Action Button */}
                            <button
                              type="button"
                              onClick={() => setEbayPublishItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px] font-semibold transition cursor-pointer shrink-0"
                              title="Publish directly to eBay"
                            >
                              <ShoppingBag className="w-2.5 h-2.5" />
                              <span>EBAY</span>
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditListingDialog listing={item} onUpdated={loadListings} />
                            <ExportListingDialog listing={item} />

                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <button
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition cursor-pointer"
                                    title="Delete listing"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                }
                              />
                              <AlertDialogContent className="bg-[#0E1118] border-zinc-800 text-zinc-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-zinc-400">
                                    This action will permanently delete &ldquo;{item.product}&rdquo;.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-[#161922] border-zinc-700 text-zinc-300">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteListing(item.id)}
                                    className="bg-[#DC2626] hover:bg-rose-700 text-white font-bold"
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
