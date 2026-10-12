import Link from "next/link";
import { Scan, Zap } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/site-url";
import { OpenScannerLink } from "@/components/open-scanner-link";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 bg-[#06080F]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-xl">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center group-hover:border-cyan-400 transition shadow-lg shadow-cyan-950/50">
            <Scan className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
              {BRAND_CONFIG.name}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider mt-0.5">
              Resale Scanner
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav aria-label="Public navigation" className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
          <Link href="/#valuation" className="hover:text-white transition focus:outline-none focus:text-white">
            Valuation Demo
          </Link>
          <Link href="/#features" className="hover:text-white transition focus:outline-none focus:text-white">
            Features
          </Link>
          <Link href="/#pricing" className="hover:text-white transition focus:outline-none focus:text-white">
            Pricing
          </Link>
          <Link href="/press" className="hover:text-white transition focus:outline-none focus:text-white">
            Press Kit
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="text-[13px] font-bold text-zinc-400 hover:text-white transition px-3 py-2 rounded-xl hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-zinc-600"
          >
            Sign in
          </Link>
          <OpenScannerLink
            href="/lens"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-zinc-950 font-black px-4 py-2 text-[13px] transition-all active:scale-95 shadow-md shadow-cyan-950/40 min-h-[38px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            <Zap className="h-3.5 w-3.5" />
            Open Scanner
          </OpenScannerLink>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="max-w-6xl mx-auto px-4 mt-20 pt-8 pb-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
      <div className="flex items-center gap-2">
        <Scan className="h-4 w-4 text-zinc-500" />
        <span className="font-medium text-zinc-400">{BRAND_CONFIG.productName}</span>
        <span>&copy; {new Date().getFullYear()} {BRAND_CONFIG.legalEntity}</span>
      </div>

      <nav aria-label="Legal and support links" className="flex flex-wrap items-center justify-center gap-5">
        <Link href="/press" className="hover:text-zinc-300 transition">
          Press Kit
        </Link>
        <Link href="/privacy" className="hover:text-zinc-300 transition">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-zinc-300 transition">
          Terms of Service
        </Link>
        <a href={`mailto:${BRAND_CONFIG.contactEmail}`} className="hover:text-zinc-300 transition">
          Support ({BRAND_CONFIG.contactEmail})
        </a>
        <a
          href={BRAND_CONFIG.playStoreUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-zinc-300 transition font-medium text-cyan-400"
        >
          Google Play Store
        </a>
      </nav>
    </footer>
  );
}
