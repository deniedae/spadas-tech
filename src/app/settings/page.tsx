"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  X,
  Crown,
  Headphones,
  MessageSquare,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Inbox,
  Video,
  Upload,
  CheckCircle2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import dynamic from "next/dynamic";
const SubscriptionPaywallModal = dynamic(
  () => import("@/components/subscription-paywall-modal"),
  { ssr: false }
);
import { CURRENCY_CONFIGS, SupportedCurrency, detectGeoCurrency } from "@/app/lib/currency-routing";
import { openSpadasSupport } from "@/components/dashboard-support-desk";
import { isOwnerEmail } from "@/app/lib/auth-admin";

const DashboardSupportDesk = dynamic(() => import("@/components/dashboard-support-desk"), {
  ssr: false,
});


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
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activeTicket, setActiveTicket] = useState<{
    ticketId: string;
    status: string;
    createdAt: number;
    issueDescription?: string;
  } | null>(null);

  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [uploadingMux, setUploadingMux] = useState(false);
  const [muxProgress, setMuxProgress] = useState(0);
  const [muxStatusText, setMuxStatusText] = useState("");

  // Load active Mux showcase video
  useEffect(() => {
    fetch("/api/mux/showcase")
      .then((res) => res.json())
      .then((data) => {
        if (data.playbackId) setMuxPlaybackId(data.playbackId);
      })
      .catch(() => {});
  }, []);

  const handleMuxUpload = async (file: File) => {
    if (!file) return;
    try {
      setUploadingMux(true);
      setMuxProgress(10);
      setMuxStatusText("Requesting Mux direct upload...");

      const initRes = await fetch("/api/mux/upload", { method: "POST" });
      const initData = await initRes.json();
      if (!initData.success || !initData.uploadUrl) {
        throw new Error(initData.error || "Failed to initialize upload");
      }

      setMuxStatusText("Uploading video file directly to Mux...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", initData.uploadUrl, true);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setMuxProgress(Math.round((e.loaded / e.total) * 80) + 10);
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      setMuxProgress(92);
      setMuxStatusText("Processing video stream with Mux...");

      let readyPlaybackId: string | null = null;
      let attempts = 0;
      while (attempts < 30 && !readyPlaybackId) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        const stRes = await fetch(`/api/mux/upload?uploadId=${encodeURIComponent(initData.uploadId)}`);
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData.playbackId) {
            readyPlaybackId = stData.playbackId;
            break;
          }
        }
      }

      if (!readyPlaybackId) throw new Error("Processing took longer than expected. Please check back shortly.");

      await fetch("/api/mux/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbackId: readyPlaybackId }),
      });

      setMuxPlaybackId(readyPlaybackId);
      toast.success("Scanner video uploaded and published to Mux!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingMux(false);
      setMuxProgress(0);
      setMuxStatusText("");
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("spadas_support_desk_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.ticket) {
          setActiveTicket(parsed.ticket);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.hash === "#support") {
        setTimeout(() => {
          const el = document.getElementById("support");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 150);
      }
    }
  }, []);

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

  async function handleDeleteAccount() {
    if (deleteAccountInput !== "DELETE") return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Account deletion failed");
      }

      await supabase.auth.signOut();
      toast.success("Your account has been permanently deleted.");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Could not delete account. Contact support@spadas.tech");
      setDeletingAccount(false);
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 pt-4 text-zinc-100">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your account profile, sourcing defaults, notification chimes, and marketplace connections.</p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded transition text-rose-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Account Section */}
      <section className="glass-card card-specular p-5 sm:p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">Account &amp; Security</h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400">Profile</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Email</label>
            <div className="text-sm font-mono text-zinc-200 bg-white/[0.03] rounded-xl p-3 border border-white/[0.08]">
              {loading ? "Loading..." : user?.email ?? "—"}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={resetPassword}
              disabled={resettingPassword}
              className="bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.1] text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {resettingPassword ? "Sending link..." : "Reset password"}
            </button>
            <button
              onClick={() => setConfirmLogout(true)}
              disabled={loggingOut}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="mt-4 pt-4 border-t border-rose-500/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Danger Zone
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Permanently deletes your account and all associated data. This cannot be undone.</p>
              </div>
              <button
                id="delete-account-btn"
                onClick={() => {
                  setDeleteAccountInput("");
                  setConfirmDeleteAccount(true);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 bg-rose-500/8 hover:bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        <div className="glass-divider my-4" />

        {/* Sourcing Preferences Sub-section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight">Sourcing Preferences</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Operating Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => handleUpdateCurrency(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-cyan-500/50 transition"
              >
                <option value="AUD">🇦🇺 AUD (Australian Dollar)</option>
                <option value="USD">🇺🇸 USD (US Dollar)</option>
                <option value="EUR">🇪🇺 EUR (Euro)</option>
                <option value="GBP">🇬🇧 GBP (British Pound)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Primary Reseller Marketplace</label>
              <select
                value={defaultMarketplace}
                onChange={(e) => handleUpdateMarketplace(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-cyan-500/50 transition"
              >
                <option value="eBay">eBay Australia / Global</option>
                <option value="Facebook Marketplace">Facebook Marketplace</option>
                <option value="Depop">Depop</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="autoAi"
              checked={autoAiDescriptions}
              onChange={(e) => handleUpdateAutoAi(e.target.checked)}
              className="h-4 w-4 rounded bg-black/40 border border-white/[0.15] accent-cyan-500 cursor-pointer"
            />
            <label htmlFor="autoAi" className="text-xs text-zinc-300 font-medium select-none cursor-pointer">
              Generate automated AI copywriting descriptions for new items
            </label>
          </div>
        </div>
      </section>

      {/* Billing Section */}
      <section className="glass-card card-specular p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">Subscription &amp; Usage</h2>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            plan === "Pro"
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              : "bg-white/[0.04] border border-white/[0.08] text-zinc-400"
          }`}>
            {plan}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div>
            <p className="text-xs text-zinc-400">Current Reseller Tier</p>
            <p className="text-lg font-bold text-white tracking-tight mt-0.5">{plan === "Pro" ? "Spadas Pro Unlimited" : "Free Starter Plan"}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{plan === "Pro" ? "Unlimited instant AR scans, automated copywriting, and priority live eBay sync." : "10 free optical scans daily. Upgrade anytime."}</p>
          </div>
          {plan !== "Pro" && (
            <button
              onClick={() => setConfirmUpgrade(true)}
              className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition cursor-pointer active:scale-95 shadow-md shrink-0"
            >
              Upgrade to Pro ($10/mo)
            </button>
          )}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="glass-card card-specular p-5 sm:p-6 rounded-2xl space-y-5">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Audio &amp; Chime Telemetry</h2>
          <p className="text-xs text-zinc-400 mt-1">Configure audio synthesizer thresholds for live camera scanning. Cash chime plays when both criteria are met.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-zinc-300">
              <span className="uppercase tracking-wider text-zinc-400">Minimum Net Profit</span>
              <span className="text-cyan-400 font-mono font-bold">{CURRENCY_CONFIGS[defaultCurrency]?.symbol || "$"}{minProfit}</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={minProfit}
              onChange={(e) => handleUpdateMinProfit(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-zinc-300">
              <span className="uppercase tracking-wider text-zinc-400">Minimum ROI Target</span>
              <span className="text-cyan-400 font-mono font-bold">{minRoi}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="25"
              value={minRoi}
              onChange={(e) => handleUpdateMinRoi(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Connected Accounts Section */}
      <section className="glass-card card-specular p-5 sm:p-6 rounded-2xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Connected Marketplaces</h2>
          <p className="text-xs text-zinc-400 mt-1">Directly sync drafts and publish 1-click listings from your live camera scans.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-white">eBay Seller Hub</p>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                ebayConnected
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-white/[0.04] border border-white/[0.08] text-zinc-500"
              }`}>
                {ebayConnected ? "● Live Connected" : "Not Linked"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">1-click item specifics publishing to eBay Australia with OAuth credentials.</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={connectEbay}
              disabled={ebayConnecting || ebayDisconnecting}
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm"
            >
              {ebayConnecting ? "Connecting..." : ebayConnected || ebayHasDisconnected ? "Reconnect eBay" : "Connect eBay"}
            </button>
            {ebayConnected && (
              <button
                onClick={() => setConfirmDisconnectEbay(true)}
                disabled={ebayConnecting || ebayDisconnecting}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </section>

      <hr className="border-zinc-800" />

      {/* Help & Support Desk Section */}
      <section id="support" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Help &amp; Support Desk</h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                24/7 AI ACTIVE
              </span>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Live AI resale specialist advisory, Australian eBay comp diagnosis, and direct developer escalation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openSpadasSupport({ mode: "chat" })}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Open Support Window</span>
          </button>
        </div>

        {/* 2-Column Responsive Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 24/7 AI Resale Specialist */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-zinc-700 transition">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI Resale Copilot</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">Gemini 2.5 Flash • Real-Time Diagnostics</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono text-zinc-300">
                  Instant Response
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Trained on Australian eBay selling policies, multi-market cross-border arbitrage, sell-through velocity formulas, and Spadas Lens AR camera heuristics.
              </p>

              {/* Quick Prompt Suggestions */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Quick Diagnostic Questions:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "🇦🇺 AU vs US Comps", prompt: "How does the geo-strict eBay Australia comps engine work?" },
                    { label: "💰 Net Margin Formula", prompt: "What exact fees and deductions are in the Net Profit calculation?" },
                    { label: "⚡ Fast Flip / STR", prompt: "How is the sell-through rate velocity computed?" },
                    { label: "🛒 Publish to eBay", prompt: "How do I connect and publish items directly to eBay AU?" },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => openSpadasSupport({ mode: "chat", prompt: chip.prompt })}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition cursor-pointer text-left"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openSpadasSupport({ mode: "chat" })}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold transition active:scale-[0.99] cursor-pointer shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start AI Consultation</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </button>
          </div>

          {/* Card 2: Human Developer Escalation / Developer Ticket Console */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-zinc-700 transition">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    {isOwnerEmail(user?.email) ? <Inbox className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {isOwnerEmail(user?.email) ? "Developer Ticket Console" : "Engineering Escalation"}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {isOwnerEmail(user?.email) ? "Lead Developer Mode • deniedae@gmail.com" : "Core Development & API Team"}
                    </p>
                  </div>
                </div>

                {isOwnerEmail(user?.email) ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-medium">
                    Owner Access
                  </span>
                ) : activeTicket ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-medium">
                    #{activeTicket.ticketId} Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono text-zinc-300">
                    SLA &lt; 2h
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {isOwnerEmail(user?.email)
                  ? "View incoming reseller tickets, read diagnostic chat context, and dispatch verified in-app responses directly to users."
                  : "Direct dispatch to Spadas engineers for unresolved marketplace synchronization failures, billing inquiries, or high-priority feature requests."}
              </p>

              {isOwnerEmail(user?.email) ? (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-medium text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Administrator Privileges Verified</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Respond to tickets with in-app chat injection or 1-tap Gmail replies.
                  </p>
                </div>
              ) : activeTicket ? (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                    <span>Ticket: {activeTicket.ticketId}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 bg-amber-500/20 rounded font-bold">
                      {activeTicket.status}
                    </span>
                  </div>
                  {activeTicket.issueDescription && (
                    <p className="text-[11px] text-zinc-300 line-clamp-2">
                      &quot;{activeTicket.issueDescription}&quot;
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Logged {new Date(activeTicket.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-medium text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Priority Queue for Pro Resellers</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Engineers inspect full system context, browser runtime state, and marketplace logs.
                  </p>
                </div>
              )}
            </div>

            {isOwnerEmail(user?.email) ? (
              <button
                type="button"
                onClick={() => openSpadasSupport({ mode: "inbox" })}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs transition active:scale-[0.99] cursor-pointer shadow-md"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Open Developer Ticket Inbox</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-black/70" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openSpadasSupport({ mode: "escalate" })}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-semibold transition active:scale-[0.99] cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeTicket ? "Update or View Developer Ticket" : "Escalate to Developer"}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-zinc-400" />
              </button>
            )}

            {/* Owner Section: Scanner Showcase Video Manager */}
            {isOwnerEmail(user?.email) && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Scanner Video Showcase
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Video Engine Active
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  This video streams in the landing page demo and the in-camera AR scanner tutorial guide.
                </p>

                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between">
                  <span className="text-zinc-500">Active Video ID:</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {muxPlaybackId || "No video uploaded yet"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="file"
                    id="settings-mux-file"
                    accept="video/*"
                    className="hidden"
                    disabled={uploadingMux}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMuxUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingMux}
                    onClick={() => document.getElementById("settings-mux-file")?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingMux ? "Uploading to Mux..." : "Upload New Scanner Video"}</span>
                  </button>
                </div>

                {uploadingMux && (
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full transition-all duration-300"
                        style={{ width: `${muxProgress}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-cyan-400">{muxStatusText}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>


      {/* Modals */}
      {confirmUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Upgrade to Pro</h3>
            <p className="text-zinc-400 mb-6">Unlock unlimited scans and automated listings for $10/mo.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmUpgrade(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmUpgrade(false);
                  void upgradeToPro();
                }}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-4 py-2 rounded"
              >
                Confirm ($10/mo)
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Log out</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmLogout(false);
                  void logout();
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDisconnectEbay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Disconnect eBay</h3>
            <p className="text-zinc-400 mb-6">This will unlink your seller account. You can reconnect anytime.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDisconnectEbay(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnectEbay}
                disabled={ebayDisconnecting}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {ebayDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SubscriptionPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
      <DashboardSupportDesk />

      {/* Delete Account Confirmation Modal */}
      {confirmDeleteAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete account permanently?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">All your data — listings, scans, history, and eBay connections — will be wiped immediately. This cannot be reversed.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Type <span className="text-rose-400 font-mono">DELETE</span> to confirm
              </label>
              <input
                id="delete-account-confirm-input"
                type="text"
                value={deleteAccountInput}
                onChange={(e) => setDeleteAccountInput(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDeleteAccount(false)}
                disabled={deletingAccount}
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="delete-account-confirm-btn"
                onClick={handleDeleteAccount}
                disabled={deleteAccountInput !== "DELETE" || deletingAccount}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95 disabled:cursor-not-allowed"
              >
                {deletingAccount ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>

            <p className="text-center text-[10px] text-zinc-600">
              Need help instead?{" "}
              <a href="mailto:support@spadas.tech" className="text-zinc-400 underline hover:text-white transition">support@spadas.tech</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
