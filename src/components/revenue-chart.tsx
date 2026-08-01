"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useState, useEffect } from "react";

// Data point type
type DataPoint = {
  month: string;
  revenue: number;
  profit: number;
};

interface DashboardChartsProps {
  data: DataPoint[];
  loading: boolean;
}

export default function DashboardCharts({ data, loading }: DashboardChartsProps) {
  // Show loading or empty state
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 rounded-xl border bg-white p-6 shadow-sm min-h-[320px] place-items-center">
        <p className="text-gray-400">Loading charts...</p>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm text-center text-gray-400">
        No chart data available.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 rounded-xl border bg-white p-6 shadow-sm">
      {/* Revenue Chart */}
      <div>
        <h2 className="mb-4 text-2xl font-bold flex items-center gap-2">
          📈 Revenue Over Time
        </h2>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="month"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />

              <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />

              <Tooltip
                formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                contentStyle={{ backgroundColor: "#fff", borderRadius: 8, padding: 10 }}
                labelStyle={{ fontWeight: "bold" }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                animationDuration={1200}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Chart */}
      <div>
        <h2 className="mb-4 text-2xl font-bold flex items-center gap-2">
          💰 Profit Over Time
        </h2>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="month"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />

              <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />

              <Tooltip
                formatter={(value) => [`$${Number(value).toFixed(2)}`, "Profit"]}
                contentStyle={{ backgroundColor: "#fff", borderRadius: 8, padding: 10 }}
                labelStyle={{ fontWeight: "bold" }}
              />

              <Area
                type="monotone"
                dataKey="profit"
                stroke="#22c55e"
                strokeWidth={3}
                fill="url(#profitGradient)"
                animationDuration={1200}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
