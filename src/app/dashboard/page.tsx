"use client";

import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  X,
  Sparkles,
  Camera,
  Crosshair,
  ListPlus,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import NewListingDialog from "@/components/new-listing-dialog";
import { fmtMoney, calcProfit } from "@/app/lib/listings";
import PullToRefresh from "@/components/pull-to-refresh";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";

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

function StatCard({
  label,
  value,
  valueClassName = "text-white",
  icon: Icon,
  trend = "—",
  trendPositive = true,
  loading,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendPositive?: boolean;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-300 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="mt-4 h-9 w-28 animate-pulse rounded-xl bg-slate-800" />
      ) : (
        <div className="mt-4 flex items-baseline justify-between">
          <h2 className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${valueClassName}`}>
            {value}
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
              trendPositive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

/** Compute a formatted week-over-week trend string from all listings. */
function calcWeeklyTrend(
  all: Listing[],
  getValue: (item: Listing) => number,
  filter?: (item: Listing) => boolean
): { label: string; positive: boolean } {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 2 * oneWeek;

  const items = filter ? all.filter(filter) : all;

  const thisWeek = items
    .filter((i) => now - new Date(i.created_at).getTime() < oneWeek)
    .reduce((sum, i) => sum + getValue(i), 0);

  const lastWeek = items
    .filter((i) => {
      const age = now - new Date(i.created_at).getTime();
      return age >= oneWeek && age < twoWeeks;
    })
    .reduce((sum, i) => sum + getValue(i), 0);

  if (lastWeek === 0 && thisWeek === 0) return { label: "—", positive: true };
  if (lastWeek === 0) return { label: "New", positive: true };

  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return {
    label: `${pct >= 0 ? "+" : ""}${pct}% vs last wk`,
    positive: pct >= 0,
  };
}

async function fetchDashboardListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Listing[]) || [];
}

export default function Dashboard() {
  const router = useRouter();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [proLoading, setProLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isEbayConnected, setIsEbayConnected] = useState(false);

  /** Shared logic to process raw listing data into stats + recent view. */
  function processListings(data: Listing[]) {
    let revenue = 0;
    let profit = 0;
    let sold = 0;
    let inventory = 0;

    data.forEach((item) => {
      if (item.status === "Sold") {
        sold++;
        revenue += Number(item.sold_price) || 0;
        profit += calcProfit(item);
      } else {
        inventory += Number(item.price) || 0;
      }
    });

    setAllListings(data);
    setRecentListings(data.slice(0, 5));
    setStats({ listings: data.length, inventory, revenue, profit, sold });
  }

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

        // Check eBay token status
        const { data: ebayToken } = await supabase
          .from("user_marketplace_tokens")
          .select("is_connected")
          .eq("user_id", user.id)
          .eq("platform", "ebay")
          .maybeSingle();

        if (!cancelled) {
          setIsEbayConnected(!!ebayToken?.is_connected);
        }

        // Pro check — always resolved server-side from /api/stripe/status
        fetch("/api/stripe/status")
          .then((r) => r.json())
          .then((d) => {
            if (!cancelled) {
              setIsPro(Boolean(d.active || d.plan === "Pro"));
              setProLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setProLoading(false);
          });

        const data = await fetchDashboardListings(user.id);
        if (cancelled) return;
        processListings(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as Error)?.message || "Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const data = await fetchDashboardListings(user.id);
      processListings(data);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header Hero — Dark Glass SaaS Banner */}
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-black text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                COMMAND CENTER • SPADAS AI
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white mt-2">
                Welcome back to Spadas <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Command Center</span> 👋
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed mt-1">
                Real-time inventory management, automated 60FPS AR shelf scanning, and 1-click cross-platform listing engine.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {proLoading ? (
                <div className="h-11 w-44 rounded-xl bg-slate-800/80 animate-pulse border border-slate-700/50" />
              ) : isPro ? (
                <div className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-5 text-xs font-black text-emerald-300 shadow-md shadow-emerald-500/10">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>👑 SPADAS PRO ACTIVE</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPaywallOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <span>👑 Upgrade to Pro ($10 AUD/mo)</span>
                </button>
              )}
              <Link
                href="/lens"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <span>📷 Open Spadas Lens AR</span>
              </Link>
              <Link
                href="/history"
                className="inline-flex h-11 items-center justify-center gap-2 px-5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-black text-xs rounded-xl transition shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
              >
                <span>📜 View Scan History</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Marketplace Integration Hub Status */}
        {isEbayConnected ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl bg-slate-900/90 border border-emerald-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">eBay Seller Hub Connected</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE & ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  1-click background publishing is ready. Your scan drafts and listings sync directly to your eBay account.
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl transition border border-slate-700 shrink-0 cursor-pointer"
            >
              <span>Manage Integration</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-cyan-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">Connect your eBay Seller Account</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-400 border border-cyan-500/30">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unlock 1-click publishing directly from camera scans to your eBay Australia store.
                </p>
              </div>
            </div>
            <Link
              href="/api/auth/ebay/connect"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-cyan-500/20 hover:scale-105 transition shrink-0 cursor-pointer"
            >
              <span>⚡ Connect eBay</span>
            </Link>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-300 shadow-md"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Core Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {(() => {
            const listingsTrend = calcWeeklyTrend(allListings, () => 1);
            const inventoryTrend = calcWeeklyTrend(
              allListings,
              (i) => (i.status !== "Sold" ? Number(i.price) || 0 : 0)
            );
            const profitTrend = calcWeeklyTrend(
              allListings,
              (i) => calcProfit(i),
              (i) => i.status === "Sold"
            );
            const soldTrend = calcWeeklyTrend(
              allListings,
              () => 1,
              (i) => i.status === "Sold"
            );
            return (
              <>
                <StatCard
                  label="Listings"
                  value={String(stats.listings)}
                  icon={Package}
                  trend={listingsTrend.label}
                  trendPositive={listingsTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Inventory Value"
                  value={fmtMoney(stats.inventory)}
                  icon={DollarSign}
                  trend={inventoryTrend.label}
                  trendPositive={inventoryTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Profit"
                  value={fmtMoney(stats.profit)}
                  valueClassName="text-emerald-400 font-black"
                  icon={TrendingUp}
                  trend={profitTrend.label}
                  trendPositive={profitTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Items Sold"
                  value={String(stats.sold)}
                  icon={ShoppingCart}
                  trend={soldTrend.label}
                  trendPositive={soldTrend.positive}
                  loading={loading}
                />
              </>
            );
          })()}
        </div>

        {/* Quick Action SaaS Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Link
            href="/lens"
            className="relative overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl transition hover:scale-[1.02] cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-black text-cyan-300 border border-cyan-500/40">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" /> LIVE 60FPS AR
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-black text-white group-hover:text-cyan-300 transition">📷 Spadas Lens AR</h2>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">Continuous camera scanner with profit overlays & audio chimes.</p>
          </Link>

          <Link
            href="/generator"
            className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur-xl transition hover:scale-[1.02] hover:border-slate-700 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-cyan-300 transition">🤖 AI Generator</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">Create AI listings in seconds from photo gallery.</p>
          </Link>

          <Link
            href="/sourcing"
            className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur-xl transition hover:scale-[1.02] hover:border-slate-700 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <Crosshair className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-emerald-300 transition">🎯 Sourcing Assistant</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">Get a buy/pass verdict before you spend in store.</p>
          </Link>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                <ListPlus className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-white">⚡ Quick Add</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">Create a fresh listing manually in seconds.</p>
            </div>
            <div className="mt-4">
              <NewListingDialog
                trigger={
                  <button className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 transition cursor-pointer">
                    + Add Listing
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* Recent Listings Table */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white">Recent Inventory Listings</h2>
              <p className="text-xs text-slate-400">Latest items scanned or published to your reseller inventory.</p>
            </div>
            {recentListings.length > 0 && (
              <Link
                href="/listings"
                className="inline-flex items-center gap-1 text-xs font-black text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>View all listings</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left border-b border-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider">
                <tr>
                  <th scope="col" className="pb-4">Product</th>
                  <th scope="col" className="pb-4">Target Price</th>
                  <th scope="col" className="pb-4">Status</th>
                  <th scope="col" className="pb-4">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-800 animate-pulse" />
                          <div className="h-4 w-36 rounded bg-slate-800 animate-pulse" />
                        </div>
                      </td>
                      <td className="py-4"><div className="h-4 w-16 rounded bg-slate-800 animate-pulse" /></td>
                      <td className="py-4"><div className="h-4 w-16 rounded bg-slate-800 animate-pulse" /></td>
                      <td className="py-4"><div className="h-4 w-20 rounded bg-slate-800 animate-pulse" /></td>
                    </tr>
                  ))}

                {!loading && recentListings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No listings created yet. Tap <strong>📷 Open Spadas Lens AR</strong> to scan your first item!
                    </td>
                  </tr>
                )}

                {!loading &&
                  recentListings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 font-bold text-slate-100">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.product}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-xl object-cover border border-slate-800"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <span className="truncate max-w-xs">{item.product}</span>
                        </div>
                      </td>
                      <td className="py-4 font-black text-cyan-300 tabular-nums">
                        {fmtMoney(Number(item.price) || 0)}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                            item.status === "Sold"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 font-mono">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <SubscriptionPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </PullToRefresh>
  );
}
