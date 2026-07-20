"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-8">
        🚀 Spadas AI
      </h1>

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