"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const publicPages = ["/", "/login", "/signup"];

  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        <div className="p-8 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-blue-600">
            ⚡ SpadasTechnology
          </h1>

          <p className="mt-2 text-gray-500">
            AI Reseller Platform
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block rounded-xl px-4 py-3 hover:bg-blue-50">
            🏠 Dashboard
          </Link>

          <Link href="/listings" className="block rounded-xl px-4 py-3 hover:bg-blue-50">
            📦 Listings
          </Link>

          <Link href="/generator" className="block rounded-xl px-4 py-3 hover:bg-blue-50">
            🤖 AI Generator
          </Link>

          <Link href="/analytics" className="block rounded-xl px-4 py-3 hover:bg-blue-50">
            📈 Analytics
          </Link>

          <Link href="/settings" className="block rounded-xl px-4 py-3 hover:bg-blue-50">
            ⚙️ Settings
          </Link>
        </nav>

        <div className="p-5 border-t border-gray-200">
          <div className="rounded-xl bg-gray-100 p-4">
            <p className="font-semibold">👤 User</p>
            <p className="text-sm text-gray-500">Free Plan</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}