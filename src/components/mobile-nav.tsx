"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Camera,
  History,
  ShoppingBag,
} from "lucide-react";
import { useHaulStore } from "@/lib/haul-store";
import { triggerTactileHaptic } from "@/lib/android-bridge";

export default function MobileNav() {
  const pathname = usePathname();
  const { haulCount } = useHaulStore();

  const handleNavClick = () => {
    triggerTactileHaptic("tap");
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      icon: LayoutDashboard,
      isCenter: false,
    },
    {
      href: "/haul",
      label: "Haul",
      icon: ShoppingBag,
      isCenter: false,
      badge: haulCount,
    },
    {
      href: "/lens",
      label: "Scan",
      icon: Camera,
      isCenter: true,
    },
    {
      href: "/listings",
      label: "Listings",
      icon: Package,
      isCenter: false,
    },
    {
      href: "/history",
      label: "History",
      icon: History,
      isCenter: false,
    },
  ];

  const isActiveLink = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] glass-nav md:hidden px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 select-none"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {navItems.map(({ href, label, icon: Icon, isCenter, badge }) => {
          const active = isActiveLink(href);

          if (isCenter) {
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={handleNavClick}
                className="relative -top-3 flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-transform duration-75"
                aria-label="Open Spadas Lens camera"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-transform ${
                    active ? "scale-105" : "group-hover:scale-105"
                  }`}
                >
                  <Camera className="h-5.5 w-5.5 text-white" />
                </div>
                <span className={`text-[10px] font-semibold mt-1 ${active ? "text-cyan-400" : "text-zinc-400"}`}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onClick={handleNavClick}
              className={`flex flex-1 flex-col items-center justify-center py-1.5 transition-transform duration-75 active:scale-95 cursor-pointer min-h-[44px] ${
                active
                  ? "text-cyan-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 mb-0.5 ${
                    active ? "text-cyan-400" : ""
                  }`}
                  aria-hidden="true"
                />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1 min-w-[14px] h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-mono font-bold flex items-center justify-center leading-none pointer-events-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 ${active ? "text-cyan-400" : "text-zinc-500"}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-[max(0.25rem,env(safe-area-inset-bottom))] h-0.5 w-4 rounded-full bg-cyan-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
