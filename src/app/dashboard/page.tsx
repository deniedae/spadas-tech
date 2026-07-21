"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import NewListingDialog from "@/components/new-listing-dialog";
export default function Dashboard() {
  const router = useRouter();
 const [stats, setStats] = useState({
  listings: 0,
  inventory: 0,
  revenue: 0,
  profit: 0,
  sold: 0,
});
const [recentListings, setRecentListings] = useState<any[]>([]);
useEffect(() => {
 async function loadDashboard() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.push("/login");
    return;
  }

  const { data } = await supabase
  .from("listings")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

  if (!data) return;
setRecentListings(data.slice(0, 5));
    let inventory = 0;
let revenue = 0;
let profit = 0;
let sold = 0;

    data.forEach((item) => {
      const matches = String(item.price).match(/\d+(?:\.\d+)?/g);

const price = matches
  ? Number(matches[matches.length - 1])
  : 0;

   const cost = Number(item.cost) || 0;

console.log({
  price: item.price,
  parsedPrice: price,
  cost,
  status: item.status,
});

inventory += price;
revenue += price;
profit += price - cost;

      if (item.status === "Sold") {
        sold++;
      }
    });

 setStats({
  listings: data.length,
  inventory,
  revenue,
  profit,
  sold,
});

  } // closes async function

  loadDashboard();
}, [router]);
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">
            👋 Welcome back
          </h1>

          <p className="text-gray-500 mt-2 text-lg">
            Here's what's happening with your business today.
          </p>
        </div>

    <NewListingDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <p className="text-gray-500">Listings</p>
<h2 className="text-4xl font-bold mt-2">{stats.listings}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <p className="text-gray-500">Inventory Value</p>
          <h2 className="text-4xl font-bold mt-2">${stats.inventory.toFixed(2)}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <p className="text-gray-500">Profit</p>
          <h2 className="text-4xl font-bold mt-2 text-green-600">${stats.profit.toFixed(2)}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <p className="text-gray-500">Items Sold</p>
          <h2 className="text-4xl font-bold mt-2">{stats.sold}</h2>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">

        <Link
          href="/generator"
          className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg hover:scale-105 transition"
        >
          <h2 className="text-2xl font-bold">
            🤖 Generate Listing
          </h2>

          <p className="mt-3 text-blue-100">
            Create AI listings in seconds.
          </p>
        </Link>

        <Link
          href="/listings"
          className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 hover:shadow-xl transition"
        >
          <h2 className="text-2xl font-bold text-gray-900">
            📦 My Listings
          </h2>

          <p className="mt-3 text-gray-500">
            View and manage your listings.
          </p>
        </Link>
<div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
  <h2 className="text-2xl font-bold">
    💰 Revenue
  </h2>

  <h3 className="text-5xl font-bold text-blue-600 mt-4">
    ${stats.revenue.toFixed(2)}
  </h3>

  <p className="mt-3 text-gray-500">
    Total value of your listings.
  </p>
</div>

      </div>

      {/* Recent Listings */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">

        <h2 className="text-2xl font-bold mb-6">
          Recent Listings
        </h2>

        <table className="w-full">

          <thead className="text-left border-b border-gray-200">

          <tr>
  <th className="pb-4">Product</th>
  <th className="pb-4">Price</th>
  <th className="pb-4">Status</th>
  <th className="pb-4">Added</th>
</tr>

          </thead>

<tbody>
  {recentListings.length === 0 ? (
    <tr>
      <td colSpan={4} className="p-8 text-center text-gray-500">
        No listings yet.
      </td>
    </tr>
  ) : (
    recentListings.map((item) => (
      <tr key={item.id} className="border-t">
       <td className="p-4">
  <div className="flex items-center gap-3">
    <img
      src={item.image_url || "/placeholder.png"}
      alt={item.product}
      className="h-12 w-12 rounded-lg border object-cover"
    />

    <span>{item.product}</span>
  </div>
</td>

       <td className="p-4">
  ${Number(item.price).toFixed(2)}
</td>

        <td className="p-4">
          <span
            className={`font-semibold ${
              item.status === "Sold"
                ? "text-green-600"
                : "text-blue-600"
            }`}
          >
            {item.status}
          </span>
        </td>

        <td className="p-4 text-gray-500">
          {new Date(item.created_at).toLocaleDateString()}
        </td>
      </tr>
    ))
  )}
</tbody>

        </table>

      </div>

    </div>
  );
}