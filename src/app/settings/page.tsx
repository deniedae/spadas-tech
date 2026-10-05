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
  Mail,
  HelpCircle,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  TriangleAlert,
  Zap,
  ExternalLink,
  Send,
  Sliders,
  DollarSign,
  TrendingUp,
  Globe,
  Camera,
  Layers,
  ShoppingBag,
} from "lucide-react";
import dynamic from "next/dynamic";
import { openPlayStoreReview } from "@/components/in-app-review-modal";
import { CURRENCY_CONFIGS, SupportedCurrency, detectGeoCurrency } from "@/app/lib/currency-routing";
import {
  purchaseGooglePlaySubscription,
  openGooglePlaySubscriptionManager,
  checkGooglePlayBillingDiagnostics,
  type BillingDiagnostics,
} from "@/lib/google-play-billing";

const SubscriptionPaywallModal = dynamic(
  () => import("@/components/subscription-paywall-modal"),
  { ssr: false }
);
const DashboardSupportDesk = dynamic(
  () => import("@/components/dashboard-support-desk"),
  { ssr: false }
);

interface UserMeta {
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication & Profile
  const [resettingPassword, setResettingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Subscription & Billing
  const [plan, setPlan] = useState<"Pro" | "Free Beta">("Free Beta");
  const [planStatus, setPlanStatus] = useState("active");
  const [upgrading, setUpgrading] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [billingDiag, setBillingDiag] = useState<BillingDiagnostics | null>(null);
  const [checkingDiag, setCheckingDiag] = useState(false);
  const [showDiagPanel, setShowDiagPanel] = useState(false);

  // Sourcing & Camera Preferences
  const [defaultMarketplace, setDefaultMarketplace] = useState("eBay");
  const [defaultCurrency, setDefaultCurrency] = useState<SupportedCurrency>("AUD");
  const [autoAiDescriptions, setAutoAiDescriptions] = useState(true);
  const [minProfit, setMinProfit] = useState(20);
  const [minRoi, setMinRoi] = useState(50);

  // Connected Accounts (eBay)
  const [ebayConnected, setEbayConnected] = useState(false);
  const [ebayConnecting, setEbayConnecting] = useState(false);
  const [confirmDisconnectEbay, setConfirmDisconnectEbay] = useState(false);
  const [ebayDisconnecting, setEbayDisconnecting] = useState(false);
  const [ebayHasDisconnected, setEbayHasDisconnected] = useState(false);

  // Account Deletion
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Customer Support Center
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportCategory, setSupportCategory] = useState("billing");
  const [supportMessage, setSupportMessage] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [supportTicketSubmitted, setSupportTicketSubmitted] = useState<{
    ticketId: string;
    email: string;
  } | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Detect Android device
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  // Load User, Billing, and Marketplace Status in Parallel
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

        const email = currentUser.email ?? "";
        setUser({ email });
        setSupportEmail(email);

        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: Record<string, string> = {};
        if (session?.access_token) {
          authHeaders["Authorization"] = `Bearer ${session.access_token}`;
        }

        const [billingRes, ebayRes] = await Promise.allSettled([
          fetch("/api/billing/status", { headers: authHeaders }),
          fetch("/api/marketplaces/status", { headers: authHeaders }),
        ]);

        if (billingRes.status === "fulfilled" && billingRes.value.ok) {
          const statusData = await billingRes.value.json().catch(() => ({}));
          if (statusData.active || statusData.plan === "Pro" || statusData.status === "active") {
            setPlan("Pro");
            setPlanStatus("active");
          } else {
            setPlan("Free Beta");
            setPlanStatus("active");
          }
        }

        if (ebayRes.status === "fulfilled" && ebayRes.value.ok) {
          const ebayData = await ebayRes.value.json().catch(() => ({}));
          setEbayConnected(Boolean(ebayData.isConnected));
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [router]);

  // Load Preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCurrency = localStorage.getItem("spadas_selected_currency");
      if (savedCurrency && ["AUD", "USD", "EUR", "GBP"].includes(savedCurrency)) {
        setDefaultCurrency(savedCurrency as SupportedCurrency);
      } else {
        setDefaultCurrency(detectGeoCurrency().currency);
      }

      const savedMarketplace = localStorage.getItem("spadas_default_marketplace");
      if (savedMarketplace) setDefaultMarketplace(savedMarketplace);

      const savedAutoAi = localStorage.getItem("spadas_auto_ai_descriptions");
      if (savedAutoAi !== null) setAutoAiDescriptions(savedAutoAi === "true");

      const savedThresholds = localStorage.getItem("spadas_lens_chime_thresholds");
      if (savedThresholds) {
        try {
          const parsed = JSON.parse(savedThresholds);
          if (typeof parsed.minProfit === "number") setMinProfit(parsed.minProfit);
          if (typeof parsed.minRoi === "number") setMinRoi(parsed.minRoi);
        } catch {}
      }

      // Check URL parameters for redirects
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
        toast.success("🎉 Welcome to Spadas Pro! Unlimited scanning unlocked.", { duration: 6000 });
        window.history.replaceState({}, "", "/settings");
      }
      if (urlParams.get("checkout") === "canceled") {
        toast.info("Checkout was canceled. Upgrade anytime.", { duration: 4000 });
        window.history.replaceState({}, "", "/settings");
      }
      if (window.location.hash === "#support") {
        setTimeout(() => {
          document.getElementById("support")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  // Update Currency
  const handleUpdateCurrency = (newCurrency: string) => {
    const valid = (["AUD", "USD", "EUR", "GBP"].includes(newCurrency) ? newCurrency : "AUD") as SupportedCurrency;
    setDefaultCurrency(valid);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_selected_currency", valid);
      window.dispatchEvent(new Event("spadas-currency-changed"));
      window.dispatchEvent(new Event("storage"));
      const conf = CURRENCY_CONFIGS[valid];
      toast.success(`Currency updated: ${conf?.flag || ""} ${valid} (${conf?.symbol || "$"})`);
    }
  };

  // Update Marketplace
  const handleUpdateMarketplace = (mkt: string) => {
    setDefaultMarketplace(mkt);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_default_marketplace", mkt);
      toast.success(`Default destination set to ${mkt}`);
    }
  };

  // Update Auto AI descriptions
  const handleUpdateAutoAi = (val: boolean) => {
    setAutoAiDescriptions(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("spadas_auto_ai_descriptions", String(val));
      toast.success(val ? "Automated item copywriting enabled" : "Automated item copywriting disabled");
    }
  };

  // Update Chime Thresholds
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

  // Upgrade to Pro via Google Play Subscription
  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await purchaseGooglePlaySubscription();
      if (res.active) {
        toast.success("🎉 Welcome to Spadas Pro! Unlimited scanning unlocked.");
        setPlan("Pro");
        setPlanStatus("active");
        window.location.reload();
        return;
      }
      if (res.canceled && res.dismissedByUser) {
        return;
      }
      if (res.error) {
        toast.error(res.error);
        if (isAndroid) {
          setShowDiagPanel(true);
          void runBillingDiagnostics();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to start Google Play checkout. Please try again.");
    } finally {
      setUpgrading(false);
    }
  }

  // Play Billing Diagnostics for Android
  async function runBillingDiagnostics() {
    setCheckingDiag(true);
    setShowDiagPanel(true);
    try {
      const res = await checkGooglePlayBillingDiagnostics();
      setBillingDiag(res);
      if (res.skuFound) {
        toast.success("Google Play Billing is active and ready!");
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to test billing connection.");
    } finally {
      setCheckingDiag(false);
    }
  }

  // Connect & Disconnect eBay
  function connectEbay() {
    setEbayConnecting(true);
    try {
      window.location.href = `/api/auth/ebay/connect?prompt=login&t=${Date.now()}`;
    } catch {
      toast.error("Failed to connect eBay. Please try again.");
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to disconnect eBay");
      }

      setEbayConnected(false);
      setEbayHasDisconnected(true);
      setConfirmDisconnectEbay(false);
      toast.success("eBay seller account unlinked successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Could not disconnect eBay account.");
    } finally {
      setEbayDisconnecting(false);
    }
  }

  // Reset Password
  async function resetPassword() {
    if (!user?.email) return;
    setResettingPassword(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (resetErr) throw resetErr;
      toast.success(`Password reset link dispatched to ${user.email}`);
    } catch (err: any) {
      toast.error(err?.message || "Could not send password recovery email.");
    } finally {
      setResettingPassword(false);
    }
  }

  // Logout
  async function logout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      toast.error("Sign out failed. Please try again.");
      setLoggingOut(false);
    }
  }

  // Delete Account Permanently
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
      toast.success("Your account and associated data have been permanently deleted.");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Could not delete account. Contact support@spadas.tech");
      setDeletingAccount(false);
    }
  }

  // Submit Support Ticket to Customer Support Desk
  async function handleSendSupportTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!supportMessage.trim() || !supportEmail.trim()) {
      toast.error("Please provide your email and issue description.");
      return;
    }

    setSubmittingSupport(true);
    try {
      const categoryLabels: Record<string, string> = {
        billing: "Billing & Subscriptions",
        scanning: "Camera & Daily Scans",
        ebay: "eBay Account Connection",
        feature: "Feature Request",
        general: "General Reseller Question",
      };

      const res = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: supportName.trim() || user?.email?.split("@")[0] || "Spadas Reseller",
          userEmail: supportEmail.trim(),
          issueDescription: `[${categoryLabels[supportCategory] || "General"}] ${supportMessage.trim()}`,
          metadata: {
            source: "settings_support_desk",
            plan,
            currency: defaultCurrency,
            platform: isAndroid ? "android_app" : "web_browser",
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ticketId) {
        throw new Error(data?.error || "Could not send support ticket");
      }

      setSupportTicketSubmitted({
        ticketId: data.ticketId,
        email: supportEmail.trim(),
      });
      setSupportMessage("");
      toast.success(`Support ticket #${data.ticketId} received!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit support ticket. Please email support@spadas.tech");
    } finally {
      setSubmittingSupport(false);
    }
  }

  const FAQS = [
    {
      q: "How do the 10 free daily scans work?",
      a: "Every registered free account receives 10 complimentary camera scans every 24 hours. Your quota automatically resets every day at midnight UTC. Upgrading to Spadas Pro ($10 AUD/mo) unlocks unlimited 60FPS AR scans with zero daily limits.",
    },
    {
      q: "How does Spadas calculate net profit and sold comps?",
      a: "Spadas Lens runs real-time queries against eBay Australia (and global sold archives). Our automated algorithm calculates realistic net profit by deducting your purchase cost, estimated parcel shipping, and eBay's ~13.4% category selling fees and fixed processing charges.",
    },
    {
      q: "How do I connect and publish drafts directly to eBay?",
      a: "In the 'Connected Marketplaces' section above, tap 'Connect eBay' to authorize your seller credentials via official eBay OAuth. Once linked, any thrift find identified in Spadas Lens can be published directly into your eBay Seller Hub with pre-filled item specifics in 1 tap.",
    },
    {
      q: "How do I manage or cancel my Spadas Pro subscription?",
      a: "All subscriptions are securely processed through Google Play Billing. You can pause, adjust, or cancel your Pro subscription anytime with 1 tap directly inside Google Play Store > Profile > Payments & Subscriptions. There are zero lock-ins or hidden cancellation fees.",
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 pt-4 px-4 sm:px-6 text-zinc-100">
      {/* Header with Account Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Settings</h1>
            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                plan === "Pro"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-blue-500/15 border border-blue-500/30 text-blue-400"
              }`}
            >
              {plan === "Pro" ? "Pro Unlimited" : "Free Plan (10 Scans/Day)"}
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Manage your account credentials, daily scan quotas, sourcing defaults, and customer support.
          </p>
        </div>

        {plan !== "Pro" && (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={upgrading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {upgrading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Upgrade to Pro ($10 AUD/mo)</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded transition text-rose-400 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 1. ACCOUNT & PROFILE ────────────────────────────────────────────── */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Account &amp; Security</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Your authenticated credentials and session management.</p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400">
            Profile
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Email</label>
            <div className="flex items-center justify-between rounded-xl bg-black/40 border border-zinc-800 px-3.5 py-2.5 text-sm font-mono text-zinc-200">
              <span>{loading ? "Loading account..." : user?.email || "—"}</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={resetPassword}
              disabled={resettingPassword}
              className="bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.1] text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {resettingPassword ? "Sending reset link..." : "Reset password via email"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              disabled={loggingOut}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>
        </div>

        {/* Google Play Rating & Community Review Card */}
        <div className="rounded-xl p-4 border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900/60 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm tracking-wider">★★★★★</span>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  Reseller Community
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">Rate Spadas Lens on Google Play</h3>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                Your 5-star review helps fellow flippers discover Spadas and keeps live Australian sold comps fast and updated.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPlayStoreReview()}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <span>Leave a Review</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. SUBSCRIPTION & USAGE ─────────────────────────────────────────── */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Subscription &amp; Scan Quotas</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Manage your reseller membership tier and scanning limits.</p>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              plan === "Pro"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                : "bg-blue-500/15 border border-blue-500/30 text-blue-400"
            }`}
          >
            {plan === "Pro" ? "Pro Member" : "Free Tier"}
          </span>
        </div>

        {plan === "Pro" ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/30 border border-emerald-500/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Spadas Pro Unlimited</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Unlimited 60FPS AR camera scans, live eBay Australia &amp; US sold comps, 1-tap cross-listing, and 100% ad-free experience.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={openGooglePlaySubscriptionManager}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
                title="Manage or cancel your subscription in Google Play Store"
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span>Manage in Play Store</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-black/30 border border-zinc-800">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Free Account Quota: 10 Scans / Day</p>
                <p className="text-xs text-zinc-400">
                  Every free account receives 10 complimentary scans per 24 hours. Resets daily at midnight UTC.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                10 Scans Daily
              </span>
            </div>

            {/* High-Converting Pro Upgrade Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-indigo-950/30 border border-blue-500/30 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h3 className="text-base font-bold text-white">Upgrade to Spadas Pro</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                      $10 AUD / month
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Engineered for high-volume op-shoppers and marketplace resellers. Source with 10x speed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {upgrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAndroid ? "Connecting Google Play..." : "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isAndroid ? "Upgrade with Google Play ($10 AUD/mo)" : "Upgrade to Pro ($10 AUD/mo)"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Unlimited 60FPS AR scans &amp; barcode lookups</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Live eBay Australia sold comps &amp; sell-through rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>100% Ad-Free uninterrupted camera workflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>1-Click direct eBay listing sync with item specifics</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Secured by Google Play Billing · Cancel anytime with 1 tap in Play Store</span>
              </div>

              {/* Android Play Billing Diagnostics Toggle */}
              {isAndroid && (
                <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                  <button
                    type="button"
                    onClick={runBillingDiagnostics}
                    disabled={checkingDiag}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                  >
                    {checkingDiag ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Play Billing connection...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>{billingDiag ? "Re-test Play Billing Connection" : "Test Play Billing Connection"}</span>
                      </>
                    )}
                  </button>

                  {showDiagPanel && billingDiag && (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                        <span className="font-bold text-zinc-200">Device Play Billing Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          billingDiag.skuFound ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {billingDiag.skuFound ? "Active & Ready" : "Notice"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>API: {billingDiag.hasDigitalGoodsApi ? "Supported" : "Standard Web"}</div>
                        <div>SKU: {billingDiag.skuFound ? `${billingDiag.skuDetails?.currency || "AUD"} 10.00` : "Active"}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 3. SOURCING & SCANNER DEFAULTS ───────────────────────────────────── */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="border-b border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-white tracking-tight">Sourcing &amp; Scanner Defaults</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Customize your currency, resale marketplaces, and audio feedback.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              Operating Currency
            </label>
            <select
              value={defaultCurrency}
              onChange={(e) => handleUpdateCurrency(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-cyan-500/50 transition cursor-pointer"
            >
              <option value="AUD">🇦🇺 AUD — Australian Dollar ($)</option>
              <option value="USD">🇺🇸 USD — US Dollar ($)</option>
              <option value="EUR">🇪🇺 EUR — Euro (€)</option>
              <option value="GBP">🇬🇧 GBP — British Pound (£)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
              Primary Resale Destination
            </label>
            <select
              value={defaultMarketplace}
              onChange={(e) => handleUpdateMarketplace(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-cyan-500/50 transition cursor-pointer"
            >
              <option value="eBay">eBay Australia / Global</option>
              <option value="Facebook Marketplace">Facebook Marketplace</option>
              <option value="Depop">Depop</option>
            </select>
          </div>
        </div>

        {/* Chime Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Min Profit Audio Chime ($)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="500"
                value={minProfit}
                onChange={(e) => handleUpdateMinProfit(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-xs text-zinc-400 shrink-0">Plays cash chime at &ge; ${minProfit} profit</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Min ROI Audio Chime (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="1000"
                value={minRoi}
                onChange={(e) => handleUpdateMinRoi(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-xs text-zinc-400 shrink-0">Plays chime at &ge; {minRoi}% return</span>
            </div>
          </div>
        </div>

        {/* AI Listing Copywriting Checkbox */}
        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="autoAi"
            checked={autoAiDescriptions}
            onChange={(e) => handleUpdateAutoAi(e.target.checked)}
            className="h-4 w-4 rounded bg-black/40 border border-zinc-700 accent-cyan-500 cursor-pointer"
          />
          <label htmlFor="autoAi" className="text-xs text-zinc-300 font-medium select-none cursor-pointer">
            Automatically generate optimized title, item specifics, and description when scanning items
          </label>
        </div>
      </section>

      {/* ── 4. CONNECTED ACCOUNTS (EBAY) ────────────────────────────────────── */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="border-b border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-white tracking-tight">Connected Marketplaces</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Link your seller accounts for instant 1-tap listing and draft synchronization.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/30 border border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-white">eBay Seller Hub</p>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  ebayConnected
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-white/[0.04] border border-white/[0.08] text-zinc-500"
                }`}
              >
                {ebayConnected ? "● Live Connected" : "Not Linked"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              1-Click item specifics, pricing, and draft export directly to eBay Australia via official OAuth.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={connectEbay}
              disabled={ebayConnecting || ebayDisconnecting}
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm"
            >
              {ebayConnecting ? "Connecting..." : ebayConnected || ebayHasDisconnected ? "Reconnect eBay" : "Connect eBay"}
            </button>
            {ebayConnected && (
              <button
                type="button"
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

      {/* ── 5. CUSTOMER SUPPORT & HELP CENTER ───────────────────────────────── */}
      <section id="support" className="scroll-mt-24 space-y-6">
        <div className="border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Customer Support &amp; Help Desk</h2>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Australian Reseller Care
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Real customer support for active resellers. Have a question about billing, daily scan limits, or eBay syncing? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card A: Submit Support Ticket Form */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Submit a Support Ticket</h3>
                  <p className="text-[11px] text-zinc-400">Response within 2–4 hours to your email</p>
                </div>
              </div>

              {supportTicketSubmitted ? (
                <div className="pt-4 space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ticket #{supportTicketSubmitted.ticketId} Created</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Thank you for contacting Spadas Customer Care. Our Australian team has received your inquiry and will email a full resolution to <strong className="text-white">{supportTicketSubmitted.email}</strong> within 2–4 business hours.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupportTicketSubmitted(null)}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendSupportTicket} className="space-y-3.5 pt-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="e.g. Sarah Reseller"
                      className="w-full rounded-xl bg-black/40 border border-zinc-800 px-3.5 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Email Address for Follow-up
                    </label>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl bg-black/40 border border-zinc-800 px-3.5 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full rounded-xl bg-black/40 border border-zinc-800 px-3.5 py-2 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="billing">Billing &amp; Subscriptions</option>
                      <option value="scanning">Camera Scanning &amp; 10 Daily Scans</option>
                      <option value="ebay">eBay Account &amp; Draft Sync</option>
                      <option value="feature">Feature Request or Feedback</option>
                      <option value="general">General Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Describe Your Issue
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Tell us what happened or what you need assistance with..."
                      className="w-full rounded-xl bg-black/40 border border-zinc-800 p-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingSupport}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {submittingSupport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Ticket...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Support Ticket</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Card B: Direct Contact Information */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Direct Support Channels</h3>
                  <p className="text-[11px] text-zinc-400">100% human responses from experienced sellers</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/30 border border-zinc-800 space-y-1">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Official Support Email</p>
                  <a
                    href="mailto:support@spadas.tech"
                    className="text-sm font-mono text-cyan-400 hover:text-cyan-300 font-bold underline transition block"
                  >
                    support@spadas.tech
                  </a>
                  <p className="text-[11px] text-zinc-500 pt-0.5">Click to launch your email client directly.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/30 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Operating Hours:</span>
                    <span className="font-mono text-white">Mon – Sun, 8am – 10pm AEST</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Typical Reply SLA:</span>
                    <span className="font-mono text-emerald-400 font-semibold">&lt; 2–4 Business Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Location:</span>
                    <span className="font-mono text-zinc-300">Melbourne &amp; Sydney, Australia</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-300 font-semibold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Real Customer Care Guarantee</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    No automated loops or fake bot deflections. Every inquiry is personally handled by an Australian team member experienced in eBay reselling.
                  </p>
                </div>
              </div>
            </div>

            <a
              href="mailto:support@spadas.tech?subject=Spadas%20Support%20Inquiry"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Compose Email in Mail App</span>
            </a>
          </div>
        </div>

        {/* Reseller Frequently Asked Questions Accordion */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-2 pt-1">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-xl border border-zinc-800 bg-black/25 overflow-hidden transition">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-semibold text-zinc-200 hover:text-white cursor-pointer transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-2.5">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. DANGER ZONE (ACCOUNT DELETION) ────────────────────────────────── */}
      <section className="bg-zinc-900/40 border border-rose-500/20 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <TriangleAlert className="h-3.5 w-3.5" />
              Danger Zone
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Permanently delete your Spadas account, saved scans, listings, and eBay links. This action cannot be reversed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteAccountInput("");
              setConfirmDeleteAccount(true);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Account
          </button>
        </div>
      </section>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Log out of Spadas?</h3>
            <p className="text-xs text-zinc-400">You can sign back in anytime to access your saved inventory and sold comps.</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLogout(false);
                  void logout();
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDisconnectEbay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Disconnect eBay Account?</h3>
            <p className="text-xs text-zinc-400">This unlinks your eBay seller credentials. You can reconnect anytime.</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDisconnectEbay(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnectEbay}
                disabled={ebayDisconnecting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {ebayDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {confirmDeleteAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently delete account?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  All your scans, listings, and connected accounts will be deleted immediately. This cannot be reversed.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Type <span className="text-rose-400 font-mono font-bold">DELETE</span> to confirm
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
                type="button"
                onClick={() => setConfirmDeleteAccount(false)}
                disabled={deletingAccount}
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="delete-account-confirm-btn"
                onClick={handleDeleteAccount}
                disabled={deleteAccountInput !== "DELETE" || deletingAccount}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              >
                {deletingAccount ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SubscriptionPaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
      <DashboardSupportDesk />
    </div>
  );
}
