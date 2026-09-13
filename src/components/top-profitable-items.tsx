"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Trophy } from "lucide-react";

type Listing = {
  id: number;
  product: string;
  sold_price: number | null;
  purchase_price: number | null;
  shipping_cost: number | null;
  fees: number | null;
  status: string;
};

export default function TopProfitableItems() {
  const [items, setItems] = useState<
    { product: string; profit: number }[]
  >([]);

  useEffect(() => {
    async function loadItems() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("listings")
        .select("product, sold_price, purchase_price, shipping_cost, fees, status")
        .eq("user_id", user.id);

      if (error || !data) return;

      const profitable = (data as Listing[])
        .filter((item) => (item.status ?? "").toLowerCase() === "sold")
        .map((item) => ({
          product: item.product,
          profit:
            Number(item.sold_price || 0) -
            Number(item.purchase_price || 0) -
            Number(item.shipping_cost || 0) -
            Number(item.fees || 0),
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);

      setItems(profitable);
    }

    void loadItems();
  }, []);

  return (
    <div className="glass-card rounded-2xl p-5 space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
          <Trophy className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Top Profitable Items</h2>
      </div>

      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="feed-card flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="hud-value text-[11px] text-zinc-600 w-4 shrink-0">
                {index + 1}
              </span>
              <p className="text-xs font-medium text-zinc-200 truncate">{item.product}</p>
            </div>

            <span className="hud-value text-[12px] text-emerald-400 shrink-0 ml-3">
              +${item.profit.toFixed(2)}
            </span>
          </div>
        ))}

        {items.length === 0 && (
          <p className="hud-label py-4 text-center" style={{ textTransform: "none", letterSpacing: "normal", fontSize: "11px" }}>
            No sold listings yet.
          </p>
        )}
      </div>
    </div>
  );
}