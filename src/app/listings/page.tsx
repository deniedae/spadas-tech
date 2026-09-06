"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import EditListingDialog from "@/components/edit-listing-dialog";
import ExportListingDialog from "@/components/export-listing-dialog";
import BarcodeScanner from "@/components/barcode-scanner";
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
} from "lucide-react";
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
import AiOfferNegotiator from "@/components/ai-offer-negotiator";

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
    <main className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-zinc-100 pb-28">
      {/* Page Header - Hardware Specimen Control */}
      <div className="specimen-card p-4 sm:p-5 border border-zinc-800 bg-[#0E1118] rounded-xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F97316]" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              Inventory & Catalog Operations
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            High-density telemetry grid with STR% turnover velocity and 1-tap marketplace dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadListings}
            className="btn-secondary h-9 w-9 p-0 text-zinc-300"
            title="Refresh Listings"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <Link
            href="/lens"
            className="btn-primary h-9 px-3.5 text-xs gap-1.5"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>LAUNCH LENS AR</span>
          </Link>

          <NewListingDialog />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs font-mono text-[#DC2626]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded p-1 text-[#DC2626] hover:bg-[#DC2626]/20"
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

      {/* AI Automated Offer Negotiator Copilot */}
      <AiOfferNegotiator />

      {/* Control Bar: Tactile Mechanical Filters, Search & Sort */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#0E1118] border border-zinc-800 p-2.5 rounded-xl">
          {/* Step 3: Segmented Mechanical Status Tabs with Inset Pressed State */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 select-none">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "ALL"
                  ? "bg-[#161922] text-[#F97316] font-black border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
              }`}
            >
              <span>[All Units: {totalListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("FAST_FLIPS")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "FAST_FLIPS"
                  ? "bg-[#161922] text-[#22C55E] font-black border border-[#22C55E]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "text-zinc-400 hover:text-[#22C55E] border border-transparent font-medium"
              }`}
            >
              <Zap className="w-3 h-3 text-[#22C55E]" />
              <span>[⚡ Fast Flips: {fastFlipsCount}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("TRAPS")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "TRAPS"
                  ? "bg-[#161922] text-[#DC2626] font-black border border-[#DC2626]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "text-zinc-400 hover:text-[#DC2626] border border-transparent font-medium"
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-[#DC2626]" />
              <span>[🛑 Traps: {trapsCount}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "Active"
                  ? "bg-[#161922] text-sky-400 font-black border border-sky-500/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
              }`}
            >
              <span>[Active: {activeListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Draft")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "Draft"
                  ? "bg-[#161922] text-amber-400 font-black border border-amber-500/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>[Drafts: {draftListings}]</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Sold")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === "Sold"
                  ? "bg-[#161922] text-[#22C55E] font-black border border-[#22C55E]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
              <span>[Sold: {soldListings}]</span>
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
                className="h-8 w-full rounded bg-[#090A0F] border border-zinc-800 pl-8 pr-7 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-[#F97316] focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded bg-[#090A0F] border border-zinc-800 px-2 text-xs font-mono font-bold text-zinc-300 focus:border-[#F97316] focus:outline-none cursor-pointer"
            >
              <option value="newest">🕒 Newest</option>
              <option value="profit_high">💰 Top Profit</option>
              <option value="price_high">📈 Top Price</option>
              <option value="price_low">📉 Low Price</option>
            </select>
          </div>
        </div>

        {/* Barcode scanner action helper */}
        <div className="pt-0.5">
          <BarcodeScanner onCreateListing={loadListings} />
        </div>
      </div>

      {/* High-Density Data Grid View */}
      {filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-[#0E1118] p-10 text-center space-y-3 font-mono">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#161922] border border-zinc-800 text-zinc-400">
            <PackageOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase">
              {search ? "No matching specimens found" : "No items in this filter"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto font-sans">
              {search
                ? `No items found matching "${search}". Adjust search query.`
                : "Point your camera at junkyard or thrift inventory using Lens AR to populate your catalog."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/lens"
              className="btn-primary h-8 px-4 text-xs font-mono"
            >
              <span>+ SCAN SPECIMEN</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0E1118]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#090A0F] font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
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
                    Status
                  </th>
                  <th scope="col" className="py-2 px-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
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
                            <p className="font-bold text-zinc-100 text-xs truncate group-hover:text-[#F97316] transition">
                              {item.product}
                            </p>
                            <span className="font-mono text-[9px] text-zinc-500">
                              ID: {String(item.id || "").slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* List Price (Tabular Monospace) */}
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-zinc-200 data-readout">
                        {fmtMoney(item.calculatedPrice)}
                      </td>

                      {/* Cost Basis (Tabular Monospace) */}
                      <td className="py-2 px-3 text-right tabular-nums text-zinc-400 font-semibold data-readout">
                        {fmtMoney(item.calculatedCost)}
                      </td>

                      {/* Estimated Profit (Tabular Monospace) */}
                      <td
                        className={`py-2 px-3 text-right tabular-nums font-black data-readout ${
                          item.calculatedProfit > 0
                            ? "text-[#22C55E]"
                            : item.calculatedProfit < 0
                            ? "text-[#DC2626]"
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
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border tabular-nums data-readout ${
                            isFastFlip
                              ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30"
                              : isTrap
                              ? "bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30"
                              : "bg-zinc-900/80 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          {isFastFlip && "⚡ "}
                          {isTrap && "🛑 "}
                          {item.velocity.sellThroughRate}% STR
                        </span>
                      </td>

                      {/* Turn Days (Tabular Monospace) */}
                      <td className="py-2 px-3 text-center text-[11px] tabular-nums font-semibold text-zinc-400 data-readout">
                        {item.velocity.estDaysToSell}
                      </td>

                      {/* Quick Status toggle */}
                      <td className="py-2 px-3 text-center">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateListingStatus(item.id, e.target.value as any)
                          }
                          className={`text-[10px] font-mono font-bold rounded px-1.5 py-0.5 border cursor-pointer transition focus:outline-none ${
                            item.status === "Sold"
                              ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30"
                              : item.status === "Draft"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                          }`}
                        >
                          <option value="Draft" className="bg-[#090A0F] text-amber-400">
                            Draft
                          </option>
                          <option value="Active" className="bg-[#090A0F] text-sky-400">
                            Active
                          </option>
                          <option value="Sold" className="bg-[#090A0F] text-[#22C55E]">
                            Sold
                          </option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 font-mono">
                          {/* Direct eBay Publish Button */}
                          <button
                            type="button"
                            onClick={() => setEbayPublishItem(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#12151E] hover:bg-[#181C28] text-zinc-200 text-[10px] font-bold border border-zinc-700 transition cursor-pointer"
                            title="Publish directly to eBay"
                          >
                            <ShoppingBag className="w-2.5 h-2.5 text-[#F97316]" />
                            <span>EBAY</span>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    </main>
  );
}
