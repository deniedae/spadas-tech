"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user && !data.session) {
      toast.success("Account created! Check your email to confirm your account.");
      window.location.href = "/login";
      return;
    }

    toast.success("Account created! Welcome to Spadas AI.");
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg border border-border"
      >
        <h1 className="mb-6 text-center text-3xl font-bold text-card-foreground">
          Create Account
        </h1>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-card-foreground" htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-card-foreground" htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-medium text-card-foreground" htmlFor="confirm-password">
            Confirm Password
          </label>

          <input
            id="confirm-password"
            type="password"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-primary p-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80"
          >
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
