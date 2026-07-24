"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data.user) {
      toast.error("Login failed - no user session found.");
      return;
    }

    toast.success("Welcome back!");
    // Full page load so the middleware sees the new auth cookie.
    // router.push() does client-side navigation which skips middleware.
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900">
          Login
        </h1>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-gray-700" htmlFor="email">
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
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-medium text-gray-700" htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing In..." : "Login"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
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
