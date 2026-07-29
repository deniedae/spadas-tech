"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Sparkles, BarChart3, Settings, Crosshair } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-primary">SpadasTechnology</h1>
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
