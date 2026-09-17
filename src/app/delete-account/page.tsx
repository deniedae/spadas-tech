import Link from "next/link";
import { Trash2, ArrowLeft, ShieldCheck, Mail } from "lucide-react";

export const metadata = {
  title: "Delete My Account · Spadas AI",
  description:
    "Request permanent deletion of your Spadas AI account and all associated data. No login required.",
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spadas AI
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-8">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-7 w-7 text-rose-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Delete My Account</h1>
            <p className="text-sm text-slate-400 mt-1">
              Request permanent deletion of your Spadas account and all associated data.
            </p>
          </div>
        </div>

        {/* What gets deleted */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">What will be permanently deleted</h2>
          <ul className="space-y-2 text-slate-300 text-sm leading-relaxed">
            {[
              "Your account email address and authentication credentials",
              "All saved item listings, drafts, and inventory data",
              "Scan history and identified item records",
              "Haul session data and batch manifests",
              "eBay marketplace connection and OAuth tokens",
              "Support ticket history",
              "All subscription and billing associations",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-rose-400">✕</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 pt-2">
            Deletion is permanent and cannot be reversed. Any active subscriptions will be cancelled immediately
            with no partial refunds per our{" "}
            <Link href="/terms" className="text-blue-400 underline hover:text-blue-300 transition">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        {/* In-app deletion option */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-white">Delete directly in the app</h2>
          </div>
          <p className="text-sm text-slate-400">
            If you have access to your account, the fastest way to delete is inside the app:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
            <li>Sign in to Spadas AI</li>
            <li>Navigate to <strong>Settings</strong></li>
            <li>Scroll to <strong>Account &amp; Security</strong></li>
            <li>
              Click the <strong className="text-rose-400">Delete Account</strong> button under{" "}
              <em>Danger Zone</em>
            </li>
            <li>Type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-rose-400 font-mono text-xs">DELETE</code> to confirm</li>
          </ol>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 mt-2 text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.1] px-4 py-2 rounded-xl transition"
          >
            Go to Settings →
          </Link>
        </section>

        {/* Email request option */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-blue-400 shrink-0" />
            <h2 className="text-base font-bold text-white">Request deletion by email</h2>
          </div>
          <p className="text-sm text-slate-400">
            If you can&apos;t access your account, email us from the address associated with your Spadas account
            and we will process the deletion within 48 hours.
          </p>
          <a
            href="mailto:support@spadas.tech?subject=Account%20Deletion%20Request&body=Please%20permanently%20delete%20my%20Spadas%20AI%20account%20and%20all%20associated%20data.%0A%0AAccount%20email%3A%20"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition underline"
          >
            <Mail className="h-4 w-4" />
            support@spadas.tech
          </a>
          <p className="text-xs text-slate-600 pt-1">
            Subject line: <em>Account Deletion Request</em> — include your account email in the body.
          </p>
        </section>

        {/* Privacy policy link */}
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          Read our{" "}
          <Link href="/privacy" className="text-blue-400 underline hover:text-blue-300 transition">
            Privacy Policy
          </Link>{" "}
          to understand how your data is stored and handled.
          <br />
          © {new Date().getFullYear()} Spadas AI. All rights reserved.
        </div>
      </div>
    </main>
  );
}
