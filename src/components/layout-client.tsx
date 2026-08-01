"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlignJustify, X } from "lucide-react";
import FocusLock from "react-focus-lock";

/**
 * The main client layout component that wraps the app's pages.
 * 
 * It includes a responsive sidebar with mobile toggle/swipe,
 * dynamic header titles, and accessible navigation.
 */
export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Sidebar open/close state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ref for hamburger button to return focus after closing sidebar
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  
  // Ref and state for touch swipe gestures
  const touchStartXRef = useRef<number | null>(null);

  // Pages that don't show sidebar layout (public pages)
  const publicPages = ["/", "/login", "/signup"];

  // If on a public page, render children plainly
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Navigation items for sidebar
  const navItems = [
    { href: "/dashboard", label: "🏠 Dashboard" },
    { href: "/listings", label: "📦 Listings" },
    { href: "/generator", label: "🤖 AI Generator" },
    { href: "/analytics", label: "📈 Analytics" },
    { href: "/settings", label: "⚙️ Settings" },
  ];

  // Determines if a link is active (including child routes)
  const isActiveLink = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Dynamic page titles for header
  const pageTitleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/listings": "My Listings",
    "/generator": "AI Generator",
    "/analytics": "Analytics",
    "/settings": "Settings",
  };
  const pageTitle = pageTitleMap[pathname] || "SpadasTechnology";

  /**
   * Locks body scroll when sidebar is open, manages focus trapping and restoration.
   */
  useEffect(() => {
    if (sidebarOpen) {
      const firstLink = document.querySelector("nav a");
      if (firstLink instanceof HTMLElement) firstLink.focus();
      document.body.style.overflow = "hidden";
    } else {
      hamburgerButtonRef.current?.focus();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  /**
   * Touch gesture handlers for swipe to open/close sidebar on mobile.
   */
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;

    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartXRef.current;

    // Swipe right from left edge to open sidebar
    if (!sidebarOpen && touchStartXRef.current < 50 && diffX > 100) {
      setSidebarOpen(true);
      touchStartXRef.current = null;
    }

    // Swipe left to close sidebar when open
    if (sidebarOpen && diffX < -100) {
      setSidebarOpen(false);
      touchStartXRef.current = null;
    }
  }

  function handleTouchEnd() {
    touchStartXRef.current = null;
  }

  return (
    <div
      className="min-h-screen flex"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay beneath sidebar on mobile */}
      <div
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSidebarOpen(false);
        }}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 md:w-72 lg:w-80 bg-white rounded-r-3xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <FocusLock disabled={!sidebarOpen}>
          {/* Branding and close button */}
          <div className="p-8 border-b border-gray-200 relative">
            <h1 className="text-3xl font-bold text-blue-600 select-none">⚡ SpadasTechnology</h1>
            <p className="mt-2 text-gray-500 select-none">AI Reseller Platform</p>

            {/* Close button only visible on mobile */}
            <button
              type="button"
              className="absolute top-4 right-4 md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation menu */}
          <nav aria-label="Main navigation" className="flex-1 p-4 space-y-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-xl min-h-[44px] px-4 py-3 text-gray-700 transition-transform duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isActiveLink(href)
                    ? "bg-blue-100 font-semibold text-blue-700 scale-105 shadow"
                    : "hover:bg-blue-50 hover:scale-105"
                }`}
                aria-current={isActiveLink(href) ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User info section */}
          <div className="p-5 border-t border-gray-200">
            <div className="rounded-xl bg-gray-100 p-4 select-none">
              <p className="text-sm font-semibold">👤 User</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </div>
        </FocusLock>
      </aside>

      {/* Main content container */}
      <div className="flex-1 flex flex-col md:pl-72 lg:pl-80 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:px-8 md:py-5 shadow-sm">
          {/* Mobile hamburger */}
          <button
            ref={hamburgerButtonRef}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <AlignJustify className="h-6 w-6" />
          </button>

          {/* Page title */}
          <h2 className="text-xl sm:text-2xl font-bold select-none">{pageTitle}</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
