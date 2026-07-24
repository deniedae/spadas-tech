"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { User, Shield, Palette, MessageSquare, Info, Gem, Loader2 } from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";

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

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
       const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  router.push("/login");
  return;
}


        if (cancelled) return;
        setUser({ email: user.email ?? "" });
      } catch (err) {
        if (!cancelled) {
          setError("Couldn't load your account. Please try refreshing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function resetPassword() {
    if (!user?.email) return;
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't send reset email."
      );
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
    } catch (err) {
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

      if (!response.ok) {
        throw new Error("Checkout session failed.");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't start checkout."
      );
      setUpgrading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
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
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="rounded p-1 text-red-600 hover:bg-red-100"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Account */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
        <div className="mb-6 flex items-center gap-2">
          <User size={22} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Account</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            {loading ? (
              <div className="mt-1 h-5 w-48 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="font-medium text-gray-900">{user?.email ?? "—"}</p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500">Account Status</p>
            <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Active
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Plan</p>
            <p className="font-medium text-gray-900">Free Beta</p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <Shield size={20} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Security</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Manage your password and account security.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={resetPassword}
            disabled={resettingPassword}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {resettingPassword && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Change Password
          </button>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white transition hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            {loggingOut && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Log Out
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <Palette size={20} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Preferences</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Customize how Spadas AI works for you.
        </p>
        <div className="mt-5 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
          Coming Soon
        </div>
      </div>

      {/* Feedback */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Feedback</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Help improve Spadas AI by reporting bugs or suggesting new features.
        </p>
        <a
          href="mailto:deniedae@gmail.com?subject=Spadas%20AI%20Beta%20Feedback"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Report a Bug
        </a>
      </div>

      {/* About */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <Info size={20} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Spadas AI</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">Version v0.9 Beta</p>

        <div className="mt-5 space-y-2 text-sm text-gray-700">
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
      </div>

      {/* Subscription */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <Gem size={20} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Subscription</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Current Plan: <span className="font-semibold text-gray-900">Free Beta</span>
        </p>

        <button
          onClick={upgradeToPro}
          disabled={upgrading}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {upgrading && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
