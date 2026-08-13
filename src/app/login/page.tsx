"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import SocialAuthProviders from "@/components/social-auth-providers";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const liveRegionRef = useRef<HTMLDivElement>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      announceToScreenReader(error.message);
      return;
    }

    if (!data.user) {
      const msg = "Login failed - no user session found.";
      setErrorMsg(msg);
      toast.error(msg);
      announceToScreenReader(msg);
      return;
    }

    const successMsg = "Welcome back!";
    toast.success(successMsg);
    announceToScreenReader(successMsg);

    const redirectUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect") || "/dashboard"
        : "/dashboard";

    // Use full page load so Supabase SSR cookies are fresh for Next.js Middleware
    window.location.href = redirectUrl;
  }

  function announceToScreenReader(message: string) {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg"
        noValidate
      >
        <h1 className="mb-6 text-center text-3xl font-black text-gray-900">
          Login to Spadas AI
        </h1>

        <div className="mb-6">
          <SocialAuthProviders redirectTo="/dashboard" />
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <span className="relative bg-white px-3 text-xs font-bold uppercase text-gray-400">Or Email & Password</span>
        </div>

        <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

        <div className="mb-4">
          <label
            className="mb-2 block font-medium text-gray-700"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={!!errorMsg}
            aria-describedby="email-error"
          />
        </div>

        <div className="mb-6 relative">
          <label
            className="mb-2 block font-medium text-gray-700"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={!!errorMsg}
            aria-describedby="password-error"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {errorMsg && (
          <p
            className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700"
            role="alert"
          >
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {loading ? "Signing In..." : "Login"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}
