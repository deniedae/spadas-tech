"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "🏠 Dashboard" },
    { href: "/listings", label: "📦 Listings" },
    { href: "/analytics", label: "📈 Analytics" },
    { href: "/sourcing", label: "🎯 Sourcing" },  // Added sourcing link here
    { href: "/settings", label: "⚙️ Settings" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
          <span className="text-xl font-bold text-white select-none">S</span>
        </div>

        <div>
          <h1 className="text-xl font-bold leading-none select-none">Spadas AI</h1>

          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 select-none">
              BETA
            </span>

            <span className="text-xs text-gray-400 select-none">v0.9</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col space-y-1" aria-label="Main navigation">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                isActive ? "bg-blue-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
