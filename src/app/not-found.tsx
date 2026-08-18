import Link from "next/link";
import { Camera, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full saas-card rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto">
          <Camera className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-black text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
            404 — Page Not Found
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Lost in the Matrix?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The page or scan record you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/lens"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition"
          >
            <Camera className="h-4 w-4" />
            <span>Open Spadas Lens AR</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
