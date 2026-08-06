import Link from "next/link";
import LandingInteractiveDemo from "@/components/landing-interactive-demo";

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

        <section className="grid gap-6 pb-20 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="pb-20">
          <div className="rounded-3xl border border-blue-400/30 bg-blue-500/10 p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-blue-200">Why sellers use it</p>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                  Less busywork. More confident buying and selling.
                </h2>
              </div>

              <div className="space-y-5 text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <strong className="text-white">1.</strong> Create listings faster with AI-generated copy.
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <strong className="text-white">2.</strong> Spot profitable opportunities with your dashboard.
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <strong className="text-white">3.</strong> Keep your inventory and pricing in one place.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to launch your resale workflow?</h2>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}