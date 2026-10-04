import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Scan, Download, ArrowRight, Zap } from "lucide-react";

const MuxScannerShowcase = dynamic(() => import("@/components/mux-scanner-showcase"), {
  ssr: true,
});
const LandingBeforeAfterDemo = dynamic(() => import("@/components/landing-before-after-demo"), {
  ssr: true,
});
const LandingFeatures = dynamic(() => import("@/components/landing-features"), {
  ssr: true,
});
const LandingPricing = dynamic(() => import("@/components/landing-pricing"), {
  ssr: true,
});

import { HeroScannerSimulator } from "@/components/hero-scanner-simulator";
import { MobileFirstLaunchRedirect } from "@/components/mobile-first-launch-redirect";

export const metadata: Metadata = {
  title: "Reseller Scanner - Spadas Lens | Instant Barcode & Profit Calculator",
  description:
    "Scan barcodes and thrift finds in 0.5s. Auto-calculate eBay sold comps, platform fees, and net profit before you buy. 10 free scans daily.",
  openGraph: {
    title: "Reseller Scanner - Spadas Lens | Instant Barcode & Profit Calculator",
    description:
      "Scan barcodes and thrift finds in 0.5s. Auto-calculate eBay sold comps, platform fees, and net profit before you buy. 10 free scans daily.",
    url: "https://spadas.ai",
    siteName: "Spadas Lens",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reseller Scanner - Spadas Lens | Instant Barcode & Profit Calculator",
    description:
      "Scan barcodes and thrift finds in 0.5s. Auto-calculate eBay sold comps, platform fees, and net profit before you buy. 10 free scans daily.",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#06080F] text-zinc-100 pb-20 overflow-x-hidden relative">
      <Suspense fallback={null}>
        <MobileFirstLaunchRedirect />
      </Suspense>

      {/* Atmospheric Ambient Glow Backdrop */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-cyan-500/15 via-emerald-500/5 to-transparent blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-80 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#06080F]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center group-hover:border-cyan-400 transition shadow-lg shadow-cyan-950/50">
              <Scan className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
                Spadas Lens
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider mt-0.5">
                Reseller Scanner
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            <a href="#simulator" className="hover:text-white transition flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live Simulator
            </a>
            <a href="#demo-video" className="hover:text-white transition">
              Video Showcase
            </a>
            <a href="#demo" className="hover:text-white transition">
              Interactive Comps
            </a>
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="text-[13px] font-bold text-zinc-400 hover:text-white transition px-3 py-2 rounded-xl hover:bg-white/[0.05]"
            >
              Sign in
            </Link>
            <Link
              href="/lens"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 font-black px-4 py-2 text-[13px] transition-all active:scale-95 shadow-md shadow-cyan-950/40 min-h-[38px] cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              Open Scanner
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-16 sm:pt-24 pb-8 px-4 text-center max-w-4xl mx-auto relative z-10">
        
        {/* Telemetry Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6 backdrop-blur-md shadow-lg shadow-cyan-950/40">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          LIVE AR OPTICAL SCANNER V4.2 · 41.9K ITEMS AUDITED
        </div>

        {/* High-Impact Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.06] mb-6 max-w-4xl mx-auto">
          Turn Any Thrift Find Into{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Pure Profit
          </span>{" "}
          in 0.5 Seconds
        </h1>

        {/* Reseller-Specific Subhead */}
        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Point your camera at thrift shelves, shoe tags, or barcodes. Spadas instantly filters fake comps, auto-calculates platform fees &amp; postage, and reveals your exact net profit before you spend a cent.
        </p>

        {/* Primary CTA Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/lens"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 font-black px-8 py-4 text-sm transition-all duration-150 active:scale-95 shadow-xl shadow-cyan-950/60 min-h-[52px] cursor-pointer"
          >
            <Scan className="h-4 w-4" />
            Launch Scanner Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="/spadas-ai.apk"
            download="Spadas-AI.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 hover:border-white/20 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold px-6 py-4 text-sm transition-all active:scale-95 min-h-[52px] shadow-lg backdrop-blur-md"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            Android APK
          </a>
        </div>

        {/* Trust Note */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-400 mt-6 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            10 free scans daily
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Zero credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Real eBay &amp; Depop sold data
          </span>
        </div>

        {/* ── Interactive Live AR Simulator ─────────── */}
        <div id="simulator">
          <HeroScannerSimulator />
        </div>

        {/* ── Marketplace Logos Strip ─────────────────── */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <p className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-4">
            Direct Sold Comps Engine For
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] font-bold text-zinc-400">
            <span className="hover:text-white transition">
              e<span className="text-red-400">b</span><span className="text-amber-400">a</span><span className="text-blue-400">y</span>
            </span>
            <span className="hover:text-white transition">Depop</span>
            <span className="hover:text-white transition">Poshmark</span>
            <span className="hover:text-white transition">Facebook Marketplace</span>
            <span className="hover:text-white transition">Mercari</span>
          </div>
        </div>
      </section>

      {/* ── Mux Video Demo Section ─────────── */}
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-16 min-h-[460px] flex items-center justify-center">
            <div className="w-full aspect-video rounded-2xl bg-zinc-950/60 border border-white/[0.08] animate-pulse" />
          </div>
        }
      >
        <MuxScannerShowcase />
      </Suspense>

      {/* ── Demo Section ───────────────────── */}
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-12 min-h-[420px] flex items-center justify-center">
            <div className="w-full h-80 rounded-2xl bg-zinc-950/60 border border-white/[0.08] animate-pulse" />
          </div>
        }
      >
        <LandingBeforeAfterDemo />
      </Suspense>

      {/* ── Features Section ──────────────────── */}
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-16 min-h-[380px] grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-zinc-950/60 border border-white/[0.08] animate-pulse" />
            ))}
          </div>
        }
      >
        <LandingFeatures />
      </Suspense>

      {/* ── Pricing Section ────────────────────── */}
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-16 min-h-[440px] grid md:grid-cols-2 gap-6">
            <div className="h-96 rounded-2xl bg-zinc-950/60 border border-white/[0.08] animate-pulse" />
            <div className="h-96 rounded-2xl bg-zinc-950/60 border border-white/[0.08] animate-pulse" />
          </div>
        }
      >
        <LandingPricing />
      </Suspense>

      {/* ── Final CTA ──────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 my-16">
        <div className="rounded-2xl border border-white/[0.1] bg-zinc-950 p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to turn photos into finished listings?
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Scan your first item in under 2 seconds. No account or credit card required.
          </p>
          <div className="pt-2">
            <Link
              href="/lens"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-7 py-3.5 text-sm transition active:scale-95 shadow-lg min-h-[48px]"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-xs text-zinc-500 pt-1">
            10 free scans daily — no card required
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-4 mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4 text-zinc-500" />
          <span className="font-medium text-zinc-400">Spadas Lens</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        
        <div className="flex items-center gap-5">
          <a href="#demo" className="hover:text-zinc-300 transition">Demo</a>
          <a href="#features" className="hover:text-zinc-300 transition">Features</a>
          <a href="#pricing" className="hover:text-zinc-300 transition">Pricing</a>
          <Link href="/privacy" className="hover:text-zinc-300 transition">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition">Terms</Link>
          <a
            href="/spadas-ai.apk"
            download="Spadas-AI.apk"
            className="hover:text-zinc-300 transition"
          >
            APK v1.2.1
          </a>
        </div>
      </footer>
    </main>
  );
}
