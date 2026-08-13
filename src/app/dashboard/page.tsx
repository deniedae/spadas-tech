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
import Image from "next/image";
import NewListingDialog from "@/components/new-listing-dialog";
import { fmtMoney, calcProfit, calcInventoryValue } from "@/app/lib/listings";
import PullToRefresh from "@/components/pull-to-refresh";
import ResellerRpgMode from "@/components/reseller-rpg-mode";

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
  trend = "+12.4%",
  loading,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  loading: boolean;
}) {
  return (
    <div className="saas-card rounded-2xl p-6 relative overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-28 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="mt-3 flex items-baseline justify-between">
          <h2 className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${valueClassName}`}>
            {value}
          </h2>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-500 border border-emerald-500/20">
            {trend}
          </span>
        </div>
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
    <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
      <div className="w-full max-w-full overflow-x-hidden min-w-0 box-border">
        {/* Hero Banner — Enterprise SaaS Grade */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-10 text-white border border-slate-800 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1 text-xs font-black text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                ENTERPRISE RESELLER SUITE • LIVE MARKET ARBITRAGE
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Welcome back to Spadas <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Command Center</span> 👋
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                Real-time inventory management, automated 60FPS AR shelf scanning, and 1-click cross-platform listing engine.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/lens"
                className="btn-primary shadow-lg shadow-cyan-500/25 active:scale-95 transition"
              >
                <span>📷 Open Spadas Lens AR</span>
              </Link>
              <Link
                href="/generator"
                className="btn-secondary active:scale-95 transition"
              >
                <span>✨ Create AI Listing</span>
              </Link>
            </div>
          </div>
        </div>

        {/* KILLER FEATURE: The "Pokémon GO" of Hustling (IRL RPG Mode) - Hidden for now */}
        {/* <div className="mb-8"><ResellerRpgMode /></div> */}

      <div className="space-y-8">
        {/* Error banner */}
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
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Link
            href="/lens"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold text-white border border-white/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> LIVE 60FPS AR
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold">📷 Spadas Lens AR</h2>
            <p className="mt-2 text-xs text-cyan-100">Continuous camera scanner with profit overlays & audio chimes.</p>
          </Link>

          <Link
            href="/generator"
            className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02]"
          >
            <h2 className="text-2xl font-bold">🤖 Generate Listing</h2>
            <p className="mt-2 text-xs text-primary-foreground/80">Create AI listings in seconds.</p>
          </Link>
          <Link
            href="/sourcing"
            className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8 hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <h2 className="text-2xl font-bold">🎯 Sourcing Assistant</h2>
            <p className="mt-3 text-muted-foreground">Get a buy/pass verdict before you spend.</p>
          </Link>

          <Link
            href="/listings"
            className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8 hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <h2 className="text-2xl font-bold">📦 My Listings</h2>
            <p className="mt-3 text-muted-foreground">View and manage your listings.</p>
          </Link>

          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8">
            <h2 className="text-2xl font-bold">⚡ Quick Add</h2>
            <p className="mt-3 text-muted-foreground">Create a fresh listing in seconds.</p>
            <div className="mt-6">
              <NewListingDialog
                trigger={
                  <button className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                    + Add listing
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Listings</h2>
            {recentListings.length > 0 && (
              <Link
                href="/listings"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                View all →
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left border-b border-border">
                <tr>
                  <th scope="col" className="pb-4 text-muted-foreground">Product</th>
                  <th scope="col" className="pb-4 text-muted-foreground">Price</th>
                  <th scope="col" className="pb-4 text-muted-foreground">Status</th>
                  <th scope="col" className="pb-4 text-muted-foreground">Added</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeleton rows */}
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                      </td>
                    </tr>
                  ))}

                {/* Empty state */}
                {!loading && recentListings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <Package className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium">No listings yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Generate your first AI listing to get started.
                        </p>
                        <Link
                          href="/generator"
                          className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                      <tr key={item.id} className="border-t border-border transition-colors hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Image
                              src={item.image_url || "/placeholder.png"}
                              alt={item.product}
                              width={48}
                              height={48}
                              loading="lazy"
                              className="h-12 w-12 rounded-lg border border-border object-cover"
                            />
                            <span className="font-medium">{item.product}</span>
                          </div>
                        </td>
                        <td className="p-4 tabular-nums text-muted-foreground">
                          {fmtMoney(Number(item.price) || 0)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isSold
                                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
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
    </div>
  </PullToRefresh>
);
}
