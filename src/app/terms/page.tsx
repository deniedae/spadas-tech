import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service · Spadas AI",
  description: "Terms of Service for Spadas AI reseller inventory and analytics application.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spadas AI
        </Link>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <FileText className="h-10 w-10 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-sm text-slate-400">Last updated: August 2026</p>
          </div>
        </div>

        <section className="space-y-4 text-slate-300 leading-relaxed text-sm">
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Spadas AI platform (&quot;Service&quot;), provided by Spadas Technology (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">2. Description of Service</h2>
          <p>
            Spadas AI is a reseller workflow, inventory management, market comp valuation, and authentication assistance platform. Market comps, resale valuations, and forensic indicators provided by the Service are algorithmic estimates designed for informational guidance and do not constitute formal legal appraisals or manufacturer warranties.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">3. User Accounts &amp; Security</h2>
          <p>
            You are responsible for safeguarding your login credentials and for any activities or actions conducted under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">4. Marketplace Integrations</h2>
          <p>
            When connecting third-party marketplace accounts (such as eBay), you authorize Spadas AI to interact with those platforms via official APIs on your behalf strictly as directed by your listing and sync actions. You remain responsible for compliance with all third-party marketplace policies and seller agreements.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">5. Intellectual Property</h2>
          <p>
            All content, trademarks, logos, algorithms, and interface designs of Spadas AI remain the exclusive property of Spadas Technology. Third-party brand names, trademarks, and logos referenced within the app are the property of their respective owners and are used solely for identification and product categorization purposes.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">6. Limitation of Liability</h2>
          <p>
            In no event shall Spadas Technology be liable for any indirect, incidental, special, or consequential damages resulting from your use of or inability to use the Service, including marketplace listing disputes or resale price fluctuations.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">7. Contact Information</h2>
          <p>
            If you have any questions regarding these Terms of Service, please contact us at support@spadas.ai.
          </p>
        </section>
      </div>
    </main>
  );
}
