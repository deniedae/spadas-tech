import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy · Spadas AI",
  description: "Privacy Policy for Spadas AI reseller inventory and analytics application.",
};

export default function PrivacyPolicyPage() {
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
          <ShieldCheck className="h-10 w-10 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Last updated: August 2026</p>
          </div>
        </div>

        <section className="space-y-4 text-slate-300 leading-relaxed text-sm">
          <h2 className="text-xl font-semibold text-white">1. Overview</h2>
          <p>
            Spadas AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the Spadas AI application and services.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">2. Information We Collect</h2>
          <p>
            When you use Spadas AI, we may collect the following types of information:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong>Account Information:</strong> Email address and authentication credentials required for login.</li>
            <li><strong>Inventory Data:</strong> Product listings, pricing, cost of goods sold, and platform fee data created within your account.</li>
            <li><strong>Camera &amp; Image Data:</strong> Product photos and live camera feed frames uploaded for AI Vision analysis. Camera frames are processed strictly to generate product information and are not stored permanently.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white pt-4">3. How We Use Information</h2>
          <p>
            We use collected data solely to provide, improve, and secure the Spadas AI application, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li>Calculating inventory values, gross profit margins, and sales velocity metrics.</li>
            <li>Generating AI-powered product listings and market comp pricing suggestions.</li>
            <li>Syncing inventory across your connected devices and platforms.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white pt-4">4. Data Security</h2>
          <p>
            We implement industry-standard encryption protocols (HTTPS/TLS) and secure database access controls (Supabase RLS) to protect your account data from unauthorized access, disclosure, or alteration.
          </p>

          <h2 className="text-xl font-semibold text-white pt-4">5. Contact Us</h2>
          <p>
            If you have any questions regarding this Privacy Policy, please contact us at:
            <br />
            <span className="text-blue-400 font-mono">support@spadas.tech</span> or <span className="text-blue-400 font-mono">deniedae@gmail.com</span>
          </p>
        </section>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Spadas AI. All rights reserved.
        </div>
      </div>
    </main>
  );
}
