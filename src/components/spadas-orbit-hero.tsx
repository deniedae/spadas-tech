"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";
import SocialAuthProviders from "@/components/social-auth-providers";

export function SpadasOrbitHero() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"landing" | "login" | "signup">("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const liveRegionRef = useRef<HTMLDivElement>(null);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setLoading(true);

    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
        return;
      }

      if (data.user && !data.session) {
        toast.success("Account created! Please check your email to verify.");
        setAuthMode("login");
        return;
      }

      toast.success("Welcome to Spadas AI!");
      window.location.href = "/dashboard";
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
        return;
      }

      if (!data.user) {
        setErrorMsg("Login failed - no user session found.");
        return;
      }

      toast.success("Welcome back!");
      const redirectUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect") || "/dashboard"
          : "/dashboard";
      window.location.href = redirectUrl;
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col items-center justify-between overflow-hidden select-none px-4 py-8">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/20 to-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between z-20 py-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
              <Zap className="h-5 w-5 text-cyan-400 fill-cyan-400" />
            </div>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            SPADAS<span className="text-cyan-400">.AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {authMode !== "landing" ? (
            <button
              onClick={() => setAuthMode("landing")}
              className="text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Back
            </button>
          ) : (
            <button
              onClick={() => setAuthMode("login")}
              className="text-xs font-bold text-slate-300 hover:text-white transition px-4 py-2 rounded-full border border-slate-800 bg-slate-950/60 backdrop-blur-md cursor-pointer"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="relative w-full max-w-md flex flex-col items-center justify-center z-20 my-auto text-center">
        {authMode === "landing" ? (
          <>
            {/* Concentric Orbiting Marketplace Rings */}
            <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] flex items-center justify-center mb-6">
              {/* Outer Orbit Ring */}
              <div className="absolute inset-0 rounded-full border border-slate-800/80 pointer-events-none animate-[spin_60s_linear_infinite]" />
              
              {/* Middle Orbit Ring */}
              <div className="absolute inset-8 rounded-full border border-cyan-500/20 pointer-events-none animate-[spin_40s_linear_infinite_reverse]" />
              
              {/* Inner Orbit Ring */}
              <div className="absolute inset-16 rounded-full border border-slate-800/80 pointer-events-none animate-[spin_25s_linear_infinite]" />

              {/* Central Glowing 3D Spadas Hexagon Core */}
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-1 shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse">
                <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-slate-950">
                  <div className="h-12 w-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                    <Zap className="h-7 w-7 text-cyan-300 fill-cyan-300 drop-shadow-[0_0_12px_#22d3ee]" />
                  </div>
                </div>
              </div>

              {/* Orbiting Marketplace Badges (Concentric Satellites) */}
              {/* eBay */}
              <div className="absolute top-4 left-1/4 -translate-x-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-white text-slate-950 font-black text-xs shadow-xl border border-white/40 animate-bounce">
                <span className="tracking-tighter">e<span className="text-red-500">b</span><span className="text-amber-500">a</span><span className="text-blue-500">y</span></span>
              </div>

              {/* Facebook Marketplace */}
              <div className="absolute top-1/4 right-3 flex items-center justify-center h-10 w-10 rounded-full bg-[#1877F2] text-white font-black text-xs shadow-xl border border-blue-400/40">
                f
              </div>

              {/* Depop */}
              <div className="absolute bottom-16 left-3 flex items-center justify-center h-10 w-10 rounded-full bg-[#FF2300] text-white font-black text-xs shadow-xl border border-red-400/40">
                d
              </div>

              {/* Poshmark */}
              <div className="absolute bottom-4 right-1/4 flex items-center justify-center h-10 w-10 rounded-full bg-[#79242F] text-white font-black text-xs shadow-xl border border-pink-400/40">
                P
              </div>

              {/* GOAT */}
              <div className="absolute top-6 right-8 flex items-center justify-center px-2.5 py-1 rounded-full bg-black text-white font-black text-[10px] tracking-widest border border-slate-700 shadow-xl">
                GOAT
              </div>

              {/* StockX */}
              <div className="absolute bottom-1/3 right-1 flex items-center justify-center h-9 w-9 rounded-full bg-[#006340] text-white font-black text-xs shadow-xl border border-emerald-400/40">
                ✕
              </div>

              {/* Floating Memoji Seller Avatars */}
              <div className="absolute top-0 right-1/3 text-2xl animate-pulse">
                🧔🏻‍♂️
              </div>
              <div className="absolute bottom-1/4 left-8 text-2xl animate-pulse">
                👱🏻‍♀️
              </div>
              <div className="absolute bottom-6 left-1/3 text-2xl animate-pulse">
                🧑🏾‍🦱
              </div>
            </div>

            {/* Viral Selling Headline */}
            <div className="space-y-2 mb-8">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                Sell your stuff<br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  in seconds.
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto font-medium">
                Point, snap, or pan. Instant AUD market values, multi-photo listings, and 1-tap eBay cross-listing.
              </p>
            </div>

            {/* High-Converting Primary Action Buttons */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-base shadow-[0_0_35px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Get started</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Already have an account? <span className="text-cyan-400 underline font-extrabold">Log in</span>
              </button>
            </div>
          </>
        ) : (
          /* Glassmorphic Auth Form (Login / Signup) */
          <div className="w-full rounded-3xl bg-slate-950/90 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-left animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 mb-3 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                <Zap className="h-6 w-6 text-cyan-400 fill-cyan-400" />
              </div>
              <h2 className="text-2xl font-black text-white">
                {authMode === "signup" ? "Create your Account" : "Welcome back"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === "signup"
                  ? "Start identifying and flipping thrift items in seconds."
                  : "Sign in to access your listings, scanner, and comps."}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seller@example.com"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400 font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{authMode === "signup" ? "Create Free Account" : "Sign In"}</span>
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-400">
              {authMode === "signup" ? (
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="hover:text-white transition cursor-pointer"
                >
                  Already have an account? <span className="text-cyan-400 font-bold underline">Log in</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="hover:text-white transition cursor-pointer"
                >
                  Need an account? <span className="text-cyan-400 font-bold underline">Sign up free</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer with Flying Cash Emoji Accents */}
      <footer className="relative w-full max-w-md text-center z-20 pt-4">
        {/* Flying Cash Emojis */}
        <div className="absolute -top-6 left-2 text-2xl animate-bounce pointer-events-none">
          💨
        </div>
        <div className="absolute -top-6 right-2 text-2xl animate-bounce pointer-events-none">
          💸
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
          By tapping Get started, you agree to our{" "}
          <Link href="/privacy" className="text-slate-300 underline hover:text-white">
            Terms of Service
          </Link>{" "}
          and acknowledge our{" "}
          <Link href="/privacy" className="text-slate-300 underline hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
