"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import {
  User,
  Shield,
  Palette,
  MessageSquare,
  Info,
  Gem,
  Loader2,
  X,
} from "lucide-react";

interface UserMeta {
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);
  const [defaultMarketplace, setDefaultMarketplace] = useState("eBay");
  const [defaultCurrency, setDefaultCurrency] = useState("AUD");
  const [autoAiDescriptions, setAutoAiDescriptions] = useState(true);
  const [plan, setPlan] = useState("Free Beta");
  const [planStatus, setPlanStatus] = useState("inactive");

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setUser({ email: user.email ?? "" });
      setError(null);
    } catch {
      setError("Couldn't load your account. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadUser();
    });
    return () => cancelAnimationFrame(frame);
  }, [loadUser]);

  useEffect(() => {
    async function loadSubscriptionStatus() {
      try {
        const response = await fetch("/api/stripe/status");
        if (!response.ok) return;
        const data = await response.json();
        if (data?.plan) setPlan(data.plan);
        if (data?.status) setPlanStatus(data.status);
      } catch {
        // silently ignore status lookup failures for the settings page
      }
    }

    void loadSubscriptionStatus();
  }, []);

  async function resetPassword() {
    if (!user?.email) return;
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send reset email.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Signed out.");
      window.location.href = "/login";
    } catch {
      toast.error("Couldn't sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  async function upgradeToPro() {
    setUpgrading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user?.email ?? "" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Checkout session failed.");
      }

      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout.");
      setUpgrading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero — brand gradient */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-2 max-w-xl text-blue-100">
              Manage your account, security and application preferences.
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white/10 p-6 backdrop-blur md:block">
            <div className="text-sm text-blue-100">Version</div>
            <div className="text-2xl font-bold">Beta v0.9</div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => loadUser()}
            className="rounded bg-primary px-3 py-1 text-white hover:bg-primary/90"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="rounded p-1 text-destructive hover:bg-destructive/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile App Download */}
      <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-background p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              📱 Android Release (100% Free)
            </div>
            <h2 className="mt-2 text-xl font-bold">Download Spadas AI Mobile App</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Install the standalone Android app package directly onto your phone for fast mobile listing creation.
            </p>
          </div>
          <a
            href="/spadas-ai.apk"
            download
            className="inline-flex h-12 w-full sm:w-auto min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 font-semibold text-white shadow-md transition hover:opacity-90"
          >
            📥 Download .APK App
          </a>
        </div>
      </section>

      {/* Account */}
      <section
        aria-busy={loading}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
      >
        <div className="mb-6 flex items-center gap-2">
          <User size={22} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Account</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            {loading ? (
              <div className="mt-1 h-5 w-48 animate-pulse rounded bg-muted" />
            ) : (
              <p className="font-medium">{user?.email ?? "—"}</p>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Account Status</p>
            <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Active
            </span>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="font-semibold text-foreground flex items-center gap-2">
              {plan === "Pro" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  ✨ Spadas Pro (Unlimited)
                </span>
              ) : (
                plan
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <Shield size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Security</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password and account security.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={resetPassword}
            disabled={resettingPassword}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {resettingPassword && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Change Password
          </button>

          <button
            onClick={() => setConfirmLogout(true)}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2"
          >
            {loggingOut && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Log Out
          </button>
        </div>

        {/* Logout confirmation modal */}
        {confirmLogout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full text-center">
              <p className="mb-4 font-semibold text-lg">Confirm Logout?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setConfirmLogout(false);
                    logout();
                  }}
                  className="bg-destructive px-4 py-2 text-white rounded hover:bg-destructive/90"
                >
                  Logout
                </button>
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="px-4 py-2 rounded border hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <Palette size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Preferences</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how Spadas AI works for you.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Default marketplace</span>
            <select
              value={defaultMarketplace}
              onChange={(e) => setDefaultMarketplace(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
            >
              <option value="eBay">eBay</option>
              <option value="Facebook Marketplace">Facebook Marketplace</option>
              <option value="Vinted">Vinted</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Default currency</span>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
            >
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-sm">
            <span className="text-muted-foreground">Auto AI descriptions</span>
            <input
              type="checkbox"
              checked={autoAiDescriptions}
              onChange={(e) => setAutoAiDescriptions(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>
      </section>

      {/* Feedback */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <MessageSquare size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Feedback</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Help improve Spadas AI by reporting bugs or suggesting new features.
        </p>
        <a
          href="mailto:deniedae@gmail.com?subject=Spadas%20AI%20Beta%20Feedback"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Report a Bug
        </a>
      </section>

      {/* About */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <Info size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Spadas AI</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Version v0.9 Beta</p>

        <div className="mt-5 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
            Inventory Management
          </p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
            Profit Tracking
          </p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
            Analytics Dashboard
          </p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
            AI Listing Generator
          </p>
        </div>
      </section>

      {/* Subscription */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <Gem size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Subscription</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Current Plan: <span className="font-medium text-foreground">{plan}</span>
        </p>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
          Status: <span className="font-medium text-foreground">{planStatus}</span>
        </p>

        {plan === "Pro" ? (
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ✨ Pro Plan Active — You have unlimited access to all AI features.
          </div>
        ) : (
          <button
            onClick={() => setConfirmUpgrade(true)}
            disabled={upgrading}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {upgrading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Upgrade to Pro
          </button>
        )}

        {confirmUpgrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full text-center">
              <p className="mb-4 font-semibold text-lg">Confirm Upgrade to Pro?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setConfirmUpgrade(false);
                    upgradeToPro();
                  }}
                  className="bg-primary px-4 py-2 text-white rounded hover:bg-primary/90"
                >
                  Upgrade
                </button>
                <button
                  onClick={() => setConfirmUpgrade(false)}
                  className="px-4 py-2 rounded border hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
