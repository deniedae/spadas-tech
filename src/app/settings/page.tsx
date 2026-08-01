"use client";

import { useEffect, useState } from "react";
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

  async function loadUser() {
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
  }

  useEffect(() => {
    loadUser();
  }, [router]);

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
      });

      if (!response.ok) throw new Error("Checkout session failed.");

      const data = await response.json();

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
            <p className="font-medium">Free Beta</p>
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
        <div className="mt-5 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
          Coming Soon
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
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" aria-hidden="true" />
            AI Listing Generator (Coming Soon)
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
          Current Plan: <span className="font-medium text-foreground">Free Beta</span>
        </p>

        <button
          onClick={() => setConfirmUpgrade(true)}
          disabled={upgrading}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {upgrading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Upgrade to Pro
        </button>

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
