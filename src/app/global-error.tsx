"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary Caught]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full saas-card rounded-3xl p-8 border border-rose-500/30 shadow-2xl space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto">
            <AlertTriangle className="h-8 w-8 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-300 border border-rose-500/30 uppercase tracking-widest">
              Unexpected System Exception
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Something went wrong
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error.message || "An unexpected error occurred during execution. Don't worry, your data is safe."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
