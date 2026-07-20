"use client";

import Link from "next/link";
import { Home, Package, Sparkles, BarChart3, Settings } from "lucide-react";

export function AppSidebar() {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">
          SpadasTechnology
        </h1>

        <p className="text-sm text-slate-500">
          AI Reseller Platform
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">

        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
        >
          <Home size={18} />
          Dashboard
        </Link>

        <Link
          href="/listings"
          className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
        >
          <Package size={18} />
          Listings
        </Link>

        <Link
          href="/generator"
          className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
        >
          <Sparkles size={18} />
          AI Generator
        </Link>

        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
        >
          <BarChart3 size={18} />
          Analytics
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
        >
          <Settings size={18} />
          Settings
        </Link>

      </nav>
    </aside>
  );
}