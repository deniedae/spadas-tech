import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Mail, AlertTriangle } from "lucide-react";
import { SITE_URL, BRAND_CONFIG } from "@/lib/site-url";
import { PublicNav, PublicFooter } from "@/components/public-layout";

export const metadata: Metadata = {
  title: "Terms of Service · Spadas Resale Scanner",
  description:
    "Terms of Service, valuation disclosures, and usage conditions for the Spadas resale scanner application by Spadas Technology.",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
  openGraph: {
    title: "Terms of Service · Spadas Resale Scanner",
    description:
      "Terms of Service, valuation disclosures, and usage conditions for the Spadas resale scanner application by Spadas Technology.",
    url: `${SITE_URL}/terms`,
    siteName: "Spadas Resale Scanner",
    images: [
      {
        url: `${SITE_URL}/og-preview.jpg`,
        width: 1200,
        height: 630,
        alt: "Spadas Terms of Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service · Spadas Resale Scanner",
    description:
      "Terms of Service, valuation disclosures, and usage conditions for the Spadas resale scanner application by Spadas Technology.",
    images: [`${SITE_URL}/og-preview.jpg`],
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-zinc-100 flex flex-col justify-between">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-4 py-12 w-full space-y-8">
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-6">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Terms of Service</h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Last updated: October 2026</p>
          </div>
        </div>

        <section className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using {BRAND_CONFIG.productName} (&quot;Service&quot;), provided by {BRAND_CONFIG.legalEntity} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue use of the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              2. Description of Service &amp; Valuation Guidance
            </h2>
            <p>
              Spadas is a reseller workflow, barcode lookup, inventory tracking, and realized sales comps analysis platform.
            </p>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1 mt-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Valuation &amp; Resale Price Guidance Disclosure
              </div>
              <p className="leading-relaxed">
                Market comps, resale price estimates, and margin indicators provided by the Service are algorithmic estimates derived from historical marketplace sales data. They are provided solely for informational and sourcing guidance. Market prices fluctuate, and past realized sales do not guarantee future resale outcomes.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              3. User Accounts &amp; Authentication
            </h2>
            <p>
              You are responsible for safeguarding your login credentials and for all activities conducted through your authenticated session. You agree to notify us immediately if you detect any unauthorized access to your account.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              4. Marketplace Integrations
            </h2>
            <p>
              When connecting third-party marketplace accounts (such as eBay), you authorize Spadas to interact with those platforms via official APIs strictly to prepare or synchronize listings initiated by you. You remain responsible for compliance with all third-party seller guidelines, listing fees, and platform policies.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              5. Intellectual Property
            </h2>
            <p>
              All software, design elements, algorithms, and branding of Spadas are the property of {BRAND_CONFIG.legalEntity}. Third-party product names, brands, and trademarks appearing in comp lookups remain the property of their respective owners and are used strictly for identification and product categorization.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              6. Limitation of Liability
            </h2>
            <p>
              In no event shall {BRAND_CONFIG.legalEntity} be liable for any indirect, incidental, or consequential damages resulting from your use of the Service, including marketplace listing disputes, unsold inventory, or secondary market price fluctuations.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono text-xs text-cyan-400">
              7. Contact Information
            </h2>
            <p>
              If you have any questions or require legal clarification regarding these Terms of Service, please contact our support desk:
            </p>
            <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex items-center gap-3">
              <Mail className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs text-zinc-400 block">Legal &amp; Support Contact</span>
                <a
                  href={`mailto:${BRAND_CONFIG.contactEmail}?subject=Terms%20Inquiry%20-%20Spadas`}
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
