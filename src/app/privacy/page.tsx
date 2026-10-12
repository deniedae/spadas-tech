import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { SITE_URL, BRAND_CONFIG } from "@/lib/site-url";
import { PublicNav, PublicFooter } from "@/components/public-layout";

export const metadata: Metadata = {
  title: "Privacy Policy · Spadas Resale Scanner",
  description:
    "Privacy Policy and camera data security standards for the Spadas resale scanner application by Spadas Technology.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  openGraph: {
    title: "Privacy Policy · Spadas Resale Scanner",
    description:
      "Privacy Policy and camera data security standards for the Spadas resale scanner application by Spadas Technology.",
    url: `${SITE_URL}/privacy`,
    siteName: "Spadas Resale Scanner",
    images: [
      {
        url: `${SITE_URL}/og-preview.jpg`,
        width: 1200,
        height: 630,
        alt: "Spadas Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy · Spadas Resale Scanner",
    description:
      "Privacy Policy and camera data security standards for the Spadas resale scanner application by Spadas Technology.",
    images: [`${SITE_URL}/og-preview.jpg`],
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-zinc-100 flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-4 py-12 w-full space-y-8">
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-6">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Last updated: October 2026</p>
          </div>
        </div>

        <section className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              1. Overview
            </h2>
            <p>
              {BRAND_CONFIG.legalEntity} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates {BRAND_CONFIG.productName} (&quot;Spadas&quot; or the &quot;Service&quot;). We are committed to transparency and safeguarding your personal data when using our optical scanner, inventory, and valuation tools.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              2. Information We Collect
            </h2>
            <p>
              When you interact with Spadas, we collect information necessary to provide secondary marketplace valuation and inventory tracking:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Account Credentials:</strong> Email address and authentication tokens via Supabase Auth or Google Sign-In.
              </li>
              <li>
                <strong className="text-zinc-200">Inventory &amp; Haul Records:</strong> Item titles, categories, acquisition costs, sold comps references, and notes saved to your user account.
              </li>
              <li>
                <strong className="text-zinc-200">Camera &amp; Visual Frames:</strong> Product images and camera viewfinder frames submitted for optical identification and barcode reading. Visual frames are processed solely to extract product identifiers and completed sales comps; they are not sold or repurposed for unrelated advertising.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              3. How We Use Collected Data
            </h2>
            <p>
              Information collected is utilized exclusively for core app functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400">
              <li>Retrieving relevant completed marketplace sold comps and calculating net profit after platform fees and parcel postage.</li>
              <li>Generating editable draft titles and descriptions for marketplace export.</li>
              <li>Synchronizing inventory ledgers and haul batches across your authorized devices.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              4. Data Protection &amp; Security
            </h2>
            <p>
              All communication between your client device and our services is secured using TLS/HTTPS encryption. User inventory and scan quotas are protected via database-level Row Level Security (RLS) policies keyed strictly to your authenticated user identifier.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              5. Contact &amp; Data Rights
            </h2>
            <p>
              You may request an export or complete deletion of your account and inventory data at any time via our{" "}
              <Link href="/delete-account" className="text-cyan-400 underline hover:text-cyan-300">
                Account Deletion page
              </Link>{" "}
              or by writing to our designated privacy contact:
            </p>
            <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex items-center gap-3">
              <Mail className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs text-zinc-400 block">Designated Privacy &amp; Data Contact</span>
                <a
                  href={`mailto:${BRAND_CONFIG.contactEmail}?subject=Privacy%20Data%20Request`}
                  className="text-sm font-mono font-bold text-white hover:text-cyan-400 transition"
                >
                  {BRAND_CONFIG.contactEmail}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
