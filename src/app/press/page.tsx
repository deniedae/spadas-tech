import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download, ShieldCheck, Smartphone, ExternalLink, Mail, CheckCircle2 } from "lucide-react";
import { SITE_URL, BRAND_CONFIG } from "@/lib/site-url";
import { PublicNav, PublicFooter } from "@/components/public-layout";

export const metadata: Metadata = {
  title: "Press Kit & Brand Assets · Spadas",
  description:
    "Official high-resolution logos, product screenshots, store graphics, and verified company facts for Spadas Resale Scanner.",
  alternates: {
    canonical: `${SITE_URL}/press`,
  },
  openGraph: {
    title: "Press Kit & Brand Assets · Spadas",
    description:
      "Official high-resolution logos, product screenshots, store graphics, and verified company facts for Spadas Resale Scanner.",
    url: `${SITE_URL}/press`,
    siteName: "Spadas Resale Scanner",
    images: [
      {
        url: `${SITE_URL}/og-preview.jpg`,
        width: 1200,
        height: 630,
        alt: "Spadas Press Kit and Media Assets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Press Kit & Brand Assets · Spadas",
    description:
      "Official high-resolution logos, product screenshots, store graphics, and verified company facts for Spadas Resale Scanner.",
    images: [`${SITE_URL}/og-preview.jpg`],
  },
};

const mediaAssets = [
  {
    title: "Official App Icon (512x512)",
    type: "Icon PNG",
    file: "/icon-512.png",
    size: "512 x 512 px",
  },
  {
    title: "Store Feature Graphic (1024x500)",
    type: "Feature Graphic PNG",
    file: "/store-feature-graphic-1024x500.png",
    size: "1024 x 500 px",
  },
  {
    title: "Camera Scanner Viewfinder",
    type: "App Screenshot PNG",
    file: "/screenshot-lens.png",
    size: "720 x 1280 px",
  },
  {
    title: "Profit & Inventory Analytics",
    type: "App Screenshot PNG",
    file: "/screenshot-dashboard.png",
    size: "720 x 1280 px",
  },
  {
    title: "AI Listing Studio Draft",
    type: "App Screenshot PNG",
    file: "/screenshot-generator.png",
    size: "720 x 1280 px",
  },
  {
    title: "Social Preview Card (OG)",
    type: "Banner JPG",
    file: "/og-preview.jpg",
    size: "1200 x 630 px",
  },
];

export default function PressKitPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-zinc-100 flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-5xl mx-auto px-4 py-12 w-full space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.08] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <ShieldCheck className="h-4 w-4" /> Media &amp; Partner Kit
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Brand Assets &amp; Press Room
            </h1>
            <p className="text-zinc-400 mt-2 text-sm sm:text-base max-w-2xl leading-relaxed">
              Official high-resolution logos, store graphics, application screenshots, and verified company facts for editorial and partnership use.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={BRAND_CONFIG.playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-5 py-3 text-xs font-black text-zinc-950 transition active:scale-95 shadow-md shadow-cyan-950/40"
            >
              <Smartphone className="h-4 w-4" />
              Get on Google Play
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`mailto:${BRAND_CONFIG.contactEmail}?subject=Press%20Inquiry%20-%20Spadas`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 px-4 py-3 text-xs font-bold text-zinc-200 hover:text-white transition"
            >
              <Mail className="h-4 w-4 text-cyan-400" />
              Press Inquiries
            </a>
          </div>
        </div>

        {/* Fact Sheet */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D15] p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Product &amp; Company Overview
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider font-mono">Product Name</span>
              <p className="font-bold text-zinc-200">{BRAND_CONFIG.productName}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider font-mono">Company / Entity</span>
              <p className="font-bold text-zinc-200">{BRAND_CONFIG.legalEntity}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider font-mono">Distribution</span>
              <p className="font-bold text-zinc-200">Google Play ({BRAND_CONFIG.packageId}) &amp; Web</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider font-mono">Press Contact</span>
              <p className="font-bold text-cyan-400 font-mono">{BRAND_CONFIG.contactEmail}</p>
            </div>
          </div>
        </div>

        {/* Media Asset Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Downloadable Brand Assets</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mediaAssets.map((asset, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0D15] p-5 transition hover:border-white/15"
              >
                <div>
                  <div className="relative mb-4 h-44 w-full rounded-xl bg-zinc-950 border border-white/[0.06] overflow-hidden flex items-center justify-center p-2">
                    <Image
                      src={asset.file}
                      alt={asset.title}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-white">{asset.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">{asset.type} • {asset.size}</p>
                </div>

                <a
                  href={asset.file}
                  download
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-98"
                >
                  <Download className="h-3.5 w-3.5 text-cyan-400" /> Download File
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
