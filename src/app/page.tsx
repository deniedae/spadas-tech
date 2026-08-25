import Link from "next/link";
import LandingInteractiveDemo from "@/components/landing-interactive-demo";
import LandingCalculator from "@/components/landing-calculator";
import LandingTestimonialsFaq from "@/components/landing-testimonials-faq";
import LandingProductTabs from "@/components/landing-product-tabs";
import { Camera, Sparkles, Download, ArrowRight, Zap, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";

const features = [
  {
    icon: "🔮",
    title: "Continuous 60FPS AR Vision",
    description: "Pan your camera across op-shop racks and thrift shelves. Instant bounding boxes, sold comps, and audio chimes.",
  },
  {
    icon: "🛍️",
    title: "1-Click eBay AU Publishing",
    description: "Auto-registers Australian merchant locations and creates live offers directly in the background.",
  },
  {
    icon: "🤖",
    title: "AI 80-Char SEO Titles",
    description: "Generates high-converting marketplace descriptions, specifics, and condition notes in 2 seconds.",
  },
  {
    icon: "💰",
    title: "Real-Time Net Profit Margins",
    description: "Calculates exact eBay AU (13.4% + $0.33) fees, postage satchels, and ROI % before you spend $1.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white select-none">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        {/* Navigation Top Bar */}
        <nav className="flex items-center justify-between py-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-md shadow-cyan-500/30">
              <Zap className="h-5 w-5 text-slate-950 fill-slate-950" />
            </span>
            <span>Spadas<span className="text-cyan-400">.AI</span></span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs sm:text-sm font-bold text-slate-300 transition hover:text-white">
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-md shadow-cyan-500/20 transition hover:scale-105 active:scale-95"
            >
              Get Started Free
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-16 text-center md:py-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-black text-cyan-300 backdrop-blur-sm shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            🔥 Built for Op-Shop & Thrift Resellers
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight">
            Spot $100+ Thrift Flips <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              in Under 2 Seconds.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-sm sm:text-lg text-slate-300 md:text-xl font-medium leading-relaxed">
            Point your camera at any thrift store shelf or clothing rack. Get real-time 30-day eBay AU sold comps, instant net profit calculations, and auto-list in 1 tap.
          </p>

          {/* Hero Action Buttons */}
          <div className="mt-10 flex flex-col justify-center items-center gap-3.5 sm:flex-row max-w-xl mx-auto">
            <Link
              href="/lens"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-8 py-4 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-cyan-500/25 hover:scale-105 transition active:scale-95 cursor-pointer"
            >
              <Camera className="h-5 w-5 text-slate-950" />
              <span>Launch Live AR Scanner</span>
            </Link>

            <a
              href="/spadas-ai.apk"
              download
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-sm sm:text-base font-bold text-white hover:bg-slate-800 transition active:scale-95 shadow-md"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Download Android APK</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" /> 60FPS Continuous Vision
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Live eBay AU Sold Comps
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" /> 1-Tap Background Publishing
            </span>
          </div>
        </section>

        {/* Centerpiece: Interactive Live Scanner & Listing Simulator */}
        <LandingInteractiveDemo />

        {/* Core Product Capabilities */}
        <LandingProductTabs />

        {/* Reseller Profit & Fee Calculator */}
        <LandingCalculator />

        {/* Feature Cards Grid */}
        <section className="grid gap-6 py-20 md:grid-cols-2 xl:grid-cols-4 border-t border-white/10">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-2 shadow-xl hover:border-slate-700 transition"
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h2 className="text-lg font-black text-white">{feature.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
            </article>
          ))}
        </section>

        {/* Testimonials & FAQ */}
        <LandingTestimonialsFaq />

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>© {new Date().getFullYear()} Spadas AI. Australian Reseller Intelligence.</div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
            <Link href="/press" className="hover:text-slate-300 transition">Press Kit</Link>
            <a href="/spadas-ai.apk" download className="text-emerald-400 hover:underline">Download Android APK</a>
          </div>
        </footer>
      </div>
    </main>
  );
}