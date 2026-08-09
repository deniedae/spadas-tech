import Link from "next/link";
import LandingInteractiveDemo from "@/components/landing-interactive-demo";
import LandingCalculator from "@/components/landing-calculator";
import LandingTestimonialsFaq from "@/components/landing-testimonials-faq";

const features = [
  {
    icon: "🤖",
    title: "AI listing generation",
    description: "Write polished marketplace descriptions and pricing-aware listings in seconds.",
  },
  {
    icon: "📦",
    title: "Inventory control",
    description: "Track stock, costs, statuses, and resale performance from a single workspace.",
  },
  {
    icon: "📷",
    title: "Barcode scanning",
    description: "Quickly pull product details and create a listing from a single scan.",
  },
  {
    icon: "📈",
    title: "Profit visibility",
    description: "Monitor revenue, sold items, and inventory value without spreadsheet work.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="text-2xl font-black tracking-tight">
            Spadas AI
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/creators" className="text-sm text-slate-300 transition hover:text-white hidden sm:inline-block">
              Creator Program
            </Link>
            <Link href="/press" className="text-sm text-slate-300 transition hover:text-white hidden sm:inline-block">
              Press Kit
            </Link>
            <Link href="/login" className="text-sm text-slate-300 transition hover:text-white">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <section className="py-16 text-center md:py-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-blue-100 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Built for modern resellers
          </div>

          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-white md:text-7xl">
            AI-powered selling, inventory, and profit tracking.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300 md:text-xl">
            Turn product research, listing creation, and resale planning into one repeatable workflow.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-500"
            >
              Start free
            </Link>
            <a
              href="/spadas-ai.apk"
              download="Spadas-AI.apk"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-8 py-4 text-lg font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              📱 Download Android APK
            </a>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
            >
              View dashboard
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300">
            <span>AI listing assistant</span>
            <span>•</span>
            <span>Barcode lookup</span>
            <span>•</span>
            <span>Market-ready exports</span>
            <span>•</span>
            <span>Profit analytics</span>
          </div>
        </section>

        {/* Unauthenticated Interactive AI Demo */}
        <LandingInteractiveDemo />

        {/* Interactive Reseller ROI & Profit Calculator */}
        <LandingCalculator />

        <section className="grid gap-6 py-20 md:grid-cols-2 xl:grid-cols-4 border-t border-white/10">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 text-3xl">{feature.icon}</div>
              <h2 className="text-xl font-bold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="pb-16">
          <div className="rounded-3xl border border-blue-400/30 bg-blue-500/10 p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-blue-200">Why sellers use it</p>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                  Less busywork. More confident buying and selling.
                </h2>
              </div>

              <div className="space-y-4 text-slate-200">
                <p>
                  Sourcing items, calculating fees across multiple platforms, and manually writing item descriptions consumes hours every week.
                </p>
                <p>
                  Spadas AI brings research, automated title descriptions, and profit tracking into a single tool so you spend less time admining and more time sourcing high-margin deals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials, FAQ & Press Kit Section */}
        <LandingTestimonialsFaq />

        <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>© {new Date().getFullYear()} Spadas AI. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/press" className="hover:text-white transition">Press Kit</Link>
            <a href="/spadas-ai.apk" download className="hover:text-emerald-400 transition">Download APK</a>
          </div>
        </footer>
      </div>
    </main>
  );
}