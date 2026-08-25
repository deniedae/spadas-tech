"use client";

import { useEffect, useState } from "react";
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
  Sparkles,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Plus,
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

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Draft" | "Active" | "Sold">("ALL");
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

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (error) {
        throw error;
      }

      setListings((data as Listing[]) || []);
      setError(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load listings.");
      setError("Couldn't load your listings. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  async function updateListingStatus(id: string, newStatus: "Draft" | "Active" | "Sold") {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("listings")
        .update({
          status: newStatus,
          sold_at: newStatus === "Sold" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setListings((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus,
                sold_at: newStatus === "Sold" ? new Date().toISOString() : null,
              }
            : item
        )
      );

      toast.success(`Status updated to ${newStatus}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    }
  }

  async function deleteListing(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Listing deleted!");
    loadListings();
  }

  // Filtered & Sorted Listings
  const filteredListings = listings
    .filter((item) => {
      const matchesSearch = (item.product || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "profit_high") return calcProfit(b) - calcProfit(a);
      if (sortBy === "price_high") return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === "price_low") return (Number(a.price) || 0) - (Number(b.price) || 0);
      return 0; // default newest from db
    });

  // Metrics
  const totalListings = listings.length;
  const draftListings = listings.filter((item) => item.status === "Draft").length;
  const activeListings = listings.filter((item) => item.status === "Active").length;
  const soldListings = listings.filter((item) => item.status === "Sold").length;
  const totalProfit = listings.reduce((total, item) => total + calcProfit(item), 0);
  const inventoryValue = calcInventoryValue(listings);

  if (loading) {
    return (
      <main className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 rounded-xl bg-slate-800 animate-pulse" />
            <div className="h-4 w-72 rounded bg-slate-800/80 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-slate-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm animate-pulse"
            />
          ))}
        </div>
        <div className="h-12 w-full rounded-2xl bg-slate-900 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-slate-900/80 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100 pb-28">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Inventory & Listings Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time thrift catalog, profit margins, and 1-click multi-marketplace publishing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadListings}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh Listings"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <Link
            href="/lens"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <Camera className="h-4 w-4 text-slate-950" />
            <span>⚡ Scan with Lens</span>
          </Link>

          <NewListingDialog />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="rounded p-1 text-rose-400 hover:bg-rose-500/20"
          >
            <X className="h-4 w-4" />
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

      {/* Control Bar: Status Filter Tabs, Search & Sort */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-xl">
          {/* Segmented Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "ALL"
                  ? "bg-slate-100 text-slate-950 shadow-md"
                  : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80"
              }`}
            >
              All Items ({totalListings})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Draft")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === "Draft"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-950/60 text-amber-400 hover:text-amber-300 border border-amber-500/20"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Drafts ({draftListings})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === "Active"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-950/60 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Active ({activeListings})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("Sold")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === "Sold"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-950/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sold ({soldListings})</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-xs font-bold text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="newest">🕒 Newest</option>
              <option value="profit_high">💰 Highest Profit</option>
              <option value="price_high">📈 Highest Price</option>
              <option value="price_low">📉 Lowest Price</option>
            </select>
          </div>
        </div>

        {/* Barcode scanner action helper */}
        <div className="pt-1">
          <BarcodeScanner onCreateListing={loadListings} />
        </div>
      </div>

      {/* Listings View Area */}
      {filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center shadow-xl space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <PackageOpen className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {search ? "No matching listings found" : "No listings in this view"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? `No items found matching "${search}". Try adjusting your search term.`
                : "Start scanning thrift finds with Lens AR or create a new listing to build your inventory."}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/lens"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Item Now</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (< sm) */}
          <div className="space-y-3.5 sm:hidden">
            {filteredListings.map((item) => {
              const price = Number(item.price) || 0;
              const cost = Number(item.cost || item.purchase_price) || 0;
              const profit = calcProfit(item);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-3 transition hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product}
                        width={64}
                        height={64}
                        loading="lazy"
                        className="h-16 w-16 rounded-xl border border-slate-800 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3 className="font-bold text-sm text-slate-100 line-clamp-2">
                        {item.product}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateListingStatus(item.id, e.target.value as any)
                          }
                          className={`text-[10px] font-black rounded-lg px-2 py-0.5 border cursor-pointer ${
                            item.status === "Sold"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : item.status === "Draft"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          }`}
                        >
                          <option value="Draft" className="bg-slate-900 text-amber-400">
                            Draft
                          </option>
                          <option value="Active" className="bg-slate-900 text-cyan-400">
                            Active
                          </option>
                          <option value="Sold" className="bg-slate-900 text-emerald-400">
                            Sold
                          </option>
                        </select>

                        <span
                          className={`text-[10px] font-black rounded-lg px-2 py-0.5 border tabular-nums ${
                            profit >= 0
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          Net: {fmtMoney(profit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs text-slate-400">
                    <div>
                      <span>Price: </span>
                      <span className="font-black text-slate-100">{fmtMoney(price)}</span>
                      <span className="ml-2 text-slate-500">Cost: </span>
                      <span className="font-semibold text-slate-300">{fmtMoney(cost)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEbayPublishItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-extrabold text-[11px] border border-cyan-500/30 transition cursor-pointer"
                        title="Publish to eBay"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>eBay</span>
                      </button>

                      <EditListingDialog listing={item} onUpdated={loadListings} />
                      <ExportListingDialog listing={item} />

                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                        />
                        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              This action will permanently delete &ldquo;{item.product}&rdquo;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteListing(item.id)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
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

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="p-4">
                      Product Item
                    </th>
                    <th scope="col" className="p-4">
                      List Price
                    </th>
                    <th scope="col" className="p-4">
                      Cost Basis
                    </th>
                    <th scope="col" className="p-4">
                      Estimated Profit
                    </th>
                    <th scope="col" className="p-4">
                      Status
                    </th>
                    <th scope="col" className="p-4 text-right">
                      Quick Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                  {filteredListings.map((item) => {
                    const price = Number(item.price) || 0;
                    const cost = Number(item.cost || item.purchase_price) || 0;
                    const profit = calcProfit(item);

                    return (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-slate-800/40"
                      >
                        {/* Product info */}
                        <td className="p-4">
                          <div className="flex items-center gap-3.5">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.product}
                                width={52}
                                height={52}
                                loading="lazy"
                                className="h-13 w-13 rounded-xl border border-slate-800 object-cover shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                            <div className="space-y-1 min-w-0 max-w-sm">
                              <p className="font-bold text-slate-100 text-sm truncate group-hover:text-cyan-400 transition">
                                {item.product}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                                  ID: {String(item.id || "").slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* List price */}
                        <td className="p-4 tabular-nums font-bold text-slate-100 text-sm">
                          {fmtMoney(price)}
                        </td>

                        {/* Cost basis */}
                        <td className="p-4 tabular-nums text-slate-400">
                          {fmtMoney(cost)}
                        </td>

                        {/* Profit badge */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-black tabular-nums border ${
                              profit >= 0
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {fmtMoney(profit)}
                          </span>
                        </td>

                        {/* Quick Status toggle */}
                        <td className="p-4">
                          <select
                            value={item.status}
                            onChange={(e) =>
                              updateListingStatus(item.id, e.target.value as any)
                            }
                            className={`text-[11px] font-black rounded-xl px-2.5 py-1 border cursor-pointer transition focus:outline-none ${
                              item.status === "Sold"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : item.status === "Draft"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                            }`}
                          >
                            <option value="Draft" className="bg-slate-950 text-amber-400">
                              Draft
                            </option>
                            <option value="Active" className="bg-slate-950 text-cyan-400">
                              Active
                            </option>
                            <option value="Sold" className="bg-slate-950 text-emerald-400">
                              Sold
                            </option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Direct eBay Publish Button */}
                            <button
                              type="button"
                              onClick={() => setEbayPublishItem(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 text-cyan-300 font-extrabold text-xs border border-cyan-500/30 transition hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                              title="Publish directly to eBay"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                              <span>eBay</span>
                            </button>

                            <EditListingDialog listing={item} onUpdated={loadListings} />
                            <ExportListingDialog listing={item} />

                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <button
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                                    title="Delete listing"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                }
                              />
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    This action will permanently delete &ldquo;{item.product}&rdquo;.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteListing(item.id)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
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
        </>
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
          description={ebayPublishItem.description || ""}
          imageUrls={ebayPublishItem.image_url ? [ebayPublishItem.image_url] : []}
        />
      )}
    </main>
  );
}
