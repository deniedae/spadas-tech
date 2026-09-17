"use client";

import React, { useState, useEffect } from "react";
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
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const checkOpen = () => {
      const open =
        document.body.hasAttribute("data-copilot-open") ||
        document.body.classList.contains("copilot-drawer-open");
      setIsCopilotOpen(open);
    };

    checkOpen();
    const observer = new MutationObserver(checkOpen);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-copilot-open", "class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleNavClick = () => {
    triggerTactileHaptic("tap");
  };

  if (isCopilotOpen) return null;

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

  const activeIndex = navItems.findIndex((item) => isActiveLink(item.href));

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] glass-nav md:hidden px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 select-none"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Sliding active indicator (150ms smooth transition) */}
        {activeIndex >= 0 && (
          <div
            className="absolute bottom-[max(0.25rem,env(safe-area-inset-bottom))] h-0.5 w-5 rounded-full bg-white/90 transition-all duration-150 ease-out pointer-events-none"
            style={{
              left: `calc(${(activeIndex + 0.5) * 20}% - 10px)`,
              opacity: activeIndex === 2 ? 0 : 1,
            }}
          />
        )}

        {navItems.map(({ href, label, icon: Icon, isCenter, badge }) => {
          const active = isActiveLink(href);

          if (isCenter) {
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={handleNavClick}
                className="relative -top-3.5 flex flex-1 flex-col items-center justify-center cursor-pointer group active:scale-95 transition-transform duration-75 min-h-[48px]"
                aria-label="Open Spadas Lens camera"
              >
                <div
                  className={`flex h-13 w-13 items-center justify-center rounded-full transition-all duration-200 relative ${
                    active
                      ? "bg-gradient-to-b from-white to-zinc-200 text-zinc-950 shadow-[0_0_24px_rgba(6,182,212,0.45),0_4px_12px_rgba(0,0,0,0.5)] ring-4 ring-cyan-500/30 scale-105"
                      : "bg-gradient-to-b from-[#1E2330] to-[#12151E] text-white border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:scale-105 group-hover:border-white/25"
                  }`}
                >
                  <Camera className={`h-6 w-6 transition-colors ${active ? "text-zinc-950" : "text-white"}`} />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                </div>
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
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 mb-0.5 ${
                    active ? "text-white" : ""
                  }`}
                  aria-hidden="true"
                />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1 min-w-[14px] h-3.5 rounded-full bg-emerald-500 text-slate-950 text-[8px] font-mono font-black flex items-center justify-center leading-none pointer-events-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 ${active ? "text-white font-bold" : "text-zinc-500"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
