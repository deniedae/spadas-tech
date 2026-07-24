"use client";

import TopProfitableItems from "@/components/top-profitable-items";
import RevenueChart from "@/components/revenue-chart";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { fmtMoney, calcInventoryValue, calcProfit } from "@/app/lib/listings";
import { AlertCircle, X } from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    inventory: 0,
    sold: 0,
  });

  const [chartData, setChartData] = useState<
    { month: string; revenue: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
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
          .eq("user_id", user.id);

        if (error) throw error;
        if (cancelled) return;
        if (!data) return;

        // Only SOLD items contribute to revenue and profit.
        const soldItems = data.filter((item) => item.status === "Sold");

        const revenue = soldItems.reduce(
          (sum, item) => sum + (Number(item.sold_price) || 0),
          0
        );

        // FIX: profit only from sold items — was summing ALL listings,
        // making unsold inventory show as negative profit.
        const profit = soldItems.reduce(
          (sum, item) => sum + calcProfit(item),
          0
        );

        // Shared helper — same definition as Dashboard and ListingsPage.
        const inventory = calcInventoryValue(data);

        const sold = soldItems.length;

        const monthlyRevenue: Record<string, number> = {};

        soldItems.forEach((item) => {
          if (!item.sold_at) return;

          const month = new Date(item.sold_at).toLocaleString("default", {
            month: "short",
          });

          monthlyRevenue[month] =
            (monthlyRevenue[month] || 0) + (Number(item.sold_price) || 0);
        });

        if (cancelled) return;

        setChartData(
          Object.entries(monthlyRevenue).map(([month, rev]) => ({
            month,
            revenue: rev,
          }))
        );

        setStats({ revenue, profit, inventory, sold });
      } catch (err) {
        if (!cancelled) {
          setError("Couldn't load analytics. Please try refreshing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your business performance.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
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

      {/* Stat cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Revenue</p>
          {loading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-gray-200" />
          ) : (
            <h2 className="mt-2 text-3xl font-bold tabular-nums">
              {fmtMoney(stats.revenue)}
            </h2>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Profit</p>
          {loading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-gray-200" />
          ) : (
            <h2 className="mt-2 text-3xl font-bold tabular-nums text-green-600">
              {fmtMoney(stats.profit)}
            </h2>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Inventory Value</p>
          {loading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-gray-200" />
          ) : (
            <h2 className="mt-2 text-3xl font-bold tabular-nums">
              {fmtMoney(stats.inventory)}
            </h2>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Items Sold</p>
          {loading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-gray-200" />
          ) : (
            <h2 className="mt-2 text-3xl font-bold tabular-nums">
              {stats.sold}
            </h2>
          )}
        </div>
      </div>

      {/* Revenue chart — now actually rendered */}
      {!loading && chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Revenue by Month</h2>
          <RevenueChart data={chartData} />
        </div>
      )}

      {/* Top profitable items — moved out of the stat grid */}
      {!loading && <TopProfitableItems />}
    </div>
  );
}
