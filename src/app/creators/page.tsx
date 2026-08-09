import Link from "next/link";
import Image from "next/image";
import CreatorApplicationForm from "@/components/creator-application-form";
import {
  ArrowLeft,
  Camera,
  Sparkles,
  DollarSign,
  Video,
  Download,
  Share2,
  CheckCircle2,
  Send,
  Zap,
  ShieldCheck,
  Award,
} from "lucide-react";

export const metadata = {
  title: "Creators & Influencers Program · Spadas Technology",
  description:
    "Partner with Spadas Technology. Get paid for sponsored AR scanner videos, earn 25% recurring commissions, and access high-converting ad assets.",
};

const creatorPerks = [
  {
    icon: DollarSign,
    title: "25% Lifetime Recurring Commission",
    description: "Earn passive recurring revenue for every reseller, flipper, or shop owner who signs up using your link.",
  },
  {
    icon: Video,
    title: "Up to $500 Flat Sponsorship per Video",
    description: "We pay top YouTube, TikTok, and Instagram creators flat fees for dedicated AR scanner sourcing videos.",
  },
  {
    icon: Sparkles,
    title: "Exclusive Creator VIP Perks",
    description: "Free lifetime pro account, early access to new AI feature drops, and custom promo codes for your audience.",
  },
  {
    icon: Share2,
    title: "Plug & Play Asset Kit",
    description: "Download pre-made storyboards, sound effects (audio chimes), overlay graphics, and sample video clips.",
  },
];

const storyboardSteps = [
  {
    time: "0:00 - 0:03",
    tag: "Hook",
    title: "The Sourcing Problem",
    description: "Show yourself walking down a thrift store aisle or flea market. State that manual eBay searches take too long.",
  },
  {
    time: "0:03 - 0:08",
    tag: "Demo",
    title: "Sweep with Spadas Lens AR",
    description: "Open the live camera feed in Spadas Lens. Point the phone camera across electronics or vintage shelves.",
  },
  {
    time: "0:08 - 0:13",
    tag: "Climax",
    title: "Profit Chime & AR Box",
    description: "Show the screen lock onto a high-margin item with a high-contrast AR bounding box and audio chime notification.",
  },
  {
    time: "0:13 - 0:18",
    tag: "CTA",
    title: "One-Tap AI Listing & Bio Link",
    description: "Show item added to inventory + instant description generation. Tell viewers to grab the free trial link in bio.",
  },
];

export default function CreatorsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Spadas AI
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/press"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors hidden sm:inline-block"
            >
              Press & Media Kit
            </Link>
            <a
              href="#apply"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 shadow-lg shadow-blue-500/20"
            >
              Apply as Creator
            </a>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300">
            <Award className="h-4 w-4 text-blue-400" />
            Official Reseller Creator & Sponsorship Program
          </div>

          <h1 className="text-4xl font-extrabold text-white sm:text-6xl tracking-tight leading-tight">
            Get Paid to Show Resellers How to <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">Flip Faster with AR</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Partner with Spadas Technology. We sponsor top YouTubers, TikTokers, and Instagram creators in the thrift, flipping, and e-commerce space.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              <Send className="h-4 w-4" /> Apply for Sponsorship
            </a>
            <a
              href="#asset-kit"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Download Ad Assets & Brief
            </a>
          </div>
        </div>

        {/* Ad Concept Showcase */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-96 w-96 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                <Camera className="h-4 w-4" /> Featured Ad Angle: "The AR Scanner Demo"
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Show your audience how Spadas Lens finds profit in real-time.
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Our highest-converting ad format lets creators film a 15-second POV walk down thrift store aisles. Point your camera at a shelf, watch the AR scanner filter low-margin items, and trigger high-signal audio chimes when a high-profit item is found.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Real-time estimated profit & comps calculation on screen</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>AudioContext chime triggers on profit over threshold (e.g. +$20)</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>One-tap AI draft generation directly to eBay/Poshmark</span>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-950 flex items-center justify-center p-4">
              <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-blue-500/20">
                <Image
                  src="/ar-ad-mockup.jpg"
                  alt="Spadas Lens AR Scanner Ad Mockup"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Creator Perks Grid */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Why Creators Partner With Us</h2>
            <p className="text-slate-400 text-sm">Generous payouts, automated tracking, and high conversion rates for reseller audiences.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creatorPerks.map((perk, idx) => {
              const IconComp = perk.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 hover:border-slate-700 transition"
                >
                  <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <IconComp className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{perk.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{perk.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video Storyboard Breakdown */}
        <div id="asset-kit" className="space-y-8 pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                Plug & Play Video Blueprint
              </div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                15-Second High-Converting Ad Storyboard
              </h2>
            </div>

            <a
              href="/press"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Download className="h-3.5 w-3.5" /> Media Press Assets
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {storyboardSteps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {step.time}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {step.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white pt-1">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Creator Application Form */}
        <div id="apply" className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-8 sm:p-12 space-y-8 max-w-3xl mx-auto shadow-2xl">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-400 uppercase tracking-widest">
              <Zap className="h-4 w-4" /> Fast Track Application
            </div>
            <h2 className="text-3xl font-extrabold text-white">Apply for Sponsorship</h2>
            <p className="text-slate-400 text-sm">
              Fill out the form below. Our creator management team reviews applications within 24 hours.
            </p>
          </div>

          <CreatorApplicationForm />
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Spadas Technology Inc. All rights reserved. Partner & Creator Program.
        </div>
      </div>
    </main>
  );
}
