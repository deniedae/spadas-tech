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
  Sliders,
  Volume2,
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [minProfit, setMinProfit] = useState(20);
  const [minRoi, setMinRoi] = useState(0);
  const [ebayConnected, setEbayConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("ebayConnected") === "true") {
        toast.success("Successfully connected your eBay seller account!");
        setEbayConnected(true);
      }
      if (urlParams.get("ebayError")) {
        toast.error(`eBay Connection Error: ${urlParams.get("ebayError")}`);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spadas_lens_chime_thresholds");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.minProfit === "number") setMinProfit(parsed.minProfit);
          if (typeof parsed.minRoi === "number") setMinRoi(parsed.minRoi);
        } catch {
          // fallback
        }
      }
    }
  }, []);

  const handleUpdateMinProfit = (val: number) => {
    setMinProfit(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_lens_chime_thresholds", JSON.stringify({ minProfit: val, minRoi }));
    }
  };

  const handleUpdateMinRoi = (val: number) => {
    setMinRoi(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_lens_chime_thresholds", JSON.stringify({ minProfit, minRoi: val }));
    }
  };

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === "accepted") {
          toast.success("Spadas AI app installed on your Android device!");
        }
        setDeferredPrompt(null);
      });
    } else {
      toast.info("📱 Android Installation: Tap your browser menu (3 dots) & select 'Install App' or 'Add to Home Screen'!");
    }
  };

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
      const userEmail = user.email ?? "";
      setUser({ email: userEmail });
      
      // Lifetime Pro lock for owner account
      if (userEmail.toLowerCase() === "deniedae@gmail.com") {
        setPlan("Pro");
        setPlanStatus("active");
      }

      const { data: tokenData } = await supabase
        .from("user_marketplace_tokens")
        .select("is_connected")
        .eq("user_id", user.id)
        .eq("platform", "ebay")
        .single();

      if (tokenData?.is_connected) {
        setEbayConnected(true);
      }

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
        if (user?.email?.toLowerCase() === "deniedae@gmail.com") {
          setPlan("Pro");
          setPlanStatus("active");
          return;
        }

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
  }, [user?.email]);

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
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href="/spadas-ai.apk"
              download="spadas-ai.apk"
              className="inline-flex h-12 w-full sm:w-auto min-w-[170px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 font-semibold text-white shadow-md transition hover:opacity-90"
            >
              📥 Download .APK App
            </a>

            <button
              type="button"
              onClick={handleInstallApp}
              className="inline-flex h-12 w-full sm:w-auto min-w-[170px] items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 font-semibold text-blue-600 dark:text-blue-400 shadow-sm transition hover:bg-blue-500/20 cursor-pointer"
            >
              📱 Install App (PWA)
            </button>
          </div>
        </div>
      </section>

      {/* Marketplace OAuth Integrations */}
      <section className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-background p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              🛒 Direct 1-Click Publishing
            </div>
            <h2 className="text-xl font-bold">eBay Seller Hub OAuth Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your official eBay Seller account to publish AI listings directly into live/draft eBay inventory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/30 px-4 py-2.5 text-xs font-black text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              <span>⏳ Direct 1-Click eBay Sync — Coming Soon</span>
            </div>
          </div>
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

      {/* Spadas Lens AR Preferences */}
      <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-card p-6 shadow-sm transition hover:shadow-md space-y-6">
        <div className="flex items-center gap-2">
          <Sliders size={20} className="text-cyan-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Spadas Lens AR Chime Thresholds</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure when the hands-free audio chime triggers during live AR camera scanning.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2 text-foreground">
                <Volume2 className="h-4 w-4 text-emerald-500" />
                Minimum Net Profit Threshold
              </span>
              <span className="text-emerald-500 font-extrabold text-base">${minProfit} AUD</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Audio chime triggers only when scanned item estimated profit is greater than or equal to this amount.
            </p>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={minProfit}
              onChange={(e) => handleUpdateMinProfit(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-muted rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>$5 AUD</span>
              <span>$50 AUD</span>
              <span>$100 AUD</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2 text-foreground">
                <Sliders className="h-4 w-4 text-cyan-500" />
                Minimum ROI % Threshold
              </span>
              <span className="text-cyan-500 font-extrabold text-base">{minRoi}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Audio chime triggers only when estimated return on investment (ROI) meets or exceeds this percentage.
            </p>
            <input
              type="range"
              min="0"
              max="300"
              step="25"
              value={minRoi}
              onChange={(e) => handleUpdateMinRoi(Number(e.target.value))}
              className="w-full accent-cyan-500 h-2 bg-muted rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0% (All Profitable)</span>
              <span>100%</span>
              <span>300%</span>
            </div>
          </div>
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
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400 border border-emerald-500/20 shadow-sm">
            👑 Spadas Pro Active ($10 AUD/mo) — Unlimited access to 60FPS AR scanning & 1-click cross-listing.
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
