"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  History,
  Package,
  TrendingUp,
  Target,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/lens", label: "Lens Scanner", icon: Camera },
    { href: "/history", label: "Scan History", icon: History },
    { href: "/listings", label: "Listings", icon: Package },
    { href: "/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/sourcing", label: "Sourcing", icon: Target },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-60 min-h-screen bg-[#08090D] border-r border-white/[0.08] text-white p-4 flex flex-col">
      {/* Wordmark */}
      <div className="mb-8 flex items-center gap-3 px-2 pt-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] border border-white/[0.12] text-white font-mono font-bold text-sm shrink-0">
          S
        </div>

        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-none tracking-tight select-none truncate">
            Spadas Tech
          </h1>

          <div className="mt-1.5 flex items-center gap-2 font-mono">
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-300 font-medium">BETA</span>
            <span className="text-[9px] text-zinc-500">v0.9</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col space-y-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none transition-colors active:scale-[0.99] ${
                isActive
                  ? "bg-white/[0.10] text-white font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
