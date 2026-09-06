"use client";

import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
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
import { fmtMoney, calcProfit } from "@/app/lib/listings";
import PullToRefresh from "@/components/pull-to-refresh";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";

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
    <div className="specimen-card p-4 sm:p-5 border border-zinc-800 bg-[#0E1118] relative overflow-hidden rounded-lg">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#161922] border border-zinc-800 text-[#F97316]">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-zinc-800/80" />
      ) : (
        <div className="mt-3 flex items-baseline justify-between">
          <h2 className={`text-2xl sm:text-3xl font-mono font-black tabular-nums tracking-tight data-readout ${valueClassName}`}>
            {value}
          </h2>
          <span
            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${
              trendPositive
                ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
                : "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20"
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
      <div className="space-y-6 max-w-7xl mx-auto pb-14 text-zinc-100">
        {/* Hardware Command Terminal Header */}
        <div className="specimen-card p-5 sm:p-6 border border-zinc-800 bg-[#0E1118] relative rounded-xl">
          {/* Subtle Corner Markers */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#F97316]" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#F97316]" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded bg-[#161922] border border-zinc-800 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span>COMMAND TERMINAL // RESELLER OPERATIONS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
                Inventory & Sales Telemetry
              </h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Track margin velocity, eliminate hoarder inventory, and dispatch offers directly to eBay AU.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {proLoading ? (
                <div className="h-10 w-36 rounded bg-zinc-800/80 animate-pulse border border-zinc-700/50" />
              ) : isPro ? (
                <div className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#161922] border border-[#22C55E]/40 px-4 font-mono text-xs font-bold text-[#22C55E]">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  <span>[PRO TIER ACTIVE]</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPaywallOpen(true)}
                  className="btn-primary h-10 px-4 text-xs font-mono font-bold cursor-pointer"
                >
                  <span>UPGRADE TIER</span>
                </button>
              )}

              <Link
                href="/lens"
                className="btn-primary h-10 px-4 text-xs font-bold gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>LAUNCH LENS AR</span>
              </Link>

              <Link
                href="/history"
                className="btn-secondary h-10 px-4 text-xs font-mono font-bold"
              >
                <span>SCAN LOGS</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Marketplace Integration Status */}
        {isEbayConnected ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg bg-[#0E1118] border border-[#22C55E]/30 p-3.5 sm:p-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase">eBay Merchant Link: CONNECTED</h3>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Direct background publishing authenticated for Australian marketplace.
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="btn-secondary h-8 px-3 text-[11px] font-mono text-zinc-300 shrink-0"
            >
              <span>MANAGE LINK</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg bg-[#0E1118] border border-[#F97316]/30 p-3.5 sm:p-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-[#F97316]/10 border border-[#F97316]/30 text-[#F97316] shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase">eBay Merchant Link: NOT CONNECTED</h3>
                  <span className="text-[10px] text-[#F97316]">[ACTION REQUIRED]</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Connect seller account to enable 1-tap drafting directly from scanner.
                </p>
              </div>
            </div>
            <Link
              href="/api/auth/ebay/connect?prompt=login"
              className="btn-primary h-8 px-3 text-[11px] font-mono shrink-0"
            >
              <span>CONNECT EBAY</span>
            </Link>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs font-mono text-[#DC2626]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1 rounded hover:bg-[#DC2626]/20 text-[#DC2626] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Core Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
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
                  label="Total Inventory"
                  value={String(stats.listings)}
                  icon={Package}
                  trend={listingsTrend.label}
                  trendPositive={listingsTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Stock Valuation"
                  value={fmtMoney(stats.inventory)}
                  icon={DollarSign}
                  trend={inventoryTrend.label}
                  trendPositive={inventoryTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Realized Profit"
                  value={fmtMoney(stats.profit)}
                  valueClassName="text-[#22C55E]"
                  icon={TrendingUp}
                  trend={profitTrend.label}
                  trendPositive={profitTrend.positive}
                  loading={loading}
                />
                <StatCard
                  label="Items Dispatched"
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

        {/* Quick Action Hardware Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 font-mono text-xs">
          <Link
            href="/lens"
            className="specimen-card p-4 hover:border-zinc-700 transition flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>[01] OPTICAL SENSOR</span>
                <span className="text-[#22C55E] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> 60 FPS
                </span>
              </div>
              <h3 className="mt-2 text-sm font-black font-sans text-white group-hover:text-[#F97316] transition">
                Spadas Lens AR
              </h3>
              <p className="mt-1 text-[11px] text-zinc-400 font-sans">
                Continuous walk-and-pan camera comps.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <span>SCANNER</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          <Link
            href="/ironman"
            className="specimen-card p-4 hover:border-zinc-700 transition flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>[02] SPATIAL HUD</span>
                <span className="text-[#F97316]">[3D BEACONS]</span>
              </div>
              <h3 className="mt-2 text-sm font-black font-sans text-white group-hover:text-[#F97316] transition">
                Iron Man AR HUD
              </h3>
              <p className="mt-1 text-[11px] text-zinc-400 font-sans">
                Holographic floating profit pins in 3D.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <span>LAUNCH HUD</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          <Link
            href="/sourcing"
            className="specimen-card p-4 hover:border-zinc-700 transition flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>[03] VERDICT ENGINE</span>
                <span className="text-zinc-400">[STR AUDIT]</span>
              </div>
              <h3 className="mt-2 text-sm font-black font-sans text-white group-hover:text-[#22C55E] transition">
                Sourcing Verdict
              </h3>
              <p className="mt-1 text-[11px] text-zinc-400 font-sans">
                Buy vs pass margin evaluation.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <span>EVALUATE</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          <div className="specimen-card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>[04] MANUAL ENTRY</span>
                <span className="text-zinc-500">[ADD]</span>
              </div>
              <h3 className="mt-2 text-sm font-black font-sans text-white">
                New Inventory Unit
              </h3>
              <p className="mt-1 text-[11px] text-zinc-400 font-sans">
                Log freshly acquired lot directly.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80">
              <NewListingDialog
                trigger={
                  <button className="btn-secondary w-full h-8 text-[11px] font-mono">
                    <span>+ LOG SPECIMEN</span>
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* ====================================================================
            THE HIGH-DENSITY INVENTORY DATA GRID
            ==================================================================== */}
        <div className="specimen-card p-4 sm:p-5 border border-zinc-800 bg-[#0E1118] rounded-xl space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                <span className="text-[#F97316]">■</span>
                <span className="uppercase font-bold">SPECIMEN INVENTORY TELEMETRY</span>
                <span className="text-zinc-600">//</span>
                <span>{allListings.length} TOTAL UNITS</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dense telemetry grid with turnover velocity and real-time margin math.
              </p>
            </div>

            {/* Step 3: Tactile Hardware Segmented Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#090A0F] border border-zinc-800 overflow-x-auto select-none">
              <button
                type="button"
                onClick={() => setGridFilter("ALL")}
                className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  gridFilter === "ALL"
                    ? "bg-[#161922] text-[#F97316] font-black border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
                }`}
              >
                <span>[All Inventory: {allListings.length}]</span>
              </button>

              <button
                type="button"
                onClick={() => setGridFilter("FAST_FLIPS")}
                className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  gridFilter === "FAST_FLIPS"
                    ? "bg-[#161922] text-[#22C55E] font-black border border-[#22C55E]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    : "text-zinc-400 hover:text-[#22C55E] border border-transparent font-medium"
                }`}
              >
                <Zap className="h-3 w-3 text-[#22C55E]" />
                <span>[⚡ Fast Flips: {fastFlipsCount}]</span>
              </button>

              <button
                type="button"
                onClick={() => setGridFilter("TRAPS")}
                className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  gridFilter === "TRAPS"
                    ? "bg-[#161922] text-[#DC2626] font-black border border-[#DC2626]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    : "text-zinc-400 hover:text-[#DC2626] border border-transparent font-medium"
                }`}
              >
                <ShieldAlert className="h-3 w-3 text-[#DC2626]" />
                <span>[🛑 Traps: {trapsCount}]</span>
              </button>

              <button
                type="button"
                onClick={() => setGridFilter("SOLD")}
                className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  gridFilter === "SOLD"
                    ? "bg-[#161922] text-zinc-100 font-black border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent font-medium"
                }`}
              >
                <CheckCircle2 className="h-3 w-3 text-[#22C55E]" />
                <span>[Sold: {soldCount}]</span>
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

            <div className="text-[11px] font-mono text-zinc-500 ml-auto hidden sm:block">
              SHOWING: <strong className="text-zinc-200">{displayedItems.length}</strong> / {allListings.length} UNITS
            </div>
          </div>

          {/* High-Density Data Grid Table */}
          <div className="overflow-x-auto rounded border border-zinc-800/90 bg-[#090A0F]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#0D1017] font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Item / Specimen</th>
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
                        ? "NO INVENTORY UNITS LOGGED. USE LENS AR TO SCAN YOUR FIRST SPECIMEN."
                        : "NO SPECIMENS MATCH CURRENT VELOCITY FILTER."}
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
                        {/* Specimen Item Column */}
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

                        {/* Step 2: STR% Velocity (Strictly Color-Coded) */}
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

                        {/* Days to Turn (Tabular Monospace) */}
                        <td className="py-2 px-3 text-center text-[11px] tabular-nums font-semibold text-zinc-400 data-readout">
                          {item.velocity.estDaysToSell}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center">
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
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right">
                          <a
                            href={`https://www.ebay.com.au/sl/prelist/suggest?keyword=${encodeURIComponent(
                              item.product
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#12151E] hover:bg-[#181C28] text-zinc-300 border border-zinc-700 text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            <span>DRAFT</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/80">
            <div>
              SHOWING <strong className="text-zinc-300">{displayedItems.length}</strong> ACTIVE SPECIMENS
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
    </PullToRefresh>
  );
}
