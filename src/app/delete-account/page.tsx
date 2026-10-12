import type { Metadata } from "next";
import Link from "next/link";
import { Trash2, ShieldCheck, Mail } from "lucide-react";
import { SITE_URL, BRAND_CONFIG } from "@/lib/site-url";
import { PublicNav, PublicFooter } from "@/components/public-layout";

export const metadata: Metadata = {
  title: "Delete My Account · Spadas",
  description:
    "Request permanent deletion of your Spadas account and all associated inventory and scan data. No login required.",
  alternates: {
    canonical: `${SITE_URL}/delete-account`,
  },
  openGraph: {
    title: "Delete My Account · Spadas",
    description:
      "Request permanent deletion of your Spadas account and all associated inventory and scan data.",
    url: `${SITE_URL}/delete-account`,
    siteName: "Spadas Resale Scanner",
    images: [
      {
        url: `${SITE_URL}/og-preview.jpg`,
        width: 1200,
        height: 630,
        alt: "Spadas Account Deletion Request",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Delete My Account · Spadas",
    description:
      "Request permanent deletion of your Spadas account and all associated data.",
    images: [`${SITE_URL}/og-preview.jpg`],
  },
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-zinc-100 flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-2xl mx-auto px-4 py-12 w-full space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/[0.08] pb-8">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-7 w-7 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Delete My Account</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Request permanent deletion of your Spadas account and all associated records.
            </p>
          </div>
        </div>

        {/* What gets deleted */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">What will be permanently erased</h2>
          <ul className="space-y-2 text-zinc-300 text-sm leading-relaxed">
            {[
              "Your account email address and authentication credentials",
              "All saved item listings, drafts, and inventory records",
              "Scan history and optical comp records",
              "Haul session data and batch manifests",
              "eBay marketplace connection tokens",
              "Support ticket history",
              "All subscription associations",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-rose-400">✕</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500 pt-2">
            Deletion is permanent and cannot be reversed. Any active subscriptions will be cancelled immediately with no partial refunds per our{" "}
            <Link href="/terms" className="text-cyan-400 underline hover:text-cyan-300 transition">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        {/* In-app deletion option */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0A0D15] p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-white">Delete directly inside the app</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            If you have access to your account, the fastest method is inside settings:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-zinc-300">
            <li>Sign in to Spadas</li>
            <li>Navigate to <strong>Settings</strong></li>
            <li>Scroll down to <strong>Account &amp; Security</strong></li>
            <li>
              Click the <strong className="text-rose-400">Delete Account</strong> button under <em>Danger Zone</em>
            </li>
            <li>Type <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-rose-400 font-mono text-xs">DELETE</code> to confirm</li>
          </ol>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 mt-2 text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.1] px-4 py-2 rounded-xl transition"
          >
            Go to Settings →
          </Link>
        </section>

        {/* Email request option */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0A0D15] p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-cyan-400 shrink-0" />
            <h2 className="text-base font-bold text-white">Request deletion by email</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            If you cannot access your account, write to us from the address associated with your account and we will process permanent deletion within 48 hours:
          </p>
          <a
            href={`mailto:${BRAND_CONFIG.contactEmail}?subject=Account%20Deletion%20Request&body=Please%20permanently%20delete%20my%20Spadas%20account%20and%20all%20associated%20data.%0A%0AAccount%20email%3A%20`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition underline font-mono"
          >
            <Mail className="h-4 w-4" />
            {BRAND_CONFIG.contactEmail}
          </a>
          <p className="text-xs text-zinc-600 pt-1">
            Subject line: <em>Account Deletion Request</em> — include your account email in the body.
          </p>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
