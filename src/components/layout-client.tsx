"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlignJustify, X, Sparkles } from "lucide-react";
import FocusLock from "react-focus-lock";
import MobileNav from "@/components/mobile-nav";
import OwnerAiStatusBanner from "@/components/owner-ai-status-banner";
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
  const publicPages = ["/", "/login", "/signup", "/privacy"];

  // Track mobile viewport to prevent aria-hidden and focus-trap on desktop sidebar
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (sidebarOpen && isMobile) {
      const firstLink = document.querySelector("nav a");
      if (firstLink instanceof HTMLElement) firstLink.focus();
      document.body.style.overflow = "hidden";
    } else {
      if (isMobile) {
        hamburgerButtonRef.current?.focus();
      }
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen, isMobile]);

  // User & Subscription state for sidebar
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isProUser, setIsProUser] = useState(false);
  const [isEbayConnected, setIsEbayConnected] = useState(false);

  useEffect(() => {
    async function loadUserAndSub() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          setUserEmail(user.email);

          // Check eBay connection via secure server-side endpoint
          const { data: { session } } = await supabase.auth.getSession();
          const authHeaders: Record<string, string> = {};
          if (session?.access_token) {
            authHeaders["Authorization"] = `Bearer ${session.access_token}`;
          }

          const mktRes = await fetch("/api/marketplaces/status", { headers: authHeaders }).catch(() => null);
          if (mktRes && mktRes.ok) {
            const mktData = await mktRes.json().catch(() => ({}));
            setIsEbayConnected(Boolean(mktData.isConnected));
          }

          // Pro check — resolved server-side only, no client-side email bypass
          const res = await fetch("/api/stripe/status", { headers: authHeaders }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.active || data.plan === "Pro") {
              setIsProUser(true);
            }
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

  // Streamlined Navigation items for sidebar (Spadas Studio added for direct multi-angle studio workflow)
  const navItems = [
    { href: "/lens", label: "🔮 Spadas Lens AR" },
    { href: "/studio", label: "📸 Spadas Studio" },
    { href: "/history", label: "📜 Scan History" },
    { href: "/dashboard", label: "🏠 Dashboard" },
    { href: "/listings", label: "📦 My Listings" },
    { href: "/generator", label: "🤖 AI Generator" },
    { href: "/calculator", label: "💰 Profit Calculator" },
    { href: "/settings", label: "⚙️ Settings" },
  ];

  // Determines if a link is active (including child routes)
  const isActiveLink = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Dynamic page titles for header
  const pageTitleMap: Record<string, string> = {
    "/lens": "Spadas Lens AR Sourcing",
    "/studio": "Spadas Snap Studio",
    "/snap": "Spadas Snap Studio",
    "/history": "Scan History Feed",
    "/dashboard": "Dashboard",
    "/listings": "My Listings",
    "/generator": "AI Generator",
    "/calculator": "Reseller Profit Calculator",
    "/settings": "Settings",
  };
  const pageTitle = pageTitleMap[pathname] || "SpadasTechnology";

  /**
   * Touch gesture handlers for swipe to open/close sidebar on mobile.
   */
  function handleTouchStart(e: React.TouchEvent) {
    // Only track edge swipe if starting from left edge (< 25px) or if sidebar is open
    const startX = e.touches[0].clientX;
    if (startX < 25 || sidebarOpen) {
      touchStartXRef.current = startX;
    } else {
      touchStartXRef.current = null;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;

    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartXRef.current;

    // Swipe right from left edge to open sidebar
    if (!sidebarOpen && touchStartXRef.current < 25 && diffX > 100) {
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
        aria-hidden={isMobile ? !sidebarOpen : true}
      />

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0 flex flex-col ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        aria-hidden={isMobile && !sidebarOpen ? true : undefined}
        aria-label="Main sidebar"
      >
        <FocusLock disabled={!isMobile || !sidebarOpen} className="flex-1 flex flex-col h-full">
          {/* Branding and close button */}
          <div className="p-6 border-b border-slate-800 relative">
            <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent select-none tracking-tight">⚡ Spadas AI</h1>
            <p className="mt-1 text-xs text-slate-400 select-none font-semibold">Billion-Dollar Reseller SaaS</p>

            {/* Close button only visible on mobile */}
            <button
              type="button"
              className="absolute top-4 right-4 md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition-colors"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation menu */}
          <nav aria-label="Main navigation" className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-xl min-h-[44px] px-4 py-3 text-xs font-bold transition-all focus:outline-none ${
                  isActiveLink(href)
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 text-cyan-300 font-black shadow-md"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                aria-current={isActiveLink(href) ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User info section */}
          <div className="p-4 border-t border-slate-800 mt-auto">
            <div className="rounded-2xl bg-slate-900 p-3.5 select-none border border-slate-800 space-y-1">
              <p className="text-xs font-black text-white truncate">
                👤 {userEmail || "Reseller Pro User"}
              </p>
              {isProUser ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-cyan-400">
                  <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                  Spadas Pro Enterprise
                </span>
              ) : (
                <p className="text-[11px] text-slate-400 font-semibold">Standard Reseller Account</p>
              )}
            </div>
          </div>
        </FocusLock>
      </aside>

      {/* Main content container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-950 text-white">
        {/* Owner Account AI Credits Health Banner (Only visible for deniedae@gmail.com) */}
        <OwnerAiStatusBanner />

        {/* Header (Hidden on mobile for /lens to provide native full-screen camera viewport) */}
        <header className={`bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between md:px-8 md:py-4 shadow-xl ${
          pathname === "/lens" ? "hidden md:flex" : "flex"
        }`}>
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              ref={hamburgerButtonRef}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-900 hover:text-white focus:outline-none transition-colors cursor-pointer"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <AlignJustify className="h-6 w-6" />
            </button>

            {/* Page title */}
            <h2 className="text-xl sm:text-2xl font-black text-white select-none tracking-tight">{pageTitle}</h2>
          </div>

          {/* SaaS Header Right Actions & Live Market Sync Status */}
          <div className="hidden sm:flex items-center gap-3">
            {isEbayConnected ? (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                title="eBay Account Connected - 1-Click Publishing Active"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>🛍️ eBay Connected</span>
              </Link>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                title="Click to Connect your eBay Seller Hub"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>⚡ Connect eBay</span>
              </Link>
            )}

            <Link
              href="/lens"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 text-xs font-black text-slate-950 shadow-md shadow-cyan-500/20 hover:scale-105 transition cursor-pointer active:scale-95"
            >
              📷 Open Camera AR
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 md:p-8 pb-32 md:pb-8">
          {children}
        </main>

        {/* Sticky Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
