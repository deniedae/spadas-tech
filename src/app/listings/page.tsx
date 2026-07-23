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
import ExportListingDialog from "../../components/export-listing-dialog";
import DashboardCards from "@/components/dashboard-cards";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import EditListingDialog from "@/components/edit-listing-dialog";
import Link from "next/link";
import BarcodeScanner from "@/components/barcode-scanner";
import { toast } from "sonner";
import NewListingDialog from "@/components/new-listing-dialog";

export default function ListingsPage() {
  
  const [listings, setListings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const totalListings = listings.length;
  const [loading, setLoading] = useState(true);
const handleCreateListing = (product: any) => {
  console.log("Scanned product:", product);

  // We'll replace this with opening the New Listing dialog
  // and pre-filling the form.
};
const soldListings = listings.filter(
  (item) => item.status === "Sold"
).length;

const totalProfit = listings.reduce((total, item) => {
  const price = Number(item.price) || 0;
  const purchasePrice = Number(item.purchase_price) || 0;
  const soldPrice = Number(item.sold_price) || price;
  const shipping = Number(item.shipping_cost) || 0;
  const fees = Number(item.fees) || 0;

  return total + (soldPrice - purchasePrice - shipping - fees);
}, 0);

const inventoryValue = listings.reduce(
  (total, item) => total + Number(item.price),
  0
);

  useEffect(() => {
    loadListings();
  }, []);

 async function loadListings() {
  setLoading(true);

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    toast.error("Failed to load listings.");
    setLoading(false);
    return;
  }

  setListings(data || []);
  setLoading(false);
}
  async function editListing(item: any) {
    const product = window.prompt("Product", item.product);
    if (product === null) return;

    const price = window.prompt("Price", String(item.price));
    if (price === null) return;

    const cost = window.prompt("Cost", String(item.cost));
    if (cost === null) return;

    const status = window.prompt(
      "Status (Active or Sold)",
      item.status
    );
    if (status === null) return;

    const { error } = await supabase
      .from("listings")
      .update({
        product,
        price: Number(price),
        cost: Number(cost),
        status,
      })
      .eq("id", item.id);

    if (error) {
   toast.error(error.message);
      return;
    }

    loadListings();
  }

  async function deleteListing(id: number) {
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);

    if (error) {
    toast.error(error.message);
      return;
    }
toast.success("Listing deleted!");
    loadListings();
  }
if (loading) {
  return (
    <main className="space-y-8">
      <h1 className="text-4xl font-bold">📦 My Listings</h1>

      <div className="animate-pulse space-y-4">
        <div className="h-12 rounded-xl bg-gray-200"></div>

        <div className="h-24 rounded-xl bg-gray-200"></div>

        <div className="h-96 rounded-xl bg-gray-200"></div>
      </div>
    </main>
  );
}
  return (
    
    <main className="space-y-8">
    <div className="flex items-center justify-between">
  <div>
    <h1 className="text-4xl font-bold">
      📦 My Listings
    </h1>

    <p className="mt-2 text-gray-500">
      Manage your inventory, profits and sales.
    </p>
  </div>

  <NewListingDialog />
</div>
   
<BarcodeScanner
  onCreateListing={handleCreateListing}
/>
<DashboardCards
  totalListings={totalListings}
  soldListings={soldListings}
  totalProfit={totalProfit}
  inventoryValue={inventoryValue}
/>

 
<input
  type="text"
  placeholder="🔍 Search listings..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="w-full rounded-xl border border-gray-300 p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Cost</th>
              <th className="p-4 text-left">Profit</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {listings
  .filter((item) =>
    item.product.toLowerCase().includes(search.toLowerCase())
  )
  .map((item) => {
              const price = Number(item.price) || 0;
              const cost = Number(item.cost) || 0;
              const purchasePrice = Number(item.purchase_price) || 0;
const soldPrice = Number(item.sold_price) || price;
const shipping = Number(item.shipping_cost) || 0;
const fees = Number(item.fees) || 0;

const profit =
  soldPrice -
  purchasePrice -
  shipping -
  fees;

              return (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
  <div className="flex items-center gap-3">
    {item.image_url ? (
      <img
        src={item.image_url}
        alt={item.product}
        className="h-16 w-16 rounded-lg border object-cover"
      />
    ) : (
      <div className="h-16 w-16 rounded-lg border bg-gray-100 flex items-center justify-center text-xs text-gray-400">
        No Image
      </div>
    )}

    <div>
      <p className="font-semibold">{item.product}</p>
    </div>
  </div>
</td>

                  <td className="p-4">
                    ${price.toFixed(2)}
                  </td>

                  <td className="p-4">
                    ${cost.toFixed(2)}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      profit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    ${profit.toFixed(2)}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        item.status === "Sold"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="p-4 space-x-2">
                  <EditListingDialog
  listing={item}
  onUpdated={loadListings}
/>

<ExportListingDialog
  listing={item}
/>
<AlertDialog>
  <AlertDialogTrigger
    render={
      <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
        🗑 Delete
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
                  </td>
                </tr>
              );
            })}

       {listings.length === 0 && (
  <tr>
    <td colSpan={6} className="p-16">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 text-6xl">📦</div>

        <h2 className="text-2xl font-bold text-gray-900">
          Welcome to Spadas AI
        </h2>

        <p className="mt-2 max-w-md text-gray-500">
          You don't have any listings yet.
          Create your first listing or scan a barcode to get started.
        </p>
<NewListingDialog />
      </div>
    </td>
  </tr>
)}
          </tbody>
        </table>
      </div>
    </main>
  );
}