"use client";

import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import { fmtMoney, calcProfit, calcInventoryValue } from "@/app/lib/listings";

// --- Types (was: any[]) ---------------------------------------------------
interface Listing {
  id: string;
  product: string;
  price: number | string | null;
  purchase_price: number | string | null;
  sold_price: number | string | null;
  shipping_cost: number | string | null;
  fees: number | string | null;
  status: string;
  image_url: string | null;
  created_at: string;
}

interface DashboardStats {
  listings: number;
  inventory: number;
  revenue: number;
  profit: number;
  sold: number;
}

const INITIAL_STATS: DashboardStats = {
  listings: 0,
  inventory: 0,
  revenue: 0,
  profit: 0,
  sold: 0,
};

// --- Stat card extracted (was: copy-pasted 4×) ----------------------------
function StatCard({
  label,
  value,
  valueClassName = "",
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-gray-500">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
      </div>
      {loading ? (
        <div className="mt-2 h-9 w-28 animate-pulse rounded bg-gray-200" />
      ) : (
        <h2 className={`text-4xl font-bold mt-2 tabular-nums ${valueClassName}`}>
          {value}
        </h2>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
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
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (cancelled) return;
        if (!data) return;

        setRecentListings(data.slice(0, 5));

        let revenue = 0;
        let profit = 0;
        let sold = 0;

        data.forEach((item) => {
          if (item.status === "Sold") {
            sold++;
            revenue += Number(item.sold_price) || 0;
            profit += calcProfit(item);
          }
        });

        // inventory = sum of selling prices for unsold listings (shared helper)
        const inventory = calcInventoryValue(data);

        if (cancelled) return;
        setStats({ listings: data.length, inventory, revenue, profit, sold });
      } catch (err) {
        if (!cancelled) {
          setError("Couldn't load your dashboard. Please try refreshing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      {/* Hero */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back 👋</h1>
            <p className="mt-2 max-w-xl text-blue-100">
              Manage your inventory, generate AI listings, and track your profits from one dashboard.
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white/10 p-6 backdrop-blur md:block">
            <div className="text-sm text-blue-100">Version</div>
            <div className="text-2xl font-bold">Beta v0.9</div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard label="Listings" value={String(stats.listings)} icon={Package} loading={loading} />
          <StatCard label="Inventory Value" value={fmtMoney(stats.inventory)} icon={DollarSign} loading={loading} />
          <StatCard
            label="Profit"
            value={fmtMoney(stats.profit)}
            valueClassName="text-green-600"
            icon={TrendingUp}
            loading={loading}
          />
          <StatCard label="Items Sold" value={String(stats.sold)} icon={ShoppingCart} loading={loading} />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link
            href="/generator"
            className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02]"
          >
            <h2 className="text-2xl font-bold">🤖 Generate Listing</h2>
            <p className="mt-3 text-blue-100">Create AI listings in seconds.</p>
          </Link>

          <Link
            href="/listings"
            className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 hover:shadow-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <h2 className="text-2xl font-bold text-gray-900">📦 My Listings</h2>
            <p className="mt-3 text-gray-500">View and manage your listings.</p>
          </Link>

          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <h2 className="text-2xl font-bold">💰 Revenue</h2>
            {loading ? (
              <div className="mt-4 h-12 w-40 animate-pulse rounded bg-gray-200" />
            ) : (
              <h3 className="text-5xl font-bold text-blue-600 mt-4 tabular-nums">
                {fmtMoney(stats.revenue)}
              </h3>
            )}
            <p className="mt-3 text-gray-500">Total value of your listings.</p>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Listings</h2>
            {recentListings.length > 0 && (
              <Link
                href="/listings"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all →
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left border-b border-gray-200">
                <tr>
                  <th scope="col" className="pb-4">Product</th>
                  <th scope="col" className="pb-4">Price</th>
                  <th scope="col" className="pb-4">Status</th>
                  <th scope="col" className="pb-4">Added</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeleton rows */}
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-200 animate-pulse" />
                          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                      </td>
                    </tr>
                  ))}

                {/* Empty state */}
                {!loading && recentListings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <Package className="h-10 w-10 text-gray-300" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium text-gray-900">No listings yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Generate your first AI listing to get started.
                        </p>
                        <Link
                          href="/generator"
                          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                          Generate listing
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {!loading &&
                  recentListings.map((item) => {
                    const isSold = item.status === "Sold";
                    return (
                      <tr key={item.id} className="border-t transition-colors hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url || "/placeholder.png"}
                              alt={item.product}
                              width={48}
                              height={48}
                              loading="lazy"
                              className="h-12 w-12 rounded-lg border object-cover"
                            />
                            <span className="font-medium text-gray-900">{item.product}</span>
                          </div>
                        </td>
                        <td className="p-4 tabular-nums text-gray-700">
                          {fmtMoney(Number(item.price) || 0)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isSold
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">
                          {new Date(item.created_at).toLocaleDateString("en-AU")}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
