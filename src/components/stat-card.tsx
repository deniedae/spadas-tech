"use client";

import React, { ComponentType } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  valueClassName?: string;
  icon?: ComponentType<{ className?: string }>;
  loading: boolean;
}

export default function StatCard({
  label,
  value,
  valueClassName = "",
  icon: Icon,
  loading,
}: StatCardProps) {
  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-sm p-6 border border-border transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />}
      </div>
      {loading ? (
        <div className="mt-2 h-9 w-28 animate-pulse rounded bg-muted" />
      ) : (
        <h2 className={`text-4xl font-bold mt-2 tabular-nums ${valueClassName}`}>
          {value}
        </h2>
      )}
    </div>
  );
}
