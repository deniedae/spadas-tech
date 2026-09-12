import Link from "next/link";
import LandingInteractiveDemo from "@/components/landing-interactive-demo";
import LandingTestimonialsFaq from "@/components/landing-testimonials-faq";
import LandingProductTabs from "@/components/landing-product-tabs";
import {
  Scan,
  Download,
  Crosshair,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Smartphone,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Gauge,
  Vibrate,
  Camera,
  PackageCheck,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090E] text-zinc-100 select-none pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Top Bar - Executive Secondary Market OS Header */}
        <nav className="flex items-center justify-between py-4 border-b border-white/[0.08]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 border border-white/[0.12] text-white shadow-sm group-hover:border-cyan-500/50 transition">
              <Scan className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white leading-none">
                  Spadas Lens
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  PRO
                </span>
              </div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                Secondary Market OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="text-xs font-mono font-medium text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Sign In
            </Link>
            <Link
              href="/lens"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-3.5 py-1.5 text-xs transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Scan className="h-3.5 w-3.5" />
              <span>Instant Guest Scan</span>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-10 pb-12 md:pt-16 md:pb-16">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            {/* Telemetry Status Line & New APK Release Pill */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/[0.08] font-mono text-[11px] text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>60 FPS OPTICAL VISION ACTIVE</span>
                <span className="text-zinc-700">|</span>
                <span className="text-cyan-400">ZERO SIGN-UP GUEST SCAN</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Smartphone className="h-3 w-3 text-emerald-400" />
                <span>NEW ANDROID APK v1.2.1</span>
              </div>
            </div>

            {/* Direct Field Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              The Optical Sourcing Scanner for Professional Resellers.
            </h1>

            {/* Direct Field Copy */}
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Point camera at thrift racks, estate sales, or retail clearance. View real-time eBay sold comps, turnover velocity, and net take-home margins before you spend capital.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Link
                href="/lens"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-6 py-3 text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                <Scan className="h-4 w-4 text-zinc-950" />
                <span>Launch Lens AR (Guest Mode)</span>
              </Link>

              <a
                href="/spadas-ai.apk"
                download="Spadas-AI.apk"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 font-bold px-5 py-3 text-xs transition active:scale-95 font-mono cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.15)] group"
              >
                <Download className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Download New APK (~900 KB)</span>
              </a>
            </div>

            {/* Telemetry Highlights */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 3 Free Instant Scans
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                30-Day Real eBay AU Sold Comps
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                STR% Turnover Velocity
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                1-Tap Marketplace Dispatch
              </span>
            </div>
          </div>

          {/* Centerpiece: Tactile Hardware Specimen Card */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="p-5 sm:p-6 border border-white/[0.08] rounded-2xl relative overflow-hidden bg-[#0A0D15]/90 shadow-2xl backdrop-blur-md">
              {/* Top Telemetry Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06] font-mono text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 font-bold">
                    SPECIMEN #AU-09412
                  </span>
                  <span>OP SHOP APPAREL RACK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">CONFIDENCE:</span>
                  <span className="font-bold text-emerald-400">98.7%</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-500">LATENCY:</span>
                  <span className="text-zinc-300">142ms</span>
                </div>
              </div>

              {/* Specimen Main Identification */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                      ● MUST COP // HIGH VELOCITY
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">VINTAGE OUTERWEAR</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Vintage 90s Nike Colorblock Windbreaker
                  </h2>
                  <p className="font-mono text-xs text-zinc-400">
                    Swoosh Embroidered · Size XL · Deep Navy / Emerald
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Net Profit Verdict</p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-tight">
                    +$68.20
                  </p>
                  <p className="text-[10px] font-mono text-zinc-400">
                    ROI: <strong className="text-zinc-200">+568%</strong> (after fees & post)
                  </p>
                </div>
              </div>

              {/* Dense Data Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.05] font-mono text-xs">
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">Thrift Tag Cost</p>
                  <p className="text-sm font-bold text-white mt-0.5">$12.00</p>
                  <p className="text-[9px] text-zinc-500">Salvos Standard</p>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">30D Sold Median</p>
                  <p className="text-sm font-bold text-white mt-0.5">$92.50</p>
                  <p className="text-[9px] text-emerald-400">14 Comps Sold</p>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">STR Velocity</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">148% STR</p>
                  <p className="text-[9px] text-zinc-400">4-Day Turnover</p>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">Platform Fees</p>
                  <p className="text-sm font-bold text-zinc-300 mt-0.5">-$12.30</p>
                  <p className="text-[9px] text-zinc-500">eBay AU 13.4%</p>
                </div>
              </div>

              {/* Hardware Action Footer */}
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                  <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                  <span>TARGET PINNED // VERIFIED COMPS</span>
                </div>

                <Link
                  href="/lens"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-bold hover:bg-zinc-200 transition"
                >
                  <span>Launch Live Scanner</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Centerpiece: Interactive Live Scanner & Listing Simulator */}
        <section className="pt-4 pb-10 border-t border-white/[0.08]">
          <LandingInteractiveDemo />
        </section>

        {/* NEW: Mobile Web & Android APK Speed Release Showcase Section */}
        <section className="py-12 border-t border-white/[0.08]">
          <div className="max-w-3xl mb-8">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs text-emerald-400 uppercase font-bold tracking-wider">
                FIELD PERFORMANCE SUITE // RELEASE v1.2.1
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              Optimized for Mobile Web & Native Android APK.
            </h2>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
              Engineered to run faster, lighter, and smoother in the field. Seamlessly switch between the installable APK package and the mobile web app without losing a beat.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Optimization 1: Zero Latency & Prefetching */}
            <div className="p-5 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] hover:border-emerald-500/30 transition-all space-y-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Gauge className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Instant Route Transitions</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Background-warmed tab prefetching across Home, Haul, Lens AR, Listings, and History delivers zero-lag navigation inside the APK.
              </p>
            </div>

            {/* Optimization 2: Native Android Haptics */}
            <div className="p-5 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] hover:border-cyan-500/30 transition-all space-y-2.5">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Vibrate className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Native Haptic Bridge</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct integration with the Android Kotlin Companion Bridge triggers tactile pulses on high-margin flips, caution flags, and grails.
              </p>
            </div>

            {/* Optimization 3: Touch & Scroll Ergonomics */}
            <div className="p-5 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] hover:border-amber-500/30 transition-all space-y-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Zero-Delay Fluid Scrolling</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Native document scrolling with zero tap lag and pull-to-refresh overscroll containment stops unwanted page bounces while scanning.
              </p>
            </div>

            {/* Optimization 4: Rapid Shelf Snapper */}
            <div className="p-5 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] hover:border-indigo-500/30 transition-all space-y-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Camera className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">1-Tap Rapid Shelf Snapper</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rapid-fire snaps directly from the live camera stream into the background valuation queue without disrupting your scanning stride.
              </p>
            </div>

            {/* Optimization 5: Spadas Uploader */}
            <div className="p-5 rounded-2xl bg-[#0A0D15]/80 border border-white/[0.08] hover:border-purple-500/30 transition-all space-y-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <PackageCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Spadas Uploader Flow</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Multi-photo capture, automated postage/returns/payment policy detection, and 1-tap live publishing directly to your eBay inventory.
              </p>
            </div>

            {/* Optimization 6: Install Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-[#0A0D15] border border-emerald-500/30 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                  <Smartphone className="h-4 w-4" />
                  <span>NATIVE APK PACKAGE</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">Get the New Android APK</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Download the official ~900 KB standalone APK package or use it as an installable mobile PWA.
                </p>
              </div>

              <a
                href="/spadas-ai.apk"
                download="Spadas-AI.apk"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 text-xs transition active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download .APK Now</span>
              </a>
            </div>
          </div>
        </section>

        {/* Core Product Capabilities */}
        <section className="py-10 border-t border-white/[0.08]">
          <LandingProductTabs />
        </section>

        {/* Field Specifications (Dense 4-Column Grid) */}
        <section className="py-12 border-t border-white/[0.08]">
          <div className="mb-6">
            <span className="font-mono text-xs text-cyan-400 uppercase font-bold tracking-wider">
              HARDWARE ARCHITECTURE // SPECS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Engineered for the Thrift Rack, Bin, and Yard.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl bg-[#0A0D15]/80 border border-white/[0.08] space-y-1.5">
              <span className="font-mono text-xs text-zinc-500 font-bold">[01] CONTINUOUS LENS</span>
              <h3 className="text-sm font-bold text-white">60 FPS Walk-and-Pan</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Continuous on-device camera tracking. Pans across entire shelves with zero loading spinners.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0D15]/80 border border-white/[0.08] space-y-1.5">
              <span className="font-mono text-xs text-amber-400 font-bold">[02] TURNOVER VELOCITY</span>
              <h3 className="text-sm font-bold text-white">Real STR% Algorithm</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Detects hoarder risk traps (90d+ sitting) vs 3-day high velocity flips before spending capital.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0D15]/80 border border-white/[0.08] space-y-1.5">
              <span className="font-mono text-xs text-emerald-400 font-bold">[03] AR SPATIAL HUD</span>
              <h3 className="text-sm font-bold text-white">Spatial Optical Tags</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Floating profit tags pinned in camera space with Web Audio synthesis and tactile haptics.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0D15]/80 border border-white/[0.08] space-y-1.5">
              <span className="font-mono text-xs text-cyan-400 font-bold">[04] FIELD DISPATCH</span>
              <h3 className="text-sm font-bold text-white">1-Click Live eBay AU</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Auto-generates 80-character SEO titles, item specifics, and publishes directly to marketplace feeds.
              </p>
            </div>
          </div>
        </section>

        {/* Compact FAQ Section */}
        <section className="py-8 border-t border-white/[0.08]">
          <LandingTestimonialsFaq />
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.08] pt-8 pb-4 text-xs font-mono text-zinc-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            Spadas Lens · Secondary Market OS · © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition">Terms</Link>
            <a href="/spadas-ai.apk" download="Spadas-AI.apk" className="text-emerald-400 hover:underline font-bold">
              Download New APK (v1.2.1)
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}