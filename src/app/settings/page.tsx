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
  Gem,
  Loader2,
  X,
  Sliders,
  Volume2,
  Sparkles,
  Download,
  Smartphone,
  AlertCircle,
  ShoppingBag,
  CheckCircle2,
  LinkIcon,
  Zap,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  FileCheck,
} from "lucide-react";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import { CURRENCY_CONFIGS, SupportedCurrency, detectGeoCurrency } from "@/app/lib/currency-routing";

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
  const [ebayConnected, setEbayConnected] = useState(false);
  const [ebayConnecting, setEbayConnecting] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [defaultMarketplace, setDefaultMarketplace] = useState("eBay");
  const [defaultCurrency, setDefaultCurrency] = useState<SupportedCurrency>("AUD");
  const [autoAiDescriptions, setAutoAiDescriptions] = useState(true);
  const [plan, setPlan] = useState("Free Beta");
  const [planStatus, setPlanStatus] = useState("active");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showApkGuide, setShowApkGuide] = useState(false);
  const [minProfit, setMinProfit] = useState(20);
  const [minRoi, setMinRoi] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("ebayConnected") === "true") {
        setEbayConnected(true);
        toast.success("✅ eBay seller account connected successfully!");
        // Clean URL
        window.history.replaceState({}, "", "/settings");
      }
      if (urlParams.get("ebayError")) {
        toast.error(`eBay Connection Error: ${urlParams.get("ebayError")}`);
        window.history.replaceState({}, "", "/settings");
      }
    }
  }, []);

  // Check if user already has eBay connected
  useEffect(() => {
    async function checkEbayStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const authHeaders: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };
      const res = await fetch("/api/marketplaces/status", { headers: authHeaders }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setEbayConnected(Boolean(data.isConnected));
      }
    }
    void checkEbayStatus();
  }, []);

  async function connectEbay() {
    setEbayConnecting(true);
    try {
      // Redirect to eBay OAuth — browser follows the redirect chain
      window.location.href = "/api/auth/ebay/connect";
    } catch {
      toast.error("Failed to start eBay connection. Try again.");
      setEbayConnecting(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCurrency = localStorage.getItem("spadas_selected_currency");
      if (savedCurrency && (savedCurrency === "AUD" || savedCurrency === "USD" || savedCurrency === "EUR" || savedCurrency === "GBP")) {
        setDefaultCurrency(savedCurrency as SupportedCurrency);
      } else {
        const detected = detectGeoCurrency().currency;
        setDefaultCurrency(detected);
      }

      const savedMarketplace = localStorage.getItem("spadas_default_marketplace");
      if (savedMarketplace) setDefaultMarketplace(savedMarketplace);

      const savedAutoAi = localStorage.getItem("spadas_auto_ai_descriptions");
      if (savedAutoAi !== null) setAutoAiDescriptions(savedAutoAi === "true");

      const saved = localStorage.getItem("spadas_lens_chime_thresholds");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.minProfit === "number") setMinProfit(parsed.minProfit);
          if (typeof parsed.minRoi === "number") setMinRoi(parsed.minRoi);
        } catch {}
      }
    }
  }, []);

  const handleUpdateCurrency = (newCurrency: string) => {
    const validCurr = (["AUD", "USD", "EUR", "GBP"].includes(newCurrency) ? newCurrency : "AUD") as SupportedCurrency;
    setDefaultCurrency(validCurr);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_selected_currency", validCurr);
      window.dispatchEvent(new Event("spadas-currency-changed"));
      window.dispatchEvent(new Event("storage"));
      const conf = CURRENCY_CONFIGS[validCurr];
      if (conf) {
        toast.success(`Currency saved: ${conf.flag} ${validCurr} (${conf.symbol})`);
      } else {
        toast.success(`Currency saved: ${validCurr}`);
      }
    }
  };

  const handleUpdateMarketplace = (newMkt: string) => {
    setDefaultMarketplace(newMkt);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_default_marketplace", newMkt);
      toast.success(`Default marketplace set to ${newMkt}`);
    }
  };

  const handleUpdateAutoAi = (val: boolean) => {
    setAutoAiDescriptions(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_auto_ai_descriptions", String(val));
      toast.success(val ? "Auto AI descriptions enabled" : "Auto AI descriptions disabled");
    }
  };

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
          toast.success("Spadas AI app installed on your device!");
        }
        setDeferredPrompt(null);
      });
    } else {
      toast.info("PWA installation supported via browser menu (Add to Home Screen).");
    }
  };

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !currentUser) {
          router.push("/login");
          return;
        }

        setUser({ email: currentUser.email ?? "" });

        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: Record<string, string> = {};
        if (session?.access_token) {
          authHeaders["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/stripe/status", { headers: authHeaders });
        if (res.ok) {
          const statusData = await res.json();
          if (statusData.active || statusData.plan === "Pro") {
            setPlan("Pro");
            setPlanStatus("active");
          } else {
            setPlan("Free Beta");
            setPlanStatus("active");
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [router]);

  async function resetPassword() {
    if (!user?.email) return;
    setResettingPassword(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (resetErr) throw resetErr;
      toast.success("Password reset email sent to " + user.email);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send reset email.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email ?? "" }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        toast.success("Redirecting to Stripe Checkout ($10 AUD/mo)...");
        window.location.href = data.url;
      } else {
        setIsPaywallOpen(true);
        setUpgrading(false);
      }
    } catch {
      setIsPaywallOpen(true);
      setUpgrading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero — Polished Dark Glass SaaS Banner */}
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-black text-cyan-300">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              SPADAS AI • CONTROL CENTER
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-2">
              System Settings & Preferences
            </h1>
            <p className="mt-1 max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Manage your reseller profile, audio chimes, PWA app deployment, and $10 AUD/mo Pro subscription.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-md md:block text-right">
            <div className="text-xs font-semibold text-slate-400">System Build</div>
            <div className="text-xl font-black text-cyan-400">v0.9 Production</div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-300 shadow-md"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile App Download Banner */}
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-300">
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                OFFICIAL ANDROID APP & PWA
              </span>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-cyan-400">
                v1.1.0 (Signed Release)
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300">
                ~982 KB Ultra-Light
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Spadas AI Mobile Sourcing Suite
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Install the standalone Android application for 60 FPS hardware-accelerated barcode scanning, Home Screen profit widgets, pull-down Quick Settings tiles, and instant auto-updating.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <a
              href="/spadas-ai.apk"
              download="spadas-ai.apk"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 text-xs font-black text-slate-950 shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download .APK (Direct)</span>
            </a>

            <button
              type="button"
              onClick={handleInstallApp}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/90 px-5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 transition cursor-pointer"
            >
              <Smartphone className="h-4 w-4 text-cyan-400" />
              <span>Install PWA (iOS / Chrome)</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-extrabold">
              <Zap className="h-4 w-4" />
              <span>60 FPS GPU Scanner</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hardware-accelerated barcode and label detector with instant retail sound synthesis.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold">
              <Layers className="h-4 w-4" />
              <span>Home Screen Widget</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live widget updates with your daily projected profit and scanned draft count.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold">
              <Sliders className="h-4 w-4" />
              <span>Quick Settings Tile</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pull down Android notification shade to trigger camera scans from any app.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-extrabold">
              <ShieldCheck className="h-4 w-4" />
              <span>Cloud Auto-Updates</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ultra-light ~1 MB package with zero bloat and seamless cloud feature syncing.
            </p>
          </div>
        </div>

        {/* 30-Second APK Installation Guide Toggle */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowApkGuide(!showApkGuide)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" />
              <span>Need help installing the Android APK? (30-second guide)</span>
            </div>
            {showApkGuide ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showApkGuide && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs animate-fade-in">
              <div className="space-y-1">
                <span className="font-extrabold text-cyan-400 block">1. Download APK</span>
                <p className="text-[11px] text-slate-400">
                  Tap the green <strong>Download .APK</strong> button above. The ~982 KB file will download in ~2 seconds.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-extrabold text-cyan-400 block">2. Open Download</span>
                <p className="text-[11px] text-slate-400">
                  Tap the notification or open <code>spadas-ai.apk</code> from your device’s <strong>Downloads</strong> folder.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-extrabold text-cyan-400 block">3. Tap Install</span>
                <p className="text-[11px] text-slate-400">
                  Tap <strong>Install</strong>. If prompted by Android, toggle <em>&quot;Allow installation from this source&quot;</em>.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Marketplace Integrations */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <ShoppingBag className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">Marketplace Integrations</h2>
            <p className="text-xs text-slate-400">Connect your seller accounts for 1-click inventory publishing.</p>
          </div>
        </div>

        {/* eBay Connection Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-2xl">
              🛍️
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">eBay Seller Hub</span>
                {ebayConnected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {ebayConnected
                  ? "Your eBay account is linked. 1-click publish is active."
                  : "Connect to publish listings directly to your eBay Seller Hub."}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="ebay-connect-btn"
            onClick={connectEbay}
            disabled={ebayConnecting}
            className={`inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black transition active:scale-95 cursor-pointer disabled:opacity-50 ${
              ebayConnected
                ? "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:opacity-90"
            }`}
          >
            {ebayConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ebayConnected ? (
              <>
                <LinkIcon className="h-4 w-4" />
                <span>Reconnect eBay</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                <span>Connect eBay Account</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Subscription Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Gem className="h-6 w-6 text-amber-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">Subscription & Plan Access</h2>
            <p className="text-xs text-slate-400">Manage your subscription status and unlocked reseller features.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Active Tier</div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white">{plan}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-black text-emerald-400">
                {planStatus.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3">
            {plan === "Pro" ? (
              <div className="w-full sm:w-auto inline-flex items-center gap-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 px-5 py-3 text-xs font-black text-emerald-300 shadow-lg shadow-emerald-500/10">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>👑 SPADAS PRO ACTIVE ($10 AUD/mo)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmUpgrade(true)}
                disabled={upgrading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 px-6 py-3.5 text-xs font-black text-slate-950 shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>👑 Upgrade to Spadas Pro ($10 AUD/mo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Upgrade Confirmation Modal */}
        {confirmUpgrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Upgrade to Spadas Pro?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Unlock unlimited 60FPS AR camera scans, 1-click cross-listing, and thrifting haul calculators for $10 AUD/mo.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmUpgrade(false);
                    void upgradeToPro();
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  Confirm ($10/mo)
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUpgrade(false)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Account Profile */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <User className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">Account Details</h2>
            <p className="text-xs text-slate-400">Authenticated user identity and profile metadata.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
            {loading ? (
              <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
            ) : (
              <span className="font-bold text-white text-sm">{user?.email ?? "—"}</span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Account Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Membership Plan</span>
            <span className="font-bold text-cyan-300 text-sm">{plan}</span>
          </div>
        </div>
      </section>

      {/* Spadas Lens AR Audio Thresholds */}
      <section className="rounded-3xl border border-cyan-500/20 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Sliders className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">Spadas Lens AR Chime Thresholds</h2>
            <p className="text-xs text-slate-400">Configure hands-free audio chime alerts during live AR camera scanning.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-slate-200">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                Minimum Net Profit Threshold
              </span>
              <span className="text-emerald-400 font-black text-sm bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                {CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}{minProfit} {defaultCurrency}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Audio chime triggers only when scanned item estimated profit is greater than or equal to this amount.
            </p>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={minProfit}
              onChange={(e) => handleUpdateMinProfit(Number(e.target.value))}
              className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
              <span>{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}5 {defaultCurrency}</span>
              <span>{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}50 {defaultCurrency}</span>
              <span>{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}100 {defaultCurrency}</span>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-slate-200">
                <Sliders className="h-4 w-4 text-cyan-400" />
                Minimum ROI % Threshold
              </span>
              <span className="text-cyan-400 font-black text-sm bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                {minRoi}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Audio chime triggers only when estimated return on investment (ROI) meets or exceeds this percentage.
            </p>
            <input
              type="range"
              min="0"
              max="300"
              step="25"
              value={minRoi}
              onChange={(e) => handleUpdateMinRoi(Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
              <span>0% (All Profitable)</span>
              <span>100%</span>
              <span>300%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Palette className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">App Preferences</h2>
            <p className="text-xs text-slate-400">Customize default options across Spadas AI.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="space-y-2 text-xs font-bold text-slate-300">
            <span className="block">Default Marketplace</span>
            <select
              value={defaultMarketplace}
              onChange={(e) => handleUpdateMarketplace(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="eBay">eBay</option>
              <option value="Facebook Marketplace">Facebook Marketplace</option>
              <option value="Depop">Depop</option>
            </select>
          </label>

          <label className="space-y-2 text-xs font-bold text-slate-300">
            <span className="block">Default Currency</span>
            <select
              value={defaultCurrency}
              onChange={(e) => handleUpdateCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="AUD">AUD (🇦🇺 $)</option>
              <option value="USD">USD (🇺🇸 $)</option>
              <option value="EUR">EUR (🇪🇺 €)</option>
              <option value="GBP">GBP (🇬🇧 £)</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-bold text-slate-300 cursor-pointer">
            <span>Auto AI Descriptions</span>
            <input
              type="checkbox"
              checked={autoAiDescriptions}
              onChange={(e) => handleUpdateAutoAi(e.target.checked)}
              className="h-4 w-4 accent-cyan-400 rounded cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Security & Account Access */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Shield className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">Security & Password</h2>
            <p className="text-xs text-slate-400">Manage account authentication and active sessions.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetPassword}
            disabled={resettingPassword}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {resettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Change Password</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-xs font-bold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {loggingOut && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Log Out</span>
          </button>
        </div>

        {/* Logout Modal */}
        {confirmLogout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
              <h3 className="text-xl font-black text-white">Confirm Logout?</h3>
              <p className="text-xs text-slate-400">You will need to sign back in to access Spadas Lens AR.</p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmLogout(false);
                    void logout();
                  }}
                  className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-rose-500 active:scale-95 transition cursor-pointer"
                >
                  Logout
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Support & Feedback */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <MessageSquare className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-white">Support & Feedback</h2>
            <p className="text-xs text-slate-400">Report bugs or request new features directly from our engineering team.</p>
          </div>
        </div>

        <a
          href="mailto:deniedae@gmail.com?subject=Spadas%20AI%20Feedback"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-sm"
        >
          <MessageSquare className="h-4 w-4 text-cyan-400" />
          <span>Send Direct Feedback</span>
        </a>
      </section>

      {/* Paywall Modal Fallback */}
      <SubscriptionPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </div>
  );
}
