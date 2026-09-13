"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import {
  User,
  Shield,
  Sliders,
  Volume2,
  Download,
  Smartphone,
  AlertCircle,
  ShoppingBag,
  CheckCircle2,
  LinkIcon,
  Unlink,
  Zap,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  X,
  Sparkles,
  Crown,
  LogOut,
  Key,
  Mail,
  Settings,
  DollarSign,
  Check,
} from "lucide-react";
import SubscriptionPaywallModal from "@/components/subscription-paywall-modal";
import { CURRENCY_CONFIGS, SupportedCurrency, detectGeoCurrency } from "@/app/lib/currency-routing";

interface UserMeta {
  email: string;
}

type TabKey = "profile" | "marketplaces" | "audio" | "mobile";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
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
  const [confirmDisconnectEbay, setConfirmDisconnectEbay] = useState(false);
  const [ebayDisconnecting, setEbayDisconnecting] = useState(false);
  const [ebayHasDisconnected, setEbayHasDisconnected] = useState(false);
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
        toast.success("eBay seller account connected successfully!");
        window.history.replaceState({}, "", "/settings");
      }
      if (urlParams.get("ebayError")) {
        toast.error(`eBay Connection Error: ${urlParams.get("ebayError")}`);
        window.history.replaceState({}, "", "/settings");
      }
      if (urlParams.get("checkout") === "success") {
        setPlan("Pro");
        setPlanStatus("active");
        toast.success("Subscription upgraded! Welcome to Spadas Pro.", { duration: 6000 });
        window.history.replaceState({}, "", "/settings");
      }
      if (urlParams.get("checkout") === "canceled") {
        toast.info("Checkout was canceled. You can upgrade anytime.", { duration: 4000 });
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
      window.location.href = `/api/auth/ebay/connect?prompt=login&t=${Date.now()}`;
    } catch {
      toast.error("Failed to start eBay connection. Try again.");
      setEbayConnecting(false);
    }
  }

  async function handleDisconnectEbay() {
    setEbayDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/disconnect-ebay", {
        method: "POST",
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to disconnect eBay account");
      }

      setEbayConnected(false);
      setEbayHasDisconnected(true);
      setConfirmDisconnectEbay(false);
      toast.success("eBay disconnected. Click 'Reconnect eBay' to authorize");
    } catch (err: any) {
      console.error("Disconnect eBay error:", err);
      toast.error(err?.message || "Failed to disconnect eBay");
    } finally {
      setEbayDisconnecting(false);
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
        toast.success(`Currency configured: ${conf.flag} ${validCurr} (${conf.symbol})`);
      } else {
        toast.success(`Currency configured: ${validCurr}`);
      }
    }
  };

  const handleUpdateMarketplace = (newMkt: string) => {
    setDefaultMarketplace(newMkt);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_default_marketplace", newMkt);
      toast.success(`Default destination set to ${newMkt}`);
    }
  };

  const handleUpdateAutoAi = (val: boolean) => {
    setAutoAiDescriptions(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_auto_ai_descriptions", String(val));
      toast.success(val ? "Automated listing metadata enabled" : "Automated listing metadata disabled");
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
          toast.success("Spadas AI installed on device");
        }
        setDeferredPrompt(null);
      });
    } else {
      toast.info("PWA install available via browser menu (Add to Home Screen).");
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
      toast.success("Password recovery link dispatched to " + user.email);
    } catch (err: any) {
      toast.error(err?.message || "Could not dispatch recovery link.");
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
      toast.error("Sign out unsuccessful. Try again.");
      setLoggingOut(false);
    }
  }

  async function upgradeToPro() {
    setUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ planId: "starter", email: user?.email ?? "" }),
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

  const tabs = [
    { id: "profile" as TabKey, label: "Profile & Access", icon: User },
    { id: "marketplaces" as TabKey, label: "Marketplace Sync", icon: ShoppingBag, badge: ebayConnected ? "Active" : undefined },
    { id: "audio" as TabKey, label: "Audio & Sourcing Priors", icon: Volume2 },
    { id: "mobile" as TabKey, label: "Mobile APK & PWA", icon: Smartphone },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Reseller account configurations, audio thresholds, and marketplace sync.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 text-xs font-medium">
            <span className="text-zinc-500">Plan:</span>
            <span className={plan === "Pro" ? "text-cyan-400 font-bold" : "text-zinc-200"}>
              {plan}
            </span>
          </div>
          {plan !== "Pro" && (
            <button
              type="button"
              onClick={() => setConfirmUpgrade(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-950 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Upgrade ($10/mo)</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300 shadow-sm"
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
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Segmented Tab Navigation - Eliminates page scrolling */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-white text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-950" : "text-zinc-400"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    isActive
                      ? "bg-zinc-200 text-zinc-900"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}
      <div className="transition-all duration-150">
        {/* TAB 1: Profile & Access */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Identity & Status */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 p-5 space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-zinc-200 text-sm font-semibold">
                <User className="w-4 h-4 text-zinc-400" />
                <span>Account Identity</span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-xs font-medium text-zinc-500 block">Email Address</span>
                  {loading ? (
                    <div className="h-5 w-48 animate-pulse rounded bg-zinc-800 mt-1" />
                  ) : (
                    <span className="text-sm font-semibold text-white mt-0.5 block">{user?.email ?? "—"}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                  <div>
                    <span className="text-xs font-medium text-zinc-500 block">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Authenticated
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-zinc-500 block text-right">Plan</span>
                    <span className="text-xs font-semibold text-zinc-200 mt-0.5 block text-right">
                      {plan}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.05] flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetPassword}
                  disabled={resettingPassword}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-200 transition cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>Reset Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmLogout(true)}
                  disabled={loggingOut}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-400 transition cursor-pointer disabled:opacity-50"
                >
                  {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  <span>Log Out</span>
                </button>
              </div>
            </div>

            {/* Sourcing App Defaults */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 p-5 space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-zinc-200 text-sm font-semibold">
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Sourcing Defaults</span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1.5">
                    Operating Currency
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => handleUpdateCurrency(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-900/90 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 cursor-pointer"
                  >
                    <option value="AUD">AUD (Australian Dollar $)</option>
                    <option value="USD">USD (US Dollar $)</option>
                    <option value="EUR">EUR (Euro €)</option>
                    <option value="GBP">GBP (British Pound £)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1.5">
                    Primary Sourcing Marketplace
                  </label>
                  <select
                    value={defaultMarketplace}
                    onChange={(e) => handleUpdateMarketplace(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-900/90 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 cursor-pointer"
                  >
                    <option value="eBay">eBay Australia / Global</option>
                    <option value="Facebook Marketplace">Facebook Marketplace</option>
                    <option value="Depop">Depop</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-zinc-200 block">Automated AI Descriptions</span>
                    <span className="text-[11px] text-zinc-500 block">Populate SEO bullet specifics upon intake</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAiDescriptions}
                    onChange={(e) => handleUpdateAutoAi(e.target.checked)}
                    className="h-4 w-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Support Link Card */}
            <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-400">
                  Direct engineering contact for bug reports or custom telemetry integrations:
                </span>
              </div>
              <a
                href="mailto:deniedae@gmail.com?subject=Spadas%20Lens%20Feedback"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition shrink-0"
              >
                <span>Contact Engineering</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: Marketplace Sync */}
        {activeTab === "marketplaces" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 p-6 shadow-xl backdrop-blur-md space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">eBay Seller Hub</h2>
                      {ebayConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Linked
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-800 text-zinc-400 px-2 py-0.5 text-xs font-medium">
                          Not linked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      1-click publish and draft sync directly from Spadas Lens AR scanner into your eBay account.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={connectEbay}
                    disabled={ebayConnecting || ebayDisconnecting}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                      ebayConnected
                        ? "border border-white/[0.08] bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                        : "bg-white text-zinc-950 font-bold hover:bg-zinc-200 shadow-sm"
                    }`}
                  >
                    {ebayConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : ebayConnected || ebayHasDisconnected ? (
                      <>
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Reconnect eBay</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Connect eBay Account</span>
                      </>
                    )}
                  </button>

                  {ebayConnected && (
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnectEbay(true)}
                      disabled={ebayConnecting || ebayDisconnecting}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-400 transition cursor-pointer disabled:opacity-50"
                    >
                      {ebayDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Technical Telemetry Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-1">
                  <span className="text-xs font-medium text-zinc-500 block">OAuth Scope</span>
                  <span className="text-sm font-semibold text-zinc-200 block">sell.inventory, sell.fulfillment</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-1">
                  <span className="text-xs font-medium text-zinc-500 block">Token Refresh</span>
                  <span className="text-sm font-semibold text-zinc-200 block">Automated</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-1">
                  <span className="text-xs font-medium text-zinc-500 block">Publish Speed</span>
                  <span className="text-sm font-semibold text-zinc-200 block">~500ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Lens Audio & Priors */}
        {activeTab === "audio" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 p-6 shadow-xl backdrop-blur-md space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Lens AR Audio Chime Hurdle Rates</h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure real-time audio chime triggers when scanning items in the field. Synthesized audio only rings when both hurdle rates are satisfied.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Min Profit Slider */}
                <div className="rounded-xl border border-white/[0.05] bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-200">Minimum Net Profit</span>
                    <span className="text-sm font-bold text-zinc-100">
                      {CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}{minProfit} {defaultCurrency}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={minProfit}
                    onChange={(e) => handleUpdateMinProfit(Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}5</span>
                    <span>{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}50</span>
                    <span>{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}100</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">Quick set:</span>
                    {[15, 25, 40, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleUpdateMinProfit(val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                          minProfit === val
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min ROI % Slider */}
                <div className="rounded-xl border border-white/[0.05] bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-200">Minimum ROI</span>
                    <span className="text-sm font-bold text-zinc-100">
                      {minRoi}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="25"
                    value={minRoi}
                    onChange={(e) => handleUpdateMinRoi(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>0% (All Profitable)</span>
                    <span>100%</span>
                    <span>300%</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">Quick set:</span>
                    {[0, 50, 100, 150].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleUpdateMinRoi(val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                          minRoi === val
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Mobile APK & PWA */}
        {activeTab === "mobile" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D15]/80 p-6 shadow-xl backdrop-blur-md space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-base font-bold text-white">Spadas Lens Mobile App</h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Lightweight Android app or PWA for mobile scanning.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <a
                    href="/spadas-ai.apk"
                    download="spadas-ai.apk"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 px-4 py-2 text-xs font-bold hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Download .APK (Direct)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Install PWA</span>
                  </button>
                </div>
              </div>

              {/* Hardware Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-0.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>60 FPS Vision</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Sub-100ms optical comps</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Home Widget</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Live profit & draft count</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-0.5">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Quick Tile</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Android notification toggle</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.05] space-y-0.5">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Cloud Sync</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Seamless zero-bloat updates</p>
                </div>
              </div>

              {/* Collapsible 30-second guide */}
              <div className="rounded-xl border border-white/[0.05] bg-zinc-900/40 p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowApkGuide(!showApkGuide)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Need help installing the Android APK? (30-second guide)</span>
                  </div>
                  {showApkGuide ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                </button>

                {showApkGuide && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.05] text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">1. Download</span>
                      <p className="text-[11px] text-zinc-400">Download the ~982 KB APK directly to your phone.</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">2. Open</span>
                      <p className="text-[11px] text-zinc-400">Tap notification or open spadas-ai.apk in Downloads.</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">3. Launch</span>
                      <p className="text-[11px] text-zinc-400">Tap Install. If prompted, toggle &apos;Allow from this source&apos;.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {confirmUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Upgrade to Spadas Pro</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Unlock unlimited 60 FPS AR optical scans, bulk haul lot calculators, and automated 1-click cross-listing for $10 AUD/mo.
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmUpgrade(false);
                  void upgradeToPro();
                }}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer"
              >
                Confirm ($10/mo)
              </button>
              <button
                type="button"
                onClick={() => setConfirmUpgrade(false)}
                className="rounded-xl border border-white/[0.08] bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Confirm Sign Out?</h3>
            <p className="text-xs text-zinc-400">
              You will need to sign back in to access live scanning and portfolio metrics.
            </p>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmLogout(false);
                  void logout();
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-xl border border-white/[0.08] bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect eBay Confirmation Modal */}
      {confirmDisconnectEbay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Disconnect eBay?</h3>
            <p className="text-xs text-zinc-400">
              This will unlink your eBay seller credentials. You can reconnect anytime.
            </p>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDisconnectEbay}
                disabled={ebayDisconnecting}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
              >
                {ebayDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Disconnect"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDisconnectEbay(false)}
                disabled={ebayDisconnecting}
                className="rounded-xl border border-white/[0.08] bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Paywall Modal */}
      <SubscriptionPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </div>
  );
}
