"use client";

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
import ExportListingDialog from "@/components/export-listing-dialog";
import DashboardCards from "@/components/dashboard-cards";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import EditListingDialog from "@/components/edit-listing-dialog";
import Link from "next/link";
import BarcodeScanner from "@/components/barcode-scanner";
import { toast } from "sonner";
import NewListingDialog from "@/components/new-listing-dialog";
import { fmtMoney, calcProfit, calcInventoryValue } from "@/app/lib/listings";
import { Package, Search, ImageIcon, Trash2, PackageOpen, AlertCircle, X } from "lucide-react";

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalListings = listings.length;

  const handleCreateListing = (product: any) => {
    console.log("Scanned product:", product);
  };

  const soldListings = listings.filter((item) => item.status === "Sold").length;

  const totalProfit = listings.reduce(
    (total, item) => total + calcProfit(item),
    0
  );

  const inventoryValue = calcInventoryValue(listings);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);

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
      console.error(error);
      toast.error("Failed to load listings.");
      setError("Couldn't load your listings. Please try refreshing.");
      setLoading(false);
      return;
    }

    setListings(data || []);
    setError(null);
    setLoading(false);
  }

  async function deleteListing(id: number) {
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

  if (loading) {
    return (
      <main className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-72 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-gray-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white border border-gray-200 shadow-sm animate-pulse"
            />
          ))}
        </div>
        <div className="h-11 max-w-md rounded-xl bg-gray-200 animate-pulse" />
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="space-y-px">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-gray-100 p-4 last:border-0"
              >
                <div className="h-14 w-14 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                <div className="ml-auto h-4 w-16 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-8 w-24 rounded-lg bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            My Listings
          </h1>
          <p className="text-sm text-gray-500">
            Manage your inventory, profits and sales.
          </p>
        </div>
        <NewListingDialog />
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="rounded p-1 text-red-600 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dashboard cards */}
      <DashboardCards
        totalListings={totalListings}
        soldListings={soldListings}
        totalProfit={totalProfit}
        inventoryValue={inventoryValue}
      />

      {/* Barcode scanner + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BarcodeScanner onCreateListing={handleCreateListing} />
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search listings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 border-b border-gray-200 bg-gray-50/80 backdrop-blur">
              <tr>
                <th scope="col" className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th scope="col" className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Price</th>
                <th scope="col" className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cost</th>
                <th scope="col" className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Profit</th>
                <th scope="col" className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th scope="col" className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {listings
                .filter((item) =>
                  item.product.toLowerCase().includes(search.toLowerCase())
                )
                .map((item) => {
                  const price = Number(item.price) || 0;
                  const cost = Number(item.cost) || 0;
                  const profit = calcProfit(item);

                  return (
                    <tr key={item.id} className="group transition-colors hover:bg-gray-50/70">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product}
                              loading="lazy"
                              className="h-14 w-14 rounded-lg border border-gray-200 object-cover shadow-sm"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <p className="font-semibold text-gray-900">{item.product}</p>
                        </div>
                      </td>

                      <td className="p-4 tabular-nums text-gray-700">
                        {fmtMoney(price)}
                      </td>

                      <td className="p-4 tabular-nums text-gray-700">
                        {fmtMoney(cost)}
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${
                          profit >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {fmtMoney(profit)}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.status === "Sold"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <EditListingDialog listing={item} onUpdated={loadListings} />
                          <ExportListingDialog listing={item} />
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this listing.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteListing(item.id)}>
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

              {/* Empty state */}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <PackageOpen className="h-8 w-8" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Welcome to Spadas AI
                      </h2>
                      <p className="mt-1 max-w-sm text-sm text-gray-500">
                        You don't have any listings yet. Create your first listing or scan a barcode to get started.
                      </p>
                      <div className="mt-6">
                        <NewListingDialog />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
