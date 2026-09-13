"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "🏠 Dashboard" },
    { href: "/lens", label: "📷 Spadas Lens AR" },
    { href: "/history", label: "📜 Scan History" },
    { href: "/listings", label: "📦 Listings" },
    { href: "/analytics", label: "📈 Analytics" },
    { href: "/sourcing", label: "🎯 Sourcing" },
    { href: "/settings", label: "⚙️ Settings" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#030305] border-r border-white/[0.06] text-white p-4 flex flex-col">
      {/* Wordmark */}
      <div className="mb-8 flex items-center gap-3 px-2 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 shadow-[0_0_16px_rgba(0,242,254,0.15)] shrink-0">
          <span className="text-base font-black text-[#00F2FE] select-none">S</span>
        </div>

        <div className="min-w-0">
          <h1 className="text-sm font-black text-white leading-none tracking-tight select-none truncate">
            Spadas Tech
          </h1>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="badge-info">BETA</span>
            <span className="hud-label" style={{ color: "rgba(255,255,255,0.2)" }}>v0.9</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col space-y-0.5" aria-label="Main navigation">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none transition-all duration-100 active:scale-[0.98] ${
                isActive
                  ? "bg-[#00F2FE]/8 text-[#00F2FE]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active left-edge indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-[#00F2FE] shadow-[0_0_8px_rgba(0,242,254,0.8)]"
                  aria-hidden="true"
                />
              )}
              <span className="pl-2">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
