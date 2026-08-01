"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("signupForm");
    if (saved) {
      const data = JSON.parse(saved);
      setEmail(data.email || "");
      setPassword(data.password || "");
      setConfirmPassword(data.confirmPassword || "");
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        "signupForm",
        JSON.stringify({ email, password, confirmPassword })
      );
    }
  }, [email, password, confirmPassword, loading]);

  function validatePassword(pwd: string) {
    const regex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    return regex.test(pwd);
  }

  function getPasswordStrength(pwd: string) {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    return score;
  }

  function announceToScreenReader(message: string) {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }

  const strength = getPasswordStrength(password);
  const strengthText = ["Too weak", "Weak", "Moderate", "Strong"][strength];
  const strengthColor = ["red", "amber", "yellow", "green"][strength];

  const canSubmit =
    email.trim() !== "" &&
    password.trim() !== "" &&
    confirmPassword.trim() !== "" &&
    password === confirmPassword &&
    validatePassword(password);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords don't match.");
      announceToScreenReader("Passwords don't match.");
      return;
    }

    if (!validatePassword(password)) {
      setErrorMsg(
        "Password must be at least 6 characters, include uppercase letter and a number."
      );
      announceToScreenReader(
        "Password must be at least 6 characters, include uppercase letter and a number."
      );
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
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

    if (data.user && !data.session) {
      const msg = "Account created! Check your email to confirm your account.";
      toast.success(msg);
      announceToScreenReader(msg);
      window.location.href = "/login";
      return;
    }

    const msg = "Account created! Welcome to Spadas AI.";
    toast.success(msg);
    announceToScreenReader(msg);
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg border border-border"
        noValidate
      >
        <h1 className="mb-6 text-center text-3xl font-bold text-card-foreground">
          Create Account
        </h1>

        <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

        <div className="mb-4">
          <label
            htmlFor="email"
            className="mb-2 block font-medium text-card-foreground"
          >
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
            aria-invalid={!!errorMsg}
            aria-describedby="email-error"
          />
        </div>

        <div className="relative mb-4">
          <label
            htmlFor="password"
            className="mb-2 block font-medium text-card-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={!!errorMsg}
            aria-describedby="password-error"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          {password && (
            <p className={`mt-1 text-sm font-semibold text-${strengthColor}-600`}>
              Password strength: {strengthText}
            </p>
          )}
        </div>

        <div className="relative mb-6">
          <label
            htmlFor="confirm-password"
            className="mb-2 block font-medium text-card-foreground"
          >
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-invalid={!!errorMsg}
            aria-describedby="confirm-password-error"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground focus:outline-none"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {errorMsg && (
          <p
            className="mb-4 rounded bg-destructive/10 px-4 py-2 text-sm text-destructive"
            role="alert"
          >
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {loading && (
            <Loader2
              className="absolute left-4 h-5 w-5 animate-spin"
              aria-hidden="true"
            />
          )}
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
