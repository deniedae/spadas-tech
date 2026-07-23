"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white p-6">
   <div className="mb-8 flex items-center gap-3">
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
    <span className="text-xl font-bold text-white">S</span>
  </div>

  <div>
    <h1 className="text-xl font-bold leading-none">
      Spadas AI
    </h1>

    <div className="mt-1 flex items-center gap-2">
      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
        BETA
      </span>

      <span className="text-xs text-gray-400">
        v0.9
      </span>
    </div>
  </div>
</div>

      <nav className="space-y-3">
        <Link
          href="/dashboard"
          className="block rounded-lg p-3 hover:bg-gray-700"
        >
          🏠 Dashboard
        </Link>

        <Link
          href="/listings"
          className="block rounded-lg p-3 hover:bg-gray-700"
        >
          📦 Listings
        </Link>

        <Link
          href="/analytics"
          className="block rounded-lg p-3 hover:bg-gray-700"
        >
          📈 Analytics
        </Link>

        <Link
          href="/settings"
          className="block rounded-lg p-3 hover:bg-gray-700"
        >
          ⚙️ Settings
        </Link>
      </nav>
    </aside>
  );
}