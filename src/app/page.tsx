import type { Metadata } from "next";
import Link from "next/link";
import LandingBeforeAfterDemo from "@/components/landing-before-after-demo";
import LandingFeatures from "@/components/landing-features";
import LandingPricing from "@/components/landing-pricing";
import { Scan, Download, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Spadas Lens — Turn Photos into Finished Reseller Listings in Seconds",
  description:
    "Built for resellers moving 20+ items a week on eBay, Depop, Poshmark, and Facebook Marketplace. Turn a photo into a ready-to-post listing in seconds. 10 free scans daily.",
  openGraph: {
    title: "Spadas Lens — Turn Photos into Finished Reseller Listings in Seconds",
    description:
      "Built for resellers moving 20+ items a week on eBay, Depop, Poshmark, and Facebook Marketplace. Turn a photo into a ready-to-post listing in seconds. 10 free scans daily.",
    url: "https://spadas-tech.vercel.app",
    siteName: "Spadas Lens",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spadas Lens — Turn Photos into Finished Reseller Listings in Seconds",
    description:
      "Built for resellers moving 20+ items a week on eBay, Depop, Poshmark, and Facebook Marketplace. Turn a photo into a ready-to-post listing in seconds. 10 free scans daily.",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090E] text-zinc-100 pb-20 overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#07090E]/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 max-w-5xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/40 transition">
              <Scan className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              Spadas Lens
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#demo" className="hover:text-white transition">
              Demo
            </a>
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-400 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/[0.04]"
            >
              Sign in
            </Link>
            <Link
              href="/lens"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2 text-xs transition active:scale-95 shadow-sm min-h-[38px]"
            >
              <Scan className="h-3.5 w-3.5" />
              <span>Start free</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-12 sm:pt-20 pb-8 px-4 text-center max-w-3xl mx-auto">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/[0.08] font-mono text-[11px] text-zinc-300 mb-6 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live eBay sold comps &middot; AI listing copywriter &middot; 10 free scans daily</span>
        </div>

        {/* Audience & Outcome Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.12] mb-5">
          Turn a photo into a{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            finished listing in seconds
          </span>
        </h1>

        {/* Reseller-Specific Subhead */}
        <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed mb-8">
          Built for resellers moving 20+ items a week on eBay, Depop, Poshmark and Facebook Marketplace.
        </p>

        {/* Primary CTA Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <Link
            href="/lens"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-black px-8 py-4 text-sm transition active:scale-95 shadow-xl shadow-white/10 min-h-[48px]"
          >
            <Scan className="h-4 w-4" />
            <span>Start free</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="/spadas-ai.apk"
            download="Spadas-AI.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white font-semibold px-5 py-4 text-sm transition active:scale-95 min-h-[48px]"
          >
            <Download className="h-4 w-4" />
            <span>Android APK</span>
          </a>
        </div>

        {/* One-Line Trust/Status Note directly under CTA */}
        <p className="text-xs font-mono text-zinc-400 mt-3.5">
          10 free scans daily &mdash; no card required
        </p>

        {/* ── "Works with" Marketplace Badges Strip ─────────────────── */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400 block mb-3.5">
            Works with
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-semibold">
            {/* eBay */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-white">
              <span className="font-extrabold tracking-tight">
                e<span className="text-red-500">b</span><span className="text-amber-500">a</span><span className="text-blue-500">y</span>
              </span>
            </div>

            {/* Depop */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-white">
              <span className="h-2 w-2 rounded-full bg-[#FF2300]" />
              <span className="font-extrabold">Depop</span>
            </div>

            {/* Poshmark */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-white">
              <span className="h-2 w-2 rounded-full bg-[#8A1A24]" />
              <span className="font-bold">Poshmark</span>
            </div>

            {/* Facebook Marketplace */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-white">
              <span className="h-2 w-2 rounded-full bg-[#1877F2]" />
              <span className="font-bold">Facebook Marketplace</span>
            </div>

            {/* Mercari */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-white">
              <span className="h-2 w-2 rounded-full bg-[#4D65FF]" />
              <span className="font-bold">Mercari</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo Section (new, most important) ───────────────────── */}
      <LandingBeforeAfterDemo />

      {/* ── Features Section (Workflow-focused) ──────────────────── */}
      <LandingFeatures />

      {/* ── Pricing Section (Free & Pro tiers) ────────────────────── */}
      <LandingPricing />

      {/* ── Final High-Converting CTA Strip ──────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 my-16">
        <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-r from-zinc-950 via-[#0C101A] to-zinc-950 p-8 sm:p-12 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1 text-xs font-mono font-bold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Instant Optical Recognition
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Ready to turn photos into finished listings?
          </h2>
          <p className="text-sm text-zinc-300 max-w-md mx-auto">
            Scan your first item in under 2 seconds. No account or credit card required to start.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/lens"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-black px-8 py-4 text-sm transition active:scale-95 shadow-xl shadow-white/10 min-h-[48px]"
            >
              <Scan className="h-4 w-4" />
              <span>Start free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-xs font-mono text-zinc-400 pt-1">
            10 free scans daily &mdash; no card required
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-4 mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4 text-cyan-400" />
          <span className="font-bold text-zinc-200">Spadas Lens</span>
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
            className="text-emerald-400 hover:text-emerald-300 font-bold transition"
          >
            APK v1.2.1
          </a>
        </div>
      </footer>
    </main>
  );
}
