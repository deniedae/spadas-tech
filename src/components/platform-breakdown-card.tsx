"use client";

import { fmtMoney, getPlatformFeeRate } from "@/app/lib/listings";
import { Layers, ShieldCheck, DollarSign } from "lucide-react";

interface ListingItem {
  id?: string;
  product?: string;
  sold_price?: number | string | null;
  price?: number | string | null;
  platform?: string | null;
  status?: string | null;
}

export default function PlatformBreakdownCard({ items }: { items: ListingItem[] }) {
  const platforms = [
    { name: "eBay", rateText: "13.25%", key: "ebay", color: "bg-blue-500 text-blue-500" },
    { name: "Poshmark", rateText: "20.0%", key: "poshmark", color: "bg-pink-500 text-pink-500" },
    { name: "Mercari", rateText: "10.0%", key: "mercari", color: "bg-purple-500 text-purple-500" },
    { name: "Depop", rateText: "10.0%", key: "depop", color: "bg-red-500 text-red-500" },
    { name: "Facebook Marketplace", rateText: "5.0%", key: "facebook", color: "bg-cyan-500 text-cyan-500" },
  ];

  const soldItems = items.filter((i) => (i.status ?? "").toLowerCase() === "sold");

  const platformStats = platforms.map((p) => {
    const pItems = soldItems.filter((i) => {
      const itemP = (i.platform || "ebay").toLowerCase();
      if (p.key === "facebook") return itemP.includes("facebook") || itemP.includes("fb");
      return itemP.includes(p.key);
    });

    const revenue = pItems.reduce(
      (sum, i) => sum + (Number(i.sold_price ?? i.price ?? 0) || 0),
      0
    );

    const rate = getPlatformFeeRate(p.name);
    const estimatedFees = Math.round(revenue * rate * 100) / 100;

    return {
      ...p,
      count: pItems.length,
      revenue,
      estimatedFees,
    };
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Platform Fee Breakdown</h3>
            <p className="text-xs text-muted-foreground">
              Automatic fee deductions calculated per marketplace
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {platformStats.map((p) => (
          <div key={p.name} className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${p.color.split(" ")[0]}`} />
                {p.name}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Fee: {p.rateText}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <p className="text-[11px] text-muted-foreground">Revenue</p>
                <p className="text-base font-bold tabular-nums">{fmtMoney(p.revenue)}</p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Est. Platform Fees</p>
                <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                  −{fmtMoney(p.estimatedFees)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
