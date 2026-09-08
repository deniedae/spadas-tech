"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  AlignJustify,
  X,
  Sparkles,
  Scan,
  Layers,
  Camera,
  ShoppingBag,
  History,
  LayoutDashboard,
  Package,
  Calculator,
  Settings,
} from "lucide-react";
import FocusLock from "react-focus-lock";
import MobileNav from "@/components/mobile-nav";
import OwnerAiStatusBanner from "@/components/owner-ai-status-banner";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { resetGuestScanState } from "@/lib/guest-scan-tracker";
import { useHaulStore } from "@/lib/haul-store";

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
  const { haulCount } = useHaulStore();

  useEffect(() => {
    let isMounted = true;

    async function loadUserAndSub() {
      try {
        // Reliable non-blocking session check from Supabase client storage
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = session?.user;
        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user;
        }

        if (user?.email && isMounted) {
          setUserEmail(user.email);
          resetGuestScanState();

          const isOwner = isOwnerEmail(user.email);
          const hasMetadataPro = Boolean(
            user.app_metadata?.is_pro ||
            user.user_metadata?.is_pro ||
            user.app_metadata?.plan === "pro"
          );

          if (isOwner || hasMetadataPro) {
            setIsProUser(true);
          }

          // Check eBay connection and live Stripe status passing Bearer token
          const authHeaders: Record<string, string> = {};
          if (session?.access_token) {
            authHeaders["Authorization"] = `Bearer ${session.access_token}`;
          }

          const [mktRes, stripeRes] = await Promise.all([
            fetch("/api/marketplaces/status", { headers: authHeaders }).catch(() => null),
            fetch("/api/stripe/status", { headers: authHeaders }).catch(() => null),
          ]);

          if (isMounted) {
            if (mktRes && mktRes.ok) {
              const mktData = await mktRes.json().catch(() => ({}));
              setIsEbayConnected(Boolean(mktData.isConnected));
            }

            if (stripeRes && stripeRes.ok) {
              const stripeData = await stripeRes.json().catch(() => ({}));
              if (stripeData.active || stripeData.plan === "Pro" || isOwner) {
                setIsProUser(true);
              }
            }
          }
        }
      } catch {
        // silently fallback
      }
    }

    void loadUserAndSub();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        resetGuestScanState();
        if (
          isOwnerEmail(session.user.email) ||
          session.user.app_metadata?.is_pro ||
          session.user.user_metadata?.is_pro
        ) {
          setIsProUser(true);
        }
      } else {
        setUserEmail(null);
        setIsProUser(false);
        setIsEbayConnected(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg) {
          reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      }).catch(() => {});
    }
  }, []);

  // If on a public page, render children plainly
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Executive navigation hierarchy with precision SVG icons
  const navItems = [
    { href: "/lens", label: "Spadas Lens", icon: Scan, tag: "60 FPS" },
    { href: "/haul", label: "Spadas Haul", icon: ShoppingBag, tag: "Lot Batch" },
    { href: "/ironman", label: "Spatial Field HUD", icon: Layers, tag: "3D AR" },
    { href: "/studio", label: "Studio Intake", icon: Camera },
    { href: "/history", label: "Scan History", icon: History },
    { href: "/dashboard", label: "Portfolio", icon: LayoutDashboard },
    { href: "/listings", label: "Active Listings", icon: Package },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  // Determines if a link is active (including child routes)
  const isActiveLink = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Dynamic page titles for header
  const pageTitleMap: Record<string, string> = {
    "/lens": "Spadas Lens · Optical Sourcing",
    "/haul": "Spadas Haul · Lot Sourcing Batch",
    "/ironman": "Spatial Field HUD",
    "/studio": "Multi-Angle Studio Intake",
    "/snap": "Multi-Angle Studio Intake",
    "/history": "Scan History & Comps Feed",
    "/dashboard": "Portfolio Overview",
    "/listings": "Active Portfolio",
    "/generator": "AI Listing Studio",
    "/calculator": "Margin & Yield Models",
    "/settings": "System Settings",
  };
  const pageTitle = pageTitleMap[pathname] || "Spadas Lens";

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
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={isMobile ? !sidebarOpen : true}
      />

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#090C13] border-r border-white/[0.08] text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0 flex flex-col ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        aria-hidden={isMobile && !sidebarOpen ? true : undefined}
        aria-label="Main sidebar"
      >
        <FocusLock disabled={!isMobile || !sidebarOpen} className="flex-1 flex flex-col h-full">
          {/* Executive Branding */}
          <div className="p-5 pt-[max(1.5rem,calc(env(safe-area-inset-top)+1rem))] border-b border-white/[0.08] relative">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-indigo-500/20 border border-cyan-400/30 p-1.5 flex items-center justify-center shadow-inner shrink-0">
                <Image src="/icon-192.png" alt="Spadas Lens" width={24} height={24} className="rounded-lg object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-bold text-white tracking-tight truncate">Spadas Lens</h1>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase truncate mt-0.5">
                  Secondary Market OS
                </p>
              </div>
            </div>

            {/* Close button only visible on mobile */}
            <button
              type="button"
              className="absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] right-4 md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] focus:outline-none transition-colors cursor-pointer"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation menu */}
          <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon, tag }) => {
              const active = isActiveLink(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-between rounded-lg min-h-[40px] px-3 py-2 text-xs font-medium transition-all group focus:outline-none ${
                    active
                      ? "bg-white/[0.08] text-white font-semibold border-l-2 border-cyan-400 pl-[10px] shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                  }`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-cyan-400" : "text-zinc-400 group-hover:text-zinc-200"
                    }`} />
                    <span className="truncate">{label}</span>
                  </div>
                  {tag && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      active
                        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                        : "bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-300"
                    }`}>
                      {tag}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info section */}
          <div className="p-3 border-t border-white/[0.08] mt-auto">
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.06] flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
                {(userEmail || "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate">
                  {userEmail || "Operator Account"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[10px] text-zinc-400 font-medium truncate">
                    {isProUser ? "Enterprise Tier" : "Standard Operator"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FocusLock>
      </aside>

      {/* Main content container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#07090E] text-white">
        {/* Owner Account AI Credits Health Banner (Only visible for deniedae@gmail.com) */}
        <OwnerAiStatusBanner />

        {/* Header (Hidden on mobile for /lens to provide native full-screen camera viewport) */}
        <header className={`bg-[#090C13]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] pb-3 flex items-center justify-between md:px-8 md:py-3.5 shadow-sm ${
          pathname === "/lens" ? "hidden md:flex" : "flex"
        }`}>
          {/* Mobile hamburger & Title */}
          <div className="flex items-center gap-3">
            <button
              ref={hamburgerButtonRef}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white focus:outline-none transition-colors cursor-pointer"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <AlignJustify className="h-5 w-5" />
            </button>

            {/* Page title */}
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 select-none tracking-tight">{pageTitle}</h2>
          </div>

          {/* Header Right Actions & Live Market Sync Status */}
          <div className="hidden sm:flex items-center gap-3">
            {isEbayConnected ? (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition cursor-pointer"
                title="eBay Account Connected - 1-Click Publishing Active"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>eBay Synchronized</span>
              </Link>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/15 transition cursor-pointer"
                title="Click to Connect your eBay Seller Hub"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Connect eBay</span>
              </Link>
            )}

            <Link
              href="/haul"
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                pathname === "/haul"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              }`}
              title="Open Spadas Haul Lot Batch Manager & CSV Export"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Spadas Haul</span>
              {haulCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-200">
                  {haulCount}
                </span>
              )}
            </Link>

            <Link
              href="/lens"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white text-zinc-950 font-semibold px-3 text-xs hover:bg-zinc-200 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Scan className="h-3.5 w-3.5" />
              <span>Launch Lens AR</span>
            </Link>
          </div>
        </header>

        {/* Page content with safe-area padding when header is hidden on mobile */}
        <main className={`flex-1 p-3 sm:p-4 md:p-8 pb-32 md:pb-8 ${
          pathname === "/lens"
            ? "pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.25rem))] md:pt-8"
            : ""
        }`}>
          {children}
        </main>

        {/* Sticky Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
