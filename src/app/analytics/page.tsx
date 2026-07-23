"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import RevenueChart from "@/components/revenue-chart";
import TopProfitableItems from "@/components/top-profitable-items";

export default function AnalyticsPage() {
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
    async function loadAnalytics() {
      const { data, error } = await supabase
        .from("listings")
        .select("*");

      if (error || !data) {
        console.error(error);
        return;
      }

      const revenue = data.reduce(
        (sum, item) => sum + Number(item.sold_price || 0),
        0
      );

      const inventory = data
        .filter((item) => item.status !== "Sold")
        .reduce(
          (sum, item) => sum + Number(item.purchase_price || 0),
          0
        );

      const profit = data.reduce(
        (sum, item) =>
          sum +
          (
            Number(item.sold_price || 0) -
            Number(item.purchase_price || 0) -
            Number(item.shipping_cost || 0) -
            Number(item.fees || 0)
          ),
        0
      );

      const sold = data.filter(
        (item) => item.status === "Sold"
      ).length;

      const monthlyRevenue: Record<string, number> = {};

      data.forEach((item) => {
        if (!item.sold_at || item.status !== "Sold") return;

        const month = new Date(item.sold_at).toLocaleString("default", {
          month: "short",
        });

        monthlyRevenue[month] =
          (monthlyRevenue[month] || 0) +
          Number(item.sold_price || 0);
      });

      setChartData(
        Object.entries(monthlyRevenue).map(([month, revenue]) => ({
          month,
          revenue,
        }))
      );

      setStats({
        revenue,
        profit,
        inventory,
        sold,
      });
    }

    loadAnalytics();
  }, []);

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl font-bold">📊 Analytics</h1>

      <p className="mb-8 text-gray-500">
        Track your business performance.
      </p>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-gray-500">Revenue</p>
          <h2 className="mt-1 text-4xl font-bold">
            ${stats.revenue.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-gray-500">Profit</p>
          <h2 className="mt-1 text-4xl font-bold text-green-600">
            ${stats.profit.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-gray-500">Inventory Value</p>
          <h2 className="mt-1 text-4xl font-bold">
            ${stats.inventory.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-gray-500">Items Sold</p>
          <h2 className="mt-1 text-4xl font-bold">
            {stats.sold}
          </h2>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="mt-8">
        <RevenueChart data={chartData} />
      </div>

      {/* Bottom Row */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <TopProfitableItems />
      </div>
    </div>
  );
}