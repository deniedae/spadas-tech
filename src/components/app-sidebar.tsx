"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Sparkles, BarChart3, Settings, Crosshair, Camera, History } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">SpadasTechnology</h1>
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">👑 PRO</span>
        </div>
        <p className="text-sm text-muted-foreground">AI Reseller Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-2" aria-label="Main navigation">
        <Link
          href="/dashboard"
          aria-current={isActive("/dashboard") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/dashboard")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Home size={18} aria-hidden="true" className={isActive("/dashboard") ? "text-primary" : "text-muted-foreground"} />
          Dashboard
        </Link>

        <Link
          href="/listings"
          aria-current={isActive("/listings") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/listings")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Package size={18} aria-hidden="true" className={isActive("/listings") ? "text-primary" : "text-muted-foreground"} />
          Listings
        </Link>

        <Link
          href="/lens"
          aria-current={isActive("/lens") ? "page" : undefined}
          className={`flex items-center justify-between rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/lens")
              ? "bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/30"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <div className="flex items-center gap-3">
            <Camera size={18} aria-hidden="true" className={isActive("/lens") ? "text-cyan-400" : "text-muted-foreground"} />
            <span>Spadas Lens AR</span>
          </div>
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        </Link>

        <Link
          href="/history"
          aria-current={isActive("/history") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/history")
              ? "bg-emerald-950/40 text-emerald-400 font-semibold border border-emerald-800/40"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <History size={18} aria-hidden="true" className={isActive("/history") ? "text-emerald-400" : "text-muted-foreground"} />
          Scan History
        </Link>

        <Link
          href="/generator"
          aria-current={isActive("/generator") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/generator")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Sparkles size={18} aria-hidden="true" className={isActive("/generator") ? "text-primary" : "text-muted-foreground"} />
          AI Generator
        </Link>

        <Link
          href="/sourcing"
          aria-current={isActive("/sourcing") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/sourcing")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Crosshair size={18} aria-hidden="true" className={isActive("/sourcing") ? "text-primary" : "text-muted-foreground"} />
          Sourcing Assistant
        </Link>

        <Link
          href="/analytics"
          aria-current={isActive("/analytics") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/analytics")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <BarChart3 size={18} aria-hidden="true" className={isActive("/analytics") ? "text-primary" : "text-muted-foreground"} />
          Analytics
        </Link>

        <Link
          href="/settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isActive("/settings")
              ? "bg-sidebar-accent text-primary font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Settings size={18} aria-hidden="true" className={isActive("/settings") ? "text-primary" : "text-muted-foreground"} />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
