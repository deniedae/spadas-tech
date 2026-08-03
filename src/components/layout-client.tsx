"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlignJustify, X, Sparkles } from "lucide-react";
import FocusLock from "react-focus-lock";
import MobileNav from "@/components/mobile-nav";
import { supabase } from "@/app/lib/supabase";

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

  // User & Subscription state for sidebar
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    async function loadUserAndSub() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          setUserEmail(user.email);
          if (user.email.toLowerCase() === "deniedae@gmail.com") {
            setIsProUser(true);
            return;
          }
        }

        const res = await fetch("/api/stripe/status");
        if (res.ok) {
          const data = await res.json();
          if (data.active || data.plan === "Pro") {
            setIsProUser(true);
          }
        }
      } catch {
        // silently fallback
      }
    }
    void loadUserAndSub();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // If on a public page, render children plainly
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Navigation items for sidebar
  const navItems = [
    { href: "/dashboard", label: "🏠 Dashboard" },
    { href: "/lens", label: "🔮 Spadas Lens AR" },
    { href: "/listings", label: "📦 Listings" },
    { href: "/generator", label: "🤖 AI Generator" },
    { href: "/velocity", label: "⚡ AI Velocity & Bundles" },
    { href: "/analytics", label: "📈 Analytics" },
    { href: "/settings", label: "⚙️ Settings" },
  ];

  // Determines if a link is active (including child routes)
  const isActiveLink = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Dynamic page titles for header
  const pageTitleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/lens": "Spadas Lens AR Sourcing",
    "/listings": "My Listings",
    "/generator": "AI Generator",
    "/velocity": "AI Reseller Velocity Matrix",
    "/analytics": "Analytics",
    "/settings": "Settings",
  };
  const pageTitle = pageTitleMap[pathname] || "SpadasTechnology";

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0 flex flex-col ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <FocusLock disabled={!sidebarOpen} className="flex-1 flex flex-col h-full">
          {/* Branding and close button */}
          <div className="p-6 border-b border-gray-200 relative">
            <h1 className="text-2xl font-bold text-blue-600 select-none">⚡ SpadasTechnology</h1>
            <p className="mt-1 text-xs text-gray-500 select-none">AI Reseller Platform</p>

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
          <nav aria-label="Main navigation" className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-xl min-h-[44px] px-4 py-3 text-sm text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isActiveLink(href)
                    ? "bg-blue-50 font-semibold text-blue-700 shadow-sm"
                    : "hover:bg-gray-100"
                }`}
                aria-current={isActiveLink(href) ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User info section */}
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="rounded-xl bg-gray-50 p-3 select-none border border-gray-100 space-y-0.5">
              <p className="text-xs font-semibold text-gray-900 truncate">
                👤 {userEmail || "User Account"}
              </p>
              {isProUser ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-500">
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  Spadas Pro (Paid Active)
                </span>
              ) : (
                <p className="text-[11px] text-gray-500">Free Beta Plan</p>
              )}
            </div>
          </div>
        </FocusLock>
      </aside>

      {/* Main content container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
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
        <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">{children}</main>

        {/* Sticky Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
