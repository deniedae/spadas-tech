import Link from "next/link";
import LandingInteractiveDemo from "@/components/landing-interactive-demo";
import LandingProductTabs from "@/components/landing-product-tabs";
import { Scan, Download, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090E] text-zinc-100 pb-20">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/40 transition">
            <Scan className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Spadas Lens</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-xs text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            Sign in
          </Link>
          <Link
            href="/lens"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-3.5 py-1.5 text-xs transition active:scale-95"
          >
            <Scan className="h-3.5 w-3.5" />
            Try it free
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-14 pb-4 px-5 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/[0.07] font-mono text-[11px] text-zinc-400 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live eBay sold comps &middot; 60 FPS &middot; No sign-up needed
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08] mb-5">
          Point. Scan.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Know what it&apos;s worth.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed mb-8">
          Spadas Lens uses your camera to identify thrift items in real time,
          pull live eBay sold prices, and publish listings in one tap.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/lens"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-7 py-3.5 text-sm transition active:scale-95 shadow-md"
          >
            <Scan className="h-4 w-4" />
            Open Camera Scanner
          </Link>
          <a
            href="/spadas-ai.apk"
            download="Spadas-AI.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium px-5 py-3.5 text-sm transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            Android APK
          </a>
        </div>
      </section>

      {/* ── Interactive Demo (the star) ───────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        <LandingInteractiveDemo />
      </div>

      {/* ── Product Tabs ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 border-t border-white/[0.06] pt-4">
        <LandingProductTabs />
      </div>

      {/* ── Final CTA strip ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 mt-8">
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-6 py-10 text-center">
          <p className="text-xl sm:text-2xl font-bold text-white mb-2">
            Ready to scan your first item?
          </p>
          <p className="text-sm text-zinc-400 mb-6">
            No account needed. Open the camera and go.
          </p>
          <Link
            href="/lens"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white font-bold px-7 py-3 text-sm transition active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            Launch Lens AR
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-5 mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
        <span>Spadas Lens &copy; {new Date().getFullYear()}</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-zinc-400 transition">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-400 transition">Terms</Link>
          <a href="/spadas-ai.apk" download="Spadas-AI.apk" className="text-emerald-500 hover:text-emerald-400 font-semibold transition">
            APK v1.2.1
          </a>
        </div>
      </footer>
    </main>
  );
}
