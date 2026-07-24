"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Sparkles, BarChart3, Settings } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-blue-600">SpadasTechnology</h1>
        <p className="text-sm text-slate-500">AI Reseller Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-2" aria-label="Main navigation">
        <Link
          href="/dashboard"
          aria-current={isActive("/dashboard") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isActive("/dashboard")
              ? "bg-blue-50 font-semibold text-blue-600"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Home size={18} aria-hidden="true" className={isActive("/dashboard") ? "text-blue-600" : "text-slate-400"} />
          Dashboard
        </Link>

        <Link
          href="/listings"
          aria-current={isActive("/listings") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isActive("/listings")
              ? "bg-blue-50 font-semibold text-blue-600"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Package size={18} aria-hidden="true" className={isActive("/listings") ? "text-blue-600" : "text-slate-400"} />
          Listings
        </Link>

        <Link
          href="/generator"
          aria-current={isActive("/generator") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isActive("/generator")
              ? "bg-blue-50 font-semibold text-blue-600"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles size={18} aria-hidden="true" className={isActive("/generator") ? "text-blue-600" : "text-slate-400"} />
          AI Generator
        </Link>

        <Link
          href="/analytics"
          aria-current={isActive("/analytics") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isActive("/analytics")
              ? "bg-blue-50 font-semibold text-blue-600"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BarChart3 size={18} aria-hidden="true" className={isActive("/analytics") ? "text-blue-600" : "text-slate-400"} />
          Analytics
        </Link>

        <Link
          href="/settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isActive("/settings")
              ? "bg-blue-50 font-semibold text-blue-600"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Settings size={18} aria-hidden="true" className={isActive("/settings") ? "text-blue-600" : "text-slate-400"} />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
