"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/app/lib/supabase";

const COLORS = ["#22c55e", "#3b82f6"];

export default function SalesStatusChart() {
  const [data, setData] = useState([
    { name: "Sold", value: 0 },
    { name: "Draft", value: 0 },
  ]);

  useEffect(() => {
    async function loadData() {
      const { data: listings, error } = await supabase
        .from("listings")
        .select("status");

      if (error || !listings) return;

      const sold = listings.filter(
        (item) => item.status === "Sold"
      ).length;

      const draft = listings.filter(
        (item) => item.status !== "Sold"
      ).length;

      setData([
        { name: "Sold", value: sold },
        { name: "Draft", value: draft },
      ]);
    }

    loadData();
  }, []);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">
        🥧 Sales Status
      </h2>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              label
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}