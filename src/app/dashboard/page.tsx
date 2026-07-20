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
    .eq("user_id", user.id);

  if (!data) return;
setRecentListings(
  [...data]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
);
    let inventory = 0;
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
profit += price - cost;
      

      if (item.status === "Sold") {
        sold++;
      }
    });

    setStats({
      listings: data.length,
      inventory,
      profit,
      sold,
    });
  }

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
            📈 Analytics
          </h2>

          <p className="mt-3 text-gray-500">
            Charts and insights coming soon.
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
            </tr>

          </thead>

          <tbody>
  {recentListings.map((item) => (
    <tr key={item.id} className="border-t">
      <td className="p-4">{item.product}</td>

      <td className="p-4">
        {item.price}
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
    </tr>
  ))}
</tbody>

        </table>

      </div>

    </div>
  );
}