import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download, ShieldCheck, Image as ImageIcon, Smartphone, Package } from "lucide-react";

export const metadata = {
  title: "Media Press Kit & Brand Assets · Spadas AI",
  description: "Download official high-resolution logos, banners, screenshots, and release assets for Spadas AI.",
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
    title: "Itch Store Banner (960x250)",
    type: "Header Banner PNG",
    file: "/itch-banner.png",
    size: "960 x 250 px",
  },
  {
    title: "Store Cyber Background",
    type: "Background Texture PNG",
    file: "/itch-bg.png",
    size: "1920 x 1080 px",
  },
  {
    title: "Spadas Lens AR Scanner Screenshot",
    type: "Mobile Mockup PNG",
    file: "/screenshot-lens.png",
    size: "720 x 1280 px",
  },
  {
    title: "Profit & Inventory Analytics Screenshot",
    type: "Mobile Mockup PNG",
    file: "/screenshot-dashboard.png",
    size: "720 x 1280 px",
  },
  {
    title: "AI Listing Generator Screenshot",
    type: "Mobile Mockup PNG",
    file: "/screenshot-generator.png",
    size: "720 x 1280 px",
  },
];

export default function PressKitPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spadas AI
        </Link>

        <div className="flex items-center justify-between border-b border-slate-800 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <ShieldCheck className="h-4 w-4" /> Media & Partner Hub
            </div>
            <h1 className="text-3xl font-extrabold text-white md:text-5xl">
              Brand Assets & Press Kit
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base">
              Download high-resolution icons, store graphics, mobile screenshots, and release binaries.
            </p>
          </div>

          <a
            href="/spadas-ai.apk"
            download="Spadas-AI.apk"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 shrink-0"
          >
            <Package className="h-4 w-4" /> Download Production APK
          </a>
        </div>

        {/* Media Asset Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mediaAssets.map((asset, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700"
            >
              <div>
                <div className="relative mb-4 h-40 w-full rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                  <Image
                    src={asset.file}
                    alt={asset.title}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <h3 className="text-base font-bold text-white">{asset.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{asset.type} • {asset.size}</p>
              </div>

              <a
                href={asset.file}
                download
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" /> Download File
              </a>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Spadas AI. Official Media & Press Assets.
        </div>
      </div>
    </main>
  );
}
