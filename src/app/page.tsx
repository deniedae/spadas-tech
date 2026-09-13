import type { Metadata } from "next";
import Link from "next/link";
import LandingBeforeAfterDemo from "@/components/landing-before-after-demo";
import LandingFeatures from "@/components/landing-features";
import LandingPricing from "@/components/landing-pricing";
import { Scan, Download, ArrowRight } from "lucide-react";

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
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition">
              <Scan className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              Spadas Lens
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
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
              className="text-[13px] font-medium text-zinc-400 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/[0.04]"
            >
              Sign in
            </Link>
            <Link
              href="/lens"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-4 py-2 text-[13px] transition active:scale-95 shadow-sm min-h-[36px]"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-16 sm:pt-24 pb-8 px-4 text-center max-w-3xl mx-auto">
        {/* Audience & Outcome Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-[3.5rem] font-extrabold tracking-tight text-white leading-[1.1] mb-5">
          Turn a photo into a{" "}
          <span className="text-cyan-400">
            finished listing
          </span>{" "}
          in seconds
        </h1>

        {/* Reseller-Specific Subhead */}
        <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed mb-8">
          Built for resellers moving 20+ items a week on eBay, Depop, Poshmark and Facebook Marketplace.
        </p>

        {/* Primary CTA Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
          <Link
            href="/lens"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-7 py-3.5 text-sm transition active:scale-95 shadow-lg min-h-[48px]"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="/spadas-ai.apk"
            download="Spadas-AI.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white font-medium px-5 py-3.5 text-sm transition active:scale-95 min-h-[48px]"
          >
            <Download className="h-4 w-4" />
            Android APK
          </a>
        </div>

        {/* Trust Note */}
        <p className="text-xs text-zinc-500 mt-4">
          10 free scans daily — no card required
        </p>

        {/* ── Marketplace Logos Strip ─────────────────── */}
        <div className="mt-14 pt-8 border-t border-white/[0.06]">
          <p className="text-xs text-zinc-500 mb-4">
            Works with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-zinc-400">
            <span>
              e<span className="text-red-400">b</span><span className="text-amber-400">a</span><span className="text-blue-400">y</span>
            </span>
            <span>Depop</span>
            <span>Poshmark</span>
            <span>Facebook Marketplace</span>
            <span>Mercari</span>
          </div>
        </div>
      </section>

      {/* ── Demo Section ───────────────────── */}
      <LandingBeforeAfterDemo />

      {/* ── Features Section ──────────────────── */}
      <LandingFeatures />

      {/* ── Pricing Section ────────────────────── */}
      <LandingPricing />

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
