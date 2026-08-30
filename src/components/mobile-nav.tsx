"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Camera,
  History,
  Settings,
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      icon: LayoutDashboard,
      isCenter: false,
    },
    {
      href: "/history",
      label: "History",
      icon: History,
      isCenter: false,
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
      href: "/settings",
      label: "Settings",
      icon: Settings,
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
        {navItems.map(({ href, label, icon: Icon, isCenter }) => {
          const active = isActiveLink(href);

          if (isCenter) {
            return (
              <Link
                key={href}
                href={href}
                onClick={triggerHaptic}
                className="relative -top-4 flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-transform"
                aria-label="Open Spadas Lens AR Camera"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_24px_rgba(6,182,212,0.6)] border-2 border-cyan-300/60 transition-all ${
                    active ? "ring-4 ring-cyan-400/40 scale-105" : "group-hover:scale-105"
                  }`}
                >
                  <Camera className="h-7 w-7 text-white animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-cyan-300 mt-1 tracking-tight">
                  Lens AR
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={triggerHaptic}
              className={`flex flex-1 flex-col items-center justify-center py-1 text-xs font-semibold transition-all active:scale-95 cursor-pointer min-h-[44px] ${
                active
                  ? "text-cyan-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`h-5 w-5 mb-1 transition-transform ${
                  active ? "scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : ""
                }`}
                aria-hidden="true"
              />
              <span className="truncate text-[10px] tracking-tight">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
