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
    triggerTactileHaptic("light");
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
      label: "Lens AR",
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
      aria-label="Native Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl md:hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] select-none"
    >
      <div className="flex items-center justify-between max-w-md mx-auto relative">
        {navItems.map(({ href, label, icon: Icon, isCenter, badge }) => {
          const active = isActiveLink(href);

          if (isCenter) {
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={handleNavClick}
                className="relative -top-4 flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-transform duration-75"
                aria-label="Open Spadas Lens AR Camera"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_24px_rgba(6,182,212,0.6)] border-2 border-cyan-300/60 transition-all ${
                    active ? "ring-4 ring-cyan-400/40 scale-105" : "group-hover:scale-105"
                  }`}
                >
                  <Camera className="h-7 w-7 text-white animate-pulse" />
                </div>
                <span className="hud-tab text-cyan-300 mt-1">
                  Lens AR
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
              className={`flex flex-1 flex-col items-center justify-center py-1 text-xs font-semibold transition-transform duration-75 active:scale-95 cursor-pointer min-h-[44px] ${
                active
                  ? "text-cyan-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 mb-1 transition-transform ${
                    active ? "scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : ""
                  }`}
                  aria-hidden="true"
                />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1 min-w-[15px] h-3.5 rounded-full bg-emerald-400 text-slate-950 text-[8.5px] font-mono font-black flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.8)] leading-none pointer-events-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`hud-tab mt-0.5 ${active ? "text-cyan-400" : "text-slate-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
