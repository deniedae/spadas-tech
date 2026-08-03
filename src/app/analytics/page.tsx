"use client";

import TopProfitableItems from "@/components/top-profitable-items";
import RevenueChart from "@/components/revenue-chart";
import PlatformBreakdownCard from "@/components/platform-breakdown-card";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  fmtMoney,
  calcInventoryValue,
  calcDetailedProfit,
  calcItemFees,
} from "@/app/lib/listings";
import { AlertCircle, X, TrendingUp, DollarSign, PieChart, ShieldCheck, Tag } from "lucide-react";

type DataPoint = {
  month: string;
  revenue: number;
  profit: number;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawListings, setRawListings] = useState<any[]>([]);

  const [stats, setStats] = useState({
    grossRevenue: 0,
    netProfit: 0,
    totalCogs: 0,
    totalFees: 0,
    avgMarginPct: 0,
    avgRoiPct: 0,
    inventory: 0,
    soldCount: 0,
  });

  const [chartData, setChartData] = useState<DataPoint[]>([]);

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

        setRawListings(data);

        const soldItems = data.filter(
          (item) => (item.status ?? "").toLowerCase() === "sold"
        );

        let grossRevenue = 0;
        let netProfit = 0;
        let totalCogs = 0;
        let totalFees = 0;

        soldItems.forEach((item) => {
          const detail = calcDetailedProfit(item);
          grossRevenue += detail.soldPrice;
          netProfit += detail.netProfit;
          totalCogs += detail.cogs;
          totalFees += detail.platformFee;
        });

        const avgMarginPct =
          grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;
        const avgRoiPct =
          totalCogs > 0 ? Math.round((netProfit / totalCogs) * 1000) / 10 : 0;

        const inventory = calcInventoryValue(data);
        const soldCount = soldItems.length;

        const monthlyRevenue: Record<string, number> = {};
        const monthlyProfit: Record<string, number> = {};

        soldItems.forEach((item) => {
          if (!item.sold_at) return;

          const month = new Date(item.sold_at).toLocaleString("default", {
            month: "short",
          });

          const detail = calcDetailedProfit(item);

          monthlyRevenue[month] =
            (monthlyRevenue[month] || 0) + detail.soldPrice;
          monthlyProfit[month] =
            (monthlyProfit[month] || 0) + detail.netProfit;
        });

        if (cancelled) return;

        setChartData(
          Object.entries(monthlyRevenue).map(([month, rev]) => ({
            month,
            revenue: rev,
            profit: monthlyProfit[month] || 0,
          }))
        );

        setStats({
          grossRevenue,
          netProfit,
          totalCogs,
          totalFees,
          avgMarginPct,
          avgRoiPct,
          inventory,
          soldCount,
        });
      } catch (err) {
        if (!cancelled) {
          setError("Couldn't load analytics. Please try refreshing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Financial Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real net profit tracking accounting for COGS, shipping, & marketplace platform fees (eBay 13.25%, Poshmark 20%, Mercari 10%, FB 5%).
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="rounded p-1 text-destructive hover:bg-destructive/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </div>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <h2 className="text-3xl font-bold tabular-nums text-foreground">
              {fmtMoney(stats.grossRevenue)}
            </h2>
          )}
          <p className="text-xs text-muted-foreground">Total sales volume</p>
        </div>

        {/* Net Profit */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Net Profit</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <h2 className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmtMoney(stats.netProfit)}
            </h2>
          )}
          <p className="text-xs text-muted-foreground">After COGS, fees, & shipping</p>
        </div>

        {/* Average Margin % */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Margin %</span>
            <PieChart className="h-4 w-4 text-purple-500" />
          </div>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <h2 className="text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
              {stats.avgMarginPct}%
            </h2>
          )}
          <p className="text-xs text-muted-foreground">Net profit vs total revenue</p>
        </div>

        {/* ROI % Per Item */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg ROI %</span>
            <Tag className="h-4 w-4 text-cyan-500" />
          </div>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <h2 className="text-3xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
              {stats.avgRoiPct}%
            </h2>
          )}
          <p className="text-xs text-muted-foreground">Return on capital invested (COGS)</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Total Platform Fees Paid</p>
          <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
            −{fmtMoney(stats.totalFees)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Cost of Goods Sold (COGS)</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {fmtMoney(stats.totalCogs)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Unsold Inventory Value</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {fmtMoney(stats.inventory)}
          </p>
        </div>
      </div>

      {/* Platform Fee Breakdown */}
      {!loading && <PlatformBreakdownCard items={rawListings} />}

      {/* Revenue chart */}
      {!loading && chartData.length > 0 && <RevenueChart data={chartData} />}

      {!loading && chartData.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          No sold listings yet — revenue, fee deductions, and profit charts will populate automatically once you mark an item as sold.
        </div>
      )}

      {/* Top profitable items */}
      {!loading && <TopProfitableItems />}
    </div>
  );
}
