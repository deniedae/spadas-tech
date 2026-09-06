import Link from "next/link";
import LandingInteractiveDemo from "@/components/landing-interactive-demo";
import LandingCalculator from "@/components/landing-calculator";
import LandingTestimonialsFaq from "@/components/landing-testimonials-faq";
import LandingProductTabs from "@/components/landing-product-tabs";
import {
  Camera,
  Download,
  ArrowRight,
  Crosshair,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Flame,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090A0F] text-zinc-100 select-none pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Top Bar - Industrial Field Equipment Header */}
        <nav className="flex items-center justify-between py-4 border-b border-zinc-800/80">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316] text-[#090A0F] font-black text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              SP
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white leading-none">
                SPADAS<span className="text-[#F97316]">.AI</span>
              </span>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                Field Terminal v2.6
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-mono font-bold text-zinc-400 hover:text-white transition px-3 py-2"
            >
              [LOG IN]
            </Link>
            <Link
              href="/lens"
              className="btn-primary text-xs font-black px-4 h-9"
            >
              <span>LAUNCH LENS AR</span>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Telemetry Status Line */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#12151E] border border-zinc-800 font-mono text-[11px] text-zinc-400 font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>LENS VISION ACTIVE // 60 FPS CAM CALIBRATED</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">AU MARKETPLACE COMPS</span>
            </div>

            {/* Direct Field Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Instant Resale Margin Scanner.
            </h1>

            {/* Direct Field Copy */}
            <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
              Scan thrift racks or junkyard shelves. See 90-day sold comps before you buy.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Link
                href="/lens"
                className="w-full sm:w-auto btn-primary h-12 px-7 text-sm gap-2"
              >
                <Camera className="h-4 w-4" />
                <span>LAUNCH LENS [AR]</span>
              </Link>

              <a
                href="/spadas-ai.apk"
                download
                className="w-full sm:w-auto btn-secondary h-12 px-6 text-sm gap-2 font-mono"
              >
                <Download className="h-4 w-4 text-[#22C55E]" />
                <span>DOWNLOAD APK</span>
              </a>
            </div>

            {/* Telemetry Highlights */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-[#22C55E]">●</span> 30-Day Real Sold Comps
              </span>
              <span className="text-zinc-700">//</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-[#F97316]">●</span> STR Turnover Velocity
              </span>
              <span className="text-zinc-700">//</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-[#22C55E]">●</span> 1-Tap eBay AU Dispatch
              </span>
            </div>
          </div>

          {/* ================================================================
              Centerpiece: Tactile Hardware Specimen Card (Telemetry Readout)
              ================================================================ */}
          <div className="mt-14 max-w-3xl mx-auto">
            <div className="specimen-card p-5 sm:p-7 border border-zinc-800 rounded-xl relative overflow-hidden bg-[#0D1017]">
              {/* Corner Hardware Crosshairs */}
              <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#F97316]" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#F97316]" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-zinc-700" />
              <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-zinc-700" />

              {/* Top Telemetry Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-zinc-800/90 font-mono text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#161922] border border-zinc-800 text-zinc-300 font-bold">
                    SPECIMEN #AU-09412
                  </span>
                  <span>JUNKYARD PICK-A-PART // ROW 14</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">CONFIDENCE:</span>
                  <span className="font-bold text-[#22C55E]">98.7%</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-500">LATENCY:</span>
                  <span className="text-zinc-300">142ms</span>
                </div>
              </div>

              {/* Specimen Main Identification */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-[10px] font-mono font-bold uppercase tracking-wider">
                      ● MUST COP // IMMEDIATE FLIP
                    </span>
                    <span className="text-xs font-mono text-zinc-500">AUTO SALVAGE ECU</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Bosch ME7.2 Engine Control Unit (ECU)
                  </h2>
                  <p className="font-mono text-xs text-zinc-400">
                    OEM Part: <span className="text-zinc-200">0-261-207-106</span> · Fits: BMW E39 540i / E53 X5 4.4L
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Net Take-Home Margin</p>
                  <p className="text-3xl sm:text-4xl font-mono font-black text-[#22C55E] tracking-tight data-readout">
                    +$138.45
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400">
                    ROI: <strong className="text-zinc-200">923%</strong> (after fees & post)
                  </p>
                </div>
              </div>

              {/* Dense Data Telemetry Grid (Forced Tabular Monospace) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-[#090A0F] border border-zinc-800/80 font-mono">
                <div className="p-2.5 rounded bg-[#10131C] border border-zinc-800/60">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Tag / Junkyard Cost</p>
                  <p className="text-base font-bold text-white tracking-tight data-readout">$15.00</p>
                  <p className="text-[10px] text-zinc-500">Standard Yard Pull</p>
                </div>

                <div className="p-2.5 rounded bg-[#10131C] border border-zinc-800/60">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tight">90D Sold Median</p>
                  <p className="text-base font-bold text-white tracking-tight data-readout">$185.00</p>
                  <p className="text-[10px] text-emerald-400">28 Comps Sold</p>
                </div>

                <div className="p-2.5 rounded bg-[#10131C] border border-zinc-800/60">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Sell-Through (STR)</p>
                  <p className="text-base font-bold text-[#F97316] tracking-tight data-readout">174%</p>
                  <p className="text-[10px] text-zinc-400">⚡ 3.2-Day Velocity</p>
                </div>

                <div className="p-2.5 rounded bg-[#10131C] border border-zinc-800/60">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Deductions (Fees+Post)</p>
                  <p className="text-base font-bold text-zinc-300 tracking-tight data-readout">-$31.55</p>
                  <p className="text-[10px] text-zinc-500">eBay 13.4% + $11.50</p>
                </div>
              </div>

              {/* Hardware Terminal Action Footer */}
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Crosshair className="h-3.5 w-3.5 text-[#F97316]" />
                  <span>TARGET PINNED // READY TO PUBLISH</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href="/lens"
                    className="flex-1 sm:flex-initial btn-primary h-9 px-4 text-xs"
                  >
                    <span>1-TAP EBAY DRAFT</span>
                  </Link>
                  <Link
                    href="/ironman"
                    className="flex-1 sm:flex-initial btn-secondary h-9 px-4 text-xs font-mono"
                  >
                    <span>VIEW IN AR HUD</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Centerpiece: Interactive Live Scanner & Listing Simulator */}
        <section className="pt-8 pb-12 border-t border-zinc-800/80">
          <LandingInteractiveDemo />
        </section>

        {/* Core Product Capabilities */}
        <section className="py-12 border-t border-zinc-800/80">
          <LandingProductTabs />
        </section>

        {/* Reseller Profit & Fee Calculator */}
        <section className="py-12 border-t border-zinc-800/80">
          <LandingCalculator />
        </section>

        {/* Field Equipment Specifications (Dense 4-Column Grid) */}
        <section className="py-16 border-t border-zinc-800/80">
          <div className="mb-8">
            <h3 className="font-mono text-xs text-[#F97316] uppercase font-bold tracking-wider">
              HARDWARE ARCHITECTURE // SPECS
            </h3>
            <h2 className="text-2xl font-black text-white mt-1">
              Engineered for the Bin, the Yard, and the Rack.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="specimen-card p-5 space-y-2 border border-zinc-800/80">
              <span className="font-mono text-xs text-zinc-500 font-bold">[01] CONTINUOUS LENS</span>
              <h3 className="text-base font-black text-white">60 FPS Walk-and-Pan</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Continuous on-device camera tracking. Pans across entire shelves with zero loading spinners.
              </p>
            </div>

            <div className="specimen-card p-5 space-y-2 border border-zinc-800/80">
              <span className="font-mono text-xs text-[#F97316] font-bold">[02] TURNOVER VELOCITY</span>
              <h3 className="text-base font-black text-white">Real STR% Algorithm</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Detects hoarder risk traps (90d+ sitting) vs 3-day high velocity flips before spending capital.
              </p>
            </div>

            <div className="specimen-card p-5 space-y-2 border border-zinc-800/80">
              <span className="font-mono text-xs text-[#22C55E] font-bold">[03] AR SPATIAL HUD</span>
              <h3 className="text-base font-black text-white">Iron Man Hologram</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                3D floating profit tags pinned in camera space with Web Audio synthesis and tactile haptics.
              </p>
            </div>

            <div className="specimen-card p-5 space-y-2 border border-zinc-800/80">
              <span className="font-mono text-xs text-zinc-500 font-bold">[04] FIELD DISPATCH</span>
              <h3 className="text-base font-black text-white">1-Click Live eBay AU</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Auto-generates 80-character SEO titles, item specifics, and publishes directly to marketplace feeds.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials & FAQ */}
        <section className="py-12 border-t border-zinc-800/80">
          <LandingTestimonialsFaq />
        </section>

        {/* Footer - Minimalist Field Equipment Spec */}
        <footer className="border-t border-zinc-800/80 py-8 text-xs font-mono text-zinc-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            SPADAS RESALE INTELLIGENCE // © {new Date().getFullYear()} SPADAS TECHNOLOGY PTY LTD
          </div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-zinc-300 transition">PRIVACY</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition">TERMS</Link>
            <Link href="/press" className="hover:text-zinc-300 transition">PRESS</Link>
            <a href="/spadas-ai.apk" download className="text-[#22C55E] hover:underline font-bold">
              GET APK
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}