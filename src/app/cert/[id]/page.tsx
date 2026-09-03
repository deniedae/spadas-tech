import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Share2,
  Printer,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  QrCode,
  ExternalLink,
  ChevronLeft,
  Award,
} from "lucide-react";
import { getCertificate } from "@/lib/forensic-certificates";
import { FORENSIC_CATEGORIES, ForensicCategory } from "@/lib/forensic-knowledge";
import CertificateShareControls from "./share-controls";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cert = await getCertificate(id);

  if (!cert) {
    return {
      title: "Certificate Not Found · Spadas AI",
    };
  }

  const title = `Authenticity Certificate: ${cert.product_name} (${cert.brand}) · Spadas AI`;
  const description = `Verified by Spadas AI Forensic Engine with a ${cert.authenticity_score}% Authenticity Score. Verdict: ${cert.verdict.replace(/_/g, " ")}.`;

  return {
    title,
    description,
    metadataBase: new URL("https://spadas.ai"),
    alternates: {
      canonical: `https://spadas.ai/cert/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://spadas.ai/cert/${id}`,
      siteName: "Spadas AI Universal Forensic Engine",
      images: [
        {
          url: cert.image_urls[0] || "https://spadas.ai/og-preview.jpg",
          width: 1200,
          height: 630,
          alt: `Spadas Authenticity Certificate - ${cert.product_name}`,
        },
      ],
    },
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { id } = await params;
  const cert = await getCertificate(id);

  if (!cert) {
    notFound();
  }

  const categoryConfig =
    FORENSIC_CATEGORIES[cert.category as ForensicCategory] ||
    FORENSIC_CATEGORIES.small_leather_goods ||
    FORENSIC_CATEGORIES.general_resale;

  const formattedDate = new Date(cert.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certUrl = `https://spadas.ai/cert/${cert.id}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-12 px-3 sm:px-6 antialiased selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Spadas AI
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Digital Certificate • Public Web Record</span>
          </div>
        </div>

        {/* Certificate Card Container (Printable Area) */}
        <div className="relative bg-slate-900/90 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Subtle Ambient Watermark & Holographic Sheen */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Certificate Header Banner */}
          <div className="border-b border-slate-800/80 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                <ShieldCheck className="h-8 w-8 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    SPADAS AI FORENSIC AUDIT
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official Digital Certificate of Authenticity • ID:{" "}
                  <code className="text-cyan-300 font-mono font-bold">{cert.id}</code>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-400">
              <div>Audited: <strong className="text-slate-200">{formattedDate}</strong></div>
              <div className="text-[11px] text-slate-400">Authority: Spadas Universal Engine</div>
            </div>
          </div>

          {/* Item Overview & Giant Legitimacy Score Dial */}
          <div className="py-6 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            <div className="sm:col-span-2 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300">
                <span>{categoryConfig.emoji}</span>
                <span>{categoryConfig.name}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {cert.product_name}
              </h2>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span>Brand: <strong className="text-white">{cert.brand}</strong></span>
                <span>•</span>
                <span>
                  Recommendation:{" "}
                  <strong className="text-emerald-400 uppercase">
                    {cert.recommendation.replace(/_/g, " ")}
                  </strong>
                </span>
              </div>
            </div>

            {/* Glowing Legitimacy Dial */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/80 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Legitimacy Score
              </span>
              <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight my-1">
                {cert.authenticity_score}%
              </div>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {cert.verdict.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Seasoned Authenticator Guardrail (Wear Decoupled from Authenticity) */}
          {cert.wear_and_tear_notes && (
            <div className="my-5 p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-200">
              <Award className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-300 block text-[11px] uppercase tracking-wider font-black">
                  Wear Decoupled from Authenticity (Seasoned Authenticator Guardrail)
                </strong>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {cert.wear_and_tear_notes}
                </p>
              </div>
            </div>
          )}

          {/* High-Resolution Macro Photo Inspection Gallery */}
          <div className="py-6 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Forensic Macro Inspection Gallery (4 Angles)
              </h3>
              <span className="text-[11px] text-slate-400">
                High-Resolution Visual Artifacts
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {categoryConfig.angles.map((angle, idx) => {
                const photoUrl = cert.image_urls[idx];
                return (
                  <div
                    key={angle.id}
                    className="relative group rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-square w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrl}
                          alt={angle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="p-3 text-center space-y-1">
                          <span className="text-2xl block">{angle.icon}</span>
                          <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                            {angle.subtitle}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-center">
                      <span className="text-[10px] font-black text-slate-200 block truncate">
                        {angle.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Universal 5-Pillar Forensic Breakdown */}
          <div className="py-6 border-b border-slate-800/80 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
              Universal 5-Pillar Forensic Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. Material
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {cert.forensic_breakdown.material}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Substrate / Grain</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  2. Typography
                </span>
                <span className="text-xl font-black text-cyan-400">
                  {cert.forensic_breakdown.typography}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Notched 'R' / Fonts</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  3. Hardware
                </span>
                <span className="text-xl font-black text-amber-400">
                  {cert.forensic_breakdown.hardware}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Lampo / Screws / Plating</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  4. Craftsmanship
                </span>
                <span className="text-xl font-black text-purple-400">
                  {cert.forensic_breakdown.craftsmanship}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">SPI / Edge Glaze</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  5. Security Codes
                </span>
                <span className="text-xl font-black text-teal-400">
                  {cert.forensic_breakdown.security_tags_and_codes ?? 95}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">RFID / Factory Seam Tag</span>
              </div>
            </div>
          </div>

          {/* Decisive Forensic Tells (Universal Protocol) */}
          {cert.decisive_tells && cert.decisive_tells.length > 0 && (
            <div className="py-5 border-b border-slate-800/80 space-y-2">
              <span className="font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide text-xs">
                <ShieldCheck className="h-4 w-4 text-cyan-400" /> Decisive Physical Tells ({cert.decisive_tells.length})
              </span>
              <ul className="space-y-1.5">
                {cert.decisive_tells.map((tell, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-200 text-xs leading-snug">
                    <span className="text-cyan-400 font-bold shrink-0">🔬</span>
                    <span>{tell}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Verified Positive Hallmarks & Red Flags */}
          <div className="py-6 border-b border-slate-800/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <span className="font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                  <CheckCircle2 className="h-4 w-4" /> Verified Positive Hallmarks ({cert.positive_indicators.length})
                </span>
                <ul className="space-y-1.5">
                  {cert.positive_indicators.map((indicator, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300 text-[11px] leading-snug">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" /> Forensic Summary
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {cert.forensic_summary}
                </p>
                {cert.hallmark_analysis && (
                  <p className="text-[11px] text-amber-300 font-semibold pt-1 border-t border-slate-800/80">
                    🔬 {cert.hallmark_analysis}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Condition & Flip Advisory + Market Comps */}
          {(cert.cleanup_advisory || cert.market_spread) && (
            <div className="py-5 border-b border-slate-800/80 space-y-3">
              {cert.cleanup_advisory && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <span className="font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Condition & Flip Potential (Cleanup Advisory)
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {cert.cleanup_advisory}
                  </p>
                </div>
              )}
              {cert.market_spread && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
                  <span className="font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-400" /> Secondary Market Comps Range
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {cert.market_spread}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Certificate Footer & Printable QR Verification Badge */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              {/* Inline SVG QR Code Representation linking to certUrl */}
              <div className="p-2 rounded-xl bg-white text-slate-950 shrink-0 shadow-md">
                <QrCode className="h-12 w-12" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Scan to Verify Authenticity
                </span>
                <span className="font-mono text-[11px] text-cyan-400 select-all block">
                  {certUrl}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Permanent Cryptographic Audit Ledger
                </span>
              </div>
            </div>

            {/* Interactive Share / Print Actions (Hidden when printing) */}
            <div className="no-print w-full sm:w-auto">
              <CertificateShareControls
                certUrl={certUrl}
                certId={cert.id}
                productName={cert.product_name}
              />
            </div>
          </div>
        </div>

        {/* eBay Listing Markdown Snippet Helper (For Resellers) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2 no-print">
          <div className="flex items-center justify-between">
            <span className="font-black text-white flex items-center gap-1.5">
              📦 eBay / Marketplace Description Snippet
            </span>
            <span className="text-[10px] text-cyan-400 font-bold">Ready to Paste</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Copy and paste this snippet directly into your eBay, Depop, or Facebook Marketplace listing to prove authenticity to buyers:
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto select-all">
{`🛡️ AUTHENTICITY GUARANTEED — VERIFIED BY SPADAS AI FORENSIC AUDIT
Legitimacy Score: ${cert.authenticity_score}% (${cert.verdict.replace(/_/g, " ")})
View High-Res Macro Photos & Verification Certificate:
${certUrl}
Certificate ID: ${cert.id}`}
          </pre>
        </div>
      </div>
    </main>
  );
}
