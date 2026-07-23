"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

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
      const { data, error } = await supabase
        .from("listings")
        .select("*");

      if (error || !data) return;

      const profitable = (data as Listing[])
        .filter((item) => item.status === "Sold")
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

    loadItems();
  }, []);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">
        🏆 Top Profitable Items
      </h2>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{item.product}</p>
            </div>

            <span className="font-bold text-green-600">
              ${item.profit.toFixed(2)}
            </span>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-gray-500">
            No sold listings yet.
          </p>
        )}
      </div>
    </div>
  );
}