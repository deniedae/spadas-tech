"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
  Settings,
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/listings",
      label: "Listings",
      icon: Package,
    },
    {
      href: "/generator",
      label: "AI Generator",
      icon: Sparkles,
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: TrendingUp,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const isActiveLink = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden px-2 py-1 shadow-lg"
    >
      <div className="flex items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActiveLink(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium transition-colors min-h-[48px] ${
                active
                  ? "text-blue-600 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`h-5 w-5 mb-1 transition-transform ${
                  active ? "scale-110 text-blue-600" : ""
                }`}
                aria-hidden="true"
              />
              <span className="truncate max-w-[64px] text-[10px] sm:text-xs">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
