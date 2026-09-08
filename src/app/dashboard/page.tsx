"use client";

import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  AlertCircle,
  X,
  Camera,
  Crosshair,
  ListPlus,
  ArrowRight,
  Zap,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Search,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import NewListingDialog from "@/components/new-listing-dialog";
import EbayListingModal from "@/components/ebay-listing-modal";
import { fmtMoney, calcProfit } from "@/app/lib/listings";
import PullToRefresh from "@/components/pull-to-refresh";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";

interface Listing {
  id: string;
  product: string;
  description?: string;
  currency?: string;
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
  valueClassName = "text-zinc-100",
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
    <div className="p-3.5 sm:p-4 border border-white/[0.08] hover:border-white/[0.14] bg-[#0A0D15]/80 backdrop-blur-sm relative overflow-hidden rounded-xl transition-all shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-zinc-400 truncate">{label}</p>
        {Icon && (
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 shrink-0">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="mt-2.5 h-7 w-20 animate-pulse rounded bg-white/[0.05]" />
      ) : (
        <div className="mt-2 flex items-baseline justify-between gap-1">
          <h2 className={`text-xl sm:text-2xl font-mono font-bold tabular-nums tracking-tight truncate ${valueClassName}`}>
            {value}
          </h2>
          <span
            className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border tabular-nums shrink-0 ${
              trendPositive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
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

  if (error) {
    console.error("Dashboard Supabase listings fetch error:", error);
    return [];
  }
  return data || [];
}

export default function DashboardPage() {
  const router = useRouter();

  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [proLoading, setProLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isEbayConnected, setIsEbayConnected] = useState(false);
  const [ebayPublishItem, setEbayPublishItem] = useState<Listing | null>(null);

  // High-Density Grid Filters
  const [gridFilter, setGridFilter] = useState<"ALL" | "FAST_FLIPS" | "TRAPS" | "SOLD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  /** Shared logic to process raw listing data into stats. */
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

        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: Record<string, string> = {};
        if (session?.access_token) {
          authHeaders["Authorization"] = `Bearer ${session.access_token}`;
        }

        fetch("/api/marketplaces/status", { headers: authHeaders })
          .then((r) => (r.ok ? r.json() : ({} as any)))
          .then((d: any) => {
            if (!cancelled) {
              setIsEbayConnected(Boolean(d?.isConnected));
            }
          })
          .catch(() => {});

        fetch("/api/stripe/status", { headers: authHeaders })
          .then((r) => (r.ok ? r.json() : ({} as any)))
          .then((d: any) => {
            if (!cancelled) {
              setIsPro(Boolean(d?.active || d?.plan === "Pro"));
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

  // Compute Items with Turnover Velocity Profiles
  const itemsWithVelocity = useMemo(() => {
    return allListings.map((item) => {
      const velocity = calculateSalesVelocity({
        productName: item.product,
        category: "",
      });
      const profit = calcProfit(item);
      const cost = Number(item.purchase_price) || 0;
      const price = Number(item.price) || 0;
      return {
        ...item,
        velocity,
        calculatedProfit: profit,
        calculatedCost: cost,
        calculatedPrice: price,
      };
    });
  }, [allListings]);

  const fastFlipsCount = useMemo(
    () => itemsWithVelocity.filter((i) => i.velocity.sellThroughRate > 90).length,
    [itemsWithVelocity]
  );
  const trapsCount = useMemo(
    () =>
      itemsWithVelocity.filter(
        (i) => i.velocity.sellThroughRate < 25 || i.velocity.isHoarderRisk
      ).length,
    [itemsWithVelocity]
  );
  const soldCount = useMemo(
    () => itemsWithVelocity.filter((i) => i.status === "Sold").length,
    [itemsWithVelocity]
  );

  const displayedItems = useMemo(() => {
    return itemsWithVelocity.filter((item) => {
      if (gridFilter === "FAST_FLIPS" && item.velocity.sellThroughRate <= 90) return false;
      if (
        gridFilter === "TRAPS" &&
        item.velocity.sellThroughRate >= 25 &&
        !item.velocity.isHoarderRisk
      )
        return false;
      if (gridFilter === "SOLD" && item.status !== "Sold") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.product.toLowerCase().includes(q);
      }
      return true;
    });
  }, [itemsWithVelocity, gridFilter, searchQuery]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto pb-32 sm:pb-36 pb-[calc(env(safe-area-inset-bottom,0px)+8rem)] text-zinc-100">
        {/* Executive Portfolio & Telemetry Header */}
        <div className="p-4 sm:p-5 border border-white/[0.08] bg-[#0A0D15]/90 backdrop-blur-sm relative rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Optical Sourcing Engine</span>
                </div>

                {isEbayConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>eBay AU Linked</span>
                  </span>
                ) : (
                  <Link
                    href="/api/auth/ebay/connect?prompt=login"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition"
                  >
                    <ShoppingCart className="h-2.5 w-2.5" />
                    <span>Connect eBay Hub</span>
                  </Link>
                )}

                {proLoading ? (
                  <span className="h-5 w-16 rounded bg-white/[0.05] animate-pulse" />
                ) : isPro ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
                    Enterprise Tier
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPaywallOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] px-2 py-0.5 text-[10px] font-medium text-zinc-200 transition cursor-pointer"
                  >
                    Upgrade Plan
                  </button>
                )}
              </div>

              <div className="flex items-baseline gap-3 mt-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Portfolio & Sourcing Operations
                </h1>
                <span className="text-xs font-mono text-zinc-400">
                  {allListings.length} Active Positions
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Real-time yield analytics, liquidity velocity, and direct marketplace dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/lens"
                className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center shadow-sm active:scale-95 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Launch Lens AR</span>
              </Link>

              <NewListingDialog
                trigger={
                  <button className="h-9 px-3.5 text-xs font-medium rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 transition cursor-pointer flex items-center gap-1.5">
                    <span>+ Intake Lot</span>
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
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

        {/* Compact 4-Metric Grid (2x2 on mobile, 4-col on tablet/desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
                  label="Active Positions"
                  value={String(stats.listings)}
                  icon={Package}
                  trend={listingsTrend.label}
                  trendPositive={listingsTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Portfolio Valuation"
                  value={fmtMoney(stats.inventory)}
                  icon={DollarSign}
                  trend={inventoryTrend.label}
                  trendPositive={inventoryTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Realized Net Profit"
                  value={fmtMoney(stats.profit)}
                  valueClassName="text-emerald-400"
                  icon={TrendingUp}
                  trend={profitTrend.label}
                  trendPositive={profitTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Dispatched Units"
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

        {/* Core Operational Modules */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <Link
            href="/lens"
            className="p-3 border border-white/[0.08] hover:border-white/[0.18] bg-[#0A0D15]/80 rounded-xl transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Camera className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white group-hover:text-cyan-400 transition truncate">Spadas Lens</p>
                <p className="text-[10px] text-zinc-400 truncate">60 FPS Optical Comps</p>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition shrink-0" />
          </Link>

          <Link
            href="/ironman"
            className="p-3 border border-white/[0.08] hover:border-white/[0.18] bg-[#0A0D15]/80 rounded-xl transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Crosshair className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white group-hover:text-cyan-400 transition truncate">Spatial Field HUD</p>
                <p className="text-[10px] text-zinc-400 truncate">3D Anchored Valuations</p>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition shrink-0" />
          </Link>

          <Link
            href="/sourcing"
            className="p-3 border border-white/[0.08] hover:border-white/[0.18] bg-[#0A0D15]/80 rounded-xl transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition truncate">Underwriting Engine</p>
                <p className="text-[10px] text-zinc-400 truncate">STR & Margin Audit</p>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition shrink-0" />
          </Link>

          <Link
            href="/history"
            className="p-3 border border-white/[0.08] hover:border-white/[0.18] bg-[#0A0D15]/80 rounded-xl transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <ListPlus className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition truncate">Session Audit Logs</p>
                <p className="text-[10px] text-zinc-400 truncate">Historical Comps Feed</p>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition shrink-0" />
          </Link>
        </div>

        {/* ====================================================================
            THE HIGH-DENSITY INVENTORY PORTFOLIO DATA GRID
            ==================================================================== */}
        <div className="p-4 sm:p-5 border border-white/[0.08] bg-[#0A0D15]/90 rounded-xl space-y-4 shadow-sm">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <span className="h-2 w-2 rounded-sm bg-cyan-400" />
                <span className="uppercase tracking-wider">Portfolio Intelligence</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400 font-mono">{allListings.length} Total Units</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Liquidity turnover velocity, real-time margin realization, and marketplace dispatch.
              </p>
            </div>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-white/[0.08] overflow-x-auto select-none no-scrollbar">
              <button
                type="button"
                onClick={() => setGridFilter("ALL")}
                className={`px-3 py-1 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  gridFilter === "ALL"
                    ? "bg-white/[0.1] text-white font-bold border border-white/[0.12] shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
                }`}
              >
                <span>All [{allListings.length}]</span>
              </button>

              <button
                type="button"
                onClick={() => setGridFilter("FAST_FLIPS")}
                className={`px-3 py-1 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  gridFilter === "FAST_FLIPS"
                    ? "bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-emerald-300 border border-transparent font-medium"
                }`}
              >
                <Zap className="h-3 w-3 text-emerald-400" />
                <span>High Velocity [{fastFlipsCount}]</span>
              </button>

              <button
                type="button"
                onClick={() => setGridFilter("TRAPS")}
                className={`px-3 py-1 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  gridFilter === "TRAPS"
                    ? "bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-rose-300 border border-transparent font-medium"
                }`}
              >
                <ShieldAlert className="h-3 w-3 text-rose-400" />
                <span>Low Turnover [{trapsCount}]</span>
              </button>

              <button
                type="button"
                onClick={() => setGridFilter("SOLD")}
                className={`px-3 py-1 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  gridFilter === "SOLD"
                    ? "bg-white/[0.1] text-zinc-100 font-bold border border-white/[0.12] shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
                }`}
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Realized [{soldCount}]</span>
              </button>
            </div>
          </div>

          {/* Search bar inside grid */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by part, tag, title..."
                className="w-full h-8 pl-8 pr-3 rounded bg-[#090A0F] border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#F97316]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="text-[11px] font-mono text-zinc-500 ml-auto">
              SHOWING: <strong className="text-zinc-200">{displayedItems.length}</strong> / {allListings.length}
            </div>
          </div>

          {/* Mobile View: High-Density Card List (No heavy horizontal scrolling struggle on low-end phones) */}
          <div className="block sm:hidden divide-y divide-zinc-800/70 border border-zinc-800 rounded-lg bg-[#090A0F] overflow-hidden">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 animate-pulse flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-zinc-800" />
                    <div className="h-3 w-1/2 rounded bg-zinc-800" />
                  </div>
                </div>
              ))}

            {!loading && displayedItems.length === 0 && (
              <div className="p-6 text-center text-zinc-500 font-mono text-xs">
                {allListings.length === 0
                  ? "NO INVENTORY UNITS LOGGED. USE LENS AR TO INTAKE YOUR FIRST ASSET."
                  : "NO ASSETS MATCH CURRENT PORTFOLIO FILTER."}
              </div>
            )}

            {!loading &&
              displayedItems.map((item) => {
                const isFastFlip = item.velocity.sellThroughRate > 90;
                const isTrap =
                  item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk;

                return (
                  <div key={item.id} className="p-2.5 hover:bg-[#12151E] transition-colors">
                    <div className="flex items-start gap-2.5">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover border border-zinc-800 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-500 shrink-0 mt-0.5">
                          <Package className="h-4 w-4" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-bold text-zinc-100 font-sans">
                            {item.product}
                          </p>
                          <a
                            href={`https://www.ebay.com.au/sl/prelist/suggest?keyword=${encodeURIComponent(
                              item.product
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#12151E] hover:bg-[#181C28] text-zinc-300 border border-zinc-700 text-[10px] font-mono font-bold transition shrink-0"
                          >
                            <span>DRAFT</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>

                        {/* Price & Profit Row */}
                        <div className="flex items-center justify-between mt-1 font-mono text-[11px]">
                          <div className="text-zinc-400">
                            <span className="text-zinc-500">Cost:</span> {fmtMoney(item.calculatedCost)}
                            <span className="text-zinc-600 mx-1">→</span>
                            <span className="text-zinc-200 font-bold">{fmtMoney(item.calculatedPrice)}</span>
                          </div>
                          <div
                            className={`font-black tabular-nums ${
                              item.calculatedProfit > 0
                                ? "text-[#22C55E]"
                                : item.calculatedProfit < 0
                                ? "text-[#DC2626]"
                                : "text-zinc-400"
                            }`}
                          >
                            {item.calculatedProfit > 0
                              ? `+${fmtMoney(item.calculatedProfit)}`
                              : fmtMoney(item.calculatedProfit)}
                          </div>
                        </div>

                        {/* Tags & Velocity Row */}
                        <div className="flex items-center justify-between mt-1.5 gap-1 font-mono text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-black border tabular-nums ${
                                isFastFlip
                                  ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30"
                                  : isTrap
                                  ? "bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30"
                                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
                              }`}
                            >
                              {isFastFlip && "⚡"}
                              {isTrap && "🛑"}
                              {item.velocity.sellThroughRate}% STR
                            </span>

                            <span className="text-zinc-500">
                              ~{item.velocity.estDaysToSell}d turn
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold border ${
                                item.status === "Sold"
                                  ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
                                  : item.status === "Active"
                                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {item.status}
                            </span>

                            {/* Direct eBay Publish Action Button right alongside status badge */}
                            <button
                              type="button"
                              onClick={() => setEbayPublishItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-[#F97316]/15 to-amber-500/15 hover:from-[#F97316]/30 hover:to-amber-500/30 text-[#F97316] hover:text-amber-200 border border-[#F97316]/40 text-[10px] font-mono font-bold transition shadow-xs cursor-pointer shrink-0"
                              title="Publish directly to eBay"
                            >
                              <ShoppingBag className="w-2.5 h-2.5 text-[#F97316]" />
                              <span>EBAY</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Desktop/Tablet View: High-Density Monospace Data Grid Table */}
          <div className="hidden sm:block overflow-x-auto rounded border border-zinc-800/90 bg-[#090A0F]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#0D1017] font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Asset / Item</th>
                  <th className="py-2 px-3 text-right">Cost</th>
                  <th className="py-2 px-3 text-right">Price</th>
                  <th className="py-2 px-3 text-right">Net Profit</th>
                  <th className="py-2 px-3 text-center">STR% (Velocity)</th>
                  <th className="py-2 px-3 text-center">Turn Days</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded bg-zinc-800" />
                          <div className="h-3.5 w-40 rounded bg-zinc-800" />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right"><div className="h-3.5 w-12 rounded bg-zinc-800 ml-auto" /></td>
                      <td className="py-2.5 px-3 text-right"><div className="h-3.5 w-14 rounded bg-zinc-800 ml-auto" /></td>
                      <td className="py-2.5 px-3 text-right"><div className="h-3.5 w-14 rounded bg-zinc-800 ml-auto" /></td>
                      <td className="py-2.5 px-3 text-center"><div className="h-3.5 w-16 rounded bg-zinc-800 mx-auto" /></td>
                      <td className="py-2.5 px-3 text-center"><div className="h-3.5 w-12 rounded bg-zinc-800 mx-auto" /></td>
                      <td className="py-2.5 px-3 text-center"><div className="h-3.5 w-12 rounded bg-zinc-800 mx-auto" /></td>
                      <td className="py-2.5 px-3 text-right"><div className="h-3.5 w-10 rounded bg-zinc-800 ml-auto" /></td>
                    </tr>
                  ))}

                {!loading && displayedItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono text-xs">
                      {allListings.length === 0
                        ? "NO INVENTORY UNITS LOGGED. USE LENS AR TO INTAKE YOUR FIRST ASSET."
                        : "NO ASSETS MATCH CURRENT PORTFOLIO FILTER."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  displayedItems.map((item) => {
                    const isFastFlip = item.velocity.sellThroughRate > 90;
                    const isTrap =
                      item.velocity.sellThroughRate < 25 || item.velocity.isHoarderRisk;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#12151E] transition-colors group"
                      >
                        {/* Asset Item Column */}
                        <td className="py-2 px-3 font-sans font-medium text-zinc-100">
                          <div className="flex items-center gap-2.5">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.product}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded object-cover border border-zinc-800 shrink-0"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-500 shrink-0">
                                <Package className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate max-w-[200px] sm:max-w-xs md:max-w-sm text-xs font-bold text-zinc-100">
                                {item.product}
                              </p>
                              <p className="font-mono text-[10px] text-zinc-500">
                                {new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Cost (Tabular Monospace) */}
                        <td className="py-2 px-3 text-right tabular-nums text-zinc-400 font-semibold data-readout">
                          {fmtMoney(item.calculatedCost)}
                        </td>

                        {/* Target Price (Tabular Monospace) */}
                        <td className="py-2 px-3 text-right tabular-nums text-zinc-200 font-bold data-readout">
                          {fmtMoney(item.calculatedPrice)}
                        </td>

                        {/* Net Profit (Tabular Monospace) */}
                        <td
                          className={`py-2 px-3 text-right tabular-nums font-black data-readout ${
                            item.calculatedProfit > 0
                              ? "text-[#22C55E]"
                              : item.calculatedProfit < 0
                              ? "text-[#DC2626]"
                              : "text-zinc-400"
                          }`}
                        >
                          {item.calculatedProfit > 0
                            ? `+${fmtMoney(item.calculatedProfit)}`
                            : fmtMoney(item.calculatedProfit)}
                        </td>

                        {/* STR% Velocity */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border tabular-nums data-readout ${
                              isFastFlip
                                ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30"
                                : isTrap
                                ? "bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30"
                                : "bg-zinc-900/80 text-zinc-400 border-zinc-800"
                            }`}
                          >
                            {isFastFlip && "⚡ "}
                            {isTrap && "🛑 "}
                            {item.velocity.sellThroughRate}% STR
                          </span>
                        </td>

                        {/* Days to Turn */}
                        <td className="py-2 px-3 text-center text-[11px] tabular-nums font-semibold text-zinc-400 data-readout">
                          {item.velocity.estDaysToSell}
                        </td>

                        {/* Status & Direct eBay Publish Bar */}
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                item.status === "Sold"
                                  ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
                                  : item.status === "Active"
                                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {item.status}
                            </span>

                            {/* Direct Accessible eBay Publish Action Button */}
                            <button
                              type="button"
                              onClick={() => setEbayPublishItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-[#F97316]/15 to-amber-500/15 hover:from-[#F97316]/30 hover:to-amber-500/30 text-[#F97316] hover:text-amber-200 border border-[#F97316]/40 text-[10px] font-mono font-bold transition shadow-xs cursor-pointer shrink-0"
                              title="Publish directly to eBay"
                            >
                              <ShoppingBag className="w-2.5 h-2.5 text-[#F97316]" />
                              <span>EBAY</span>
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEbayPublishItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#12151E] hover:bg-[#181C28] text-zinc-300 border border-zinc-700 text-[10px] font-mono font-bold transition cursor-pointer"
                              title="Publish to eBay"
                            >
                              <span>PUBLISH</span>
                              <ExternalLink className="h-2.5 w-2.5 text-[#F97316]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/80">
            <div>
              SHOWING <strong className="text-zinc-300">{displayedItems.length}</strong> ACTIVE ASSETS
            </div>
            <Link
              href="/listings"
              className="hover:text-zinc-200 transition flex items-center gap-1 text-[#F97316] font-bold"
            >
              <span>FULL INVENTORY MANAGER</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
      <SubscriptionPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />

      {/* 1-Click Live eBay Publish Modal */}
      {ebayPublishItem && (
        <EbayListingModal
          isOpen={!!ebayPublishItem}
          onClose={() => {
            setEbayPublishItem(null);
            void handleRefresh();
          }}
          title={ebayPublishItem.product}
          price={Number(ebayPublishItem.price) || 25}
          currency={(ebayPublishItem as any).currency}
          description={ebayPublishItem.description || `Authentic ${ebayPublishItem.product}. Logged in Spadas Inventory.`}
          imageUrls={ebayPublishItem.image_url ? [ebayPublishItem.image_url] : []}
        />
      )}
    </PullToRefresh>
  );
}
