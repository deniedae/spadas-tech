"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { signInWithGoogle } from "@/app/lib/firebase";
import { syncUserProfileToFirestore } from "@/app/lib/firestore-listings";
import { toast } from "sonner";
import {
  Zap,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Camera,
} from "lucide-react";

interface Props {
  initialMode?: "login" | "signup";
}

export function SpadasAuthCard({ initialMode = "signup" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get("redirect") || "/lens";

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGoogleSignIn() {
    setErrorMsg("");
    setGoogleLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTarget)}`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        const lower = (error.message || "").toLowerCase();
        if (
          lower.includes("unsupported provider") ||
          lower.includes("validation_failed") ||
          lower.includes("not enabled") ||
          lower.includes("provider")
        ) {
          setErrorMsg("Google Sign-In is not enabled in your Supabase dashboard yet. Please enter your email & password below to sign in.");
          toast.info("Please sign in with your email & password below.");
        } else {
          setErrorMsg(error.message);
          toast.error(error.message);
        }
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Google Sign-In failed. Please sign in with email.");
      toast.error("Google Sign-In failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          toast.error(error.message);
          return;
        }

        if (data.user && !data.session) {
          toast.success("Account created! Please check your email to verify.");
          setMode("login");
          return;
        }

        toast.success("Welcome to Spadas AI!");
        window.location.href = redirectTarget;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          toast.error(error.message);
          return;
        }

        if (!data.user) {
          setErrorMsg("No account found with these credentials.");
          return;
        }

        toast.success("Welcome back!");
        window.location.href = redirectTarget;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Zap className="h-5 w-5 text-slate-950 fill-slate-950" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            SPADAS<span className="text-cyan-400">.AI</span>
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs font-bold text-slate-400 hover:text-white transition"
        >
          ← Back to Homepage
        </Link>
      </header>

      {/* Center Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg("");
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                mode === "signup"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                mode === "login"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>

          <div className="text-left space-y-1">
            <h2 className="text-2xl font-black text-white">
              {mode === "signup" ? "Get Started with Spadas AI" : "Welcome Back"}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === "signup"
                ? "Scan thrift finds, view live eBay sold comps, and auto-list."
                : "Sign in to access your inventory catalog and live scanner."}
            </p>
          </div>

          {/* 1-Click Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 rounded-2xl border border-slate-700 bg-slate-950/80 hover:bg-slate-850 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Or with email
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {errorMsg && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="seller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="auth-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none transition pr-11 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === "signup" ? "Create Free Account" : "Sign In to Spadas"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Features List */}
          <div className="border-t border-slate-800 pt-3 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Continuous 60FPS AR camera scanner with sold comps</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>1-Click automated background publishing to eBay AU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Spadas AI. Australian Reseller Intelligence.
      </footer>
    </div>
  );
}
