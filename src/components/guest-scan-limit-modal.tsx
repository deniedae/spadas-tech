"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  X,
  Camera,
  Loader2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { getGuestScannedItems, MAX_GUEST_SCANS } from "@/lib/guest-scan-tracker";
import { isOwnerEmail } from "@/app/lib/auth-admin";

interface GuestScanLimitModalProps {
  isOpen: boolean;
  onClose?: () => void;
  scannedCount?: number;
  lastScannedItem?: any;
  isAuthenticated?: boolean;
  isPro?: boolean;
}

export function GuestScanLimitModal({
  isOpen,
  onClose,
  scannedCount = MAX_GUEST_SCANS,
  lastScannedItem,
  isAuthenticated = false,
  isPro = false,
}: GuestScanLimitModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [upgradingToPro, setUpgradingToPro] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeUser, setActiveUser] = useState<any>(null);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);

  React.useEffect(() => {
    // Non-blocking check against Supabase session and user metadata on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setActiveUser(session.user);
        if (onClose) onClose();

        // Check if user has active subscription or owner status
        if (
          isOwnerEmail(session.user.email) ||
          session.user.app_metadata?.is_pro ||
          session.user.user_metadata?.is_pro ||
          session.user.app_metadata?.plan === "pro"
        ) {
          setHasActiveSub(true);
        } else if (session.access_token) {
          try {
            const res = await fetch("/api/stripe/status", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.active || data.plan === "Pro" || data.status === "active") {
                setHasActiveSub(true);
              }
            }
          } catch {}
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setActiveUser(session.user);
        if (
          isOwnerEmail(session.user.email) ||
          session.user.app_metadata?.is_pro ||
          session.user.user_metadata?.is_pro
        ) {
          setHasActiveSub(true);
        }
        if (onClose) onClose();
      } else {
        setActiveUser(null);
        setHasActiveSub(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onClose]);

  // CRITICAL EARLY RETURN GUARD: Never render or pop up the scan limit modal
  // if the user is authenticated, has active subscription/pro status, or matches owner/admin email
  const isAuthedUser = Boolean(
    isAuthenticated ||
    activeUser ||
    (typeof window !== "undefined" && Boolean(
      document.cookie.includes("sb-access-token") ||
      document.cookie.includes("sb-refresh-token") ||
      document.cookie.includes("supabase-auth-token")
    ))
  );
  const isProOrOwner = Boolean(
    isPro ||
    hasActiveSub ||
    isOwnerEmail(activeUser?.email) ||
    activeUser?.app_metadata?.is_pro ||
    activeUser?.user_metadata?.is_pro ||
    activeUser?.app_metadata?.plan === "pro"
  );

  if (!isOpen || isAuthedUser || isProOrOwner) {
    return null;
  }

  const savedItems = getGuestScannedItems();
  const displayItem = lastScannedItem || (savedItems.length > 0 ? savedItems[0] : null);

  async function handleUpgradeToPro() {
    setUpgradingToPro(true);
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.info("Please sign in first to link your Spadas Pro subscription.");
        return handleGoogleSignIn();
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "pro",
          returnPath: "/lens",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to start checkout.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to initiate checkout.");
    } finally {
      setUpgradingToPro(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMsg("");
    setGoogleLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/lens")}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (error) {
        setErrorMsg(error.message || "Google sign-in failed. Please use email.");
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please provide both email and password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        // If user already exists, try logging them in smoothly
        if (error.message.toLowerCase().includes("already registered")) {
          const loginRes = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (loginRes.error) {
            setErrorMsg("Account exists. Please check your password or log in.");
            return;
          }
          toast.success("Welcome back! Account connected.");
          if (onClose) onClose();
          router.refresh();
          return;
        }
        setErrorMsg(error.message);
        return;
      }

      if (data?.user) {
        toast.success("Account created! 10 Daily Scans Unlocked.");
        if (onClose) onClose();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl glass-card bg-[#05050a]/95 border border-white/10 shadow-2xl text-zinc-100 p-6 sm:p-8 space-y-6">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#00F2FE]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Header with pill badge */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="badge-active inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wider uppercase">
              <Zap className="h-3.5 w-3.5 text-[#00F2FE]" />
              <span>3 of 3 Guest Scans Used</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Unlock 10 Free Scans Daily
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scanned Item Preserved Teaser Card */}
        {displayItem && (
          <div className="rounded-2xl glass border border-white/[0.08] p-3.5 flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl glass text-[#00F2FE] border border-white/[0.08]">
              <Camera className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="hud-chip">
                  Last Scanned
                </span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> Profit Comp Saved
                </span>
              </div>
              <p className="text-sm font-bold text-white truncate mt-0.5">
                {displayItem.name || displayItem.productName || "Scanned Item"}
              </p>
            </div>
            {displayItem.estimatedProfit && (
              <div className="text-right">
                <span className="hud-label block">Net Profit</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  +${Number(displayItem.estimatedProfit).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-300">
          <div className="flex items-center gap-2 glass border border-white/[0.06] rounded-xl p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong>10 Scans/Day</strong> (Free Forever)</span>
          </div>
          <div className="flex items-center gap-2 glass border border-white/[0.06] rounded-xl p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong>Save Drafts</strong> to inventory</span>
          </div>
          <div className="flex items-center gap-2 glass border border-white/[0.06] rounded-xl p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong>1-Tap eBay</strong> auto-listing</span>
          </div>
          <div className="flex items-center gap-2 glass border border-white/[0.06] rounded-xl p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong>Offline Mode</strong> for thrift stores</span>
          </div>
        </div>

        {/* Power Seller Pro Instant Unlock Banner */}
        <div className="rounded-2xl border border-[#00F2FE]/30 bg-gradient-to-r from-[#00F2FE]/5 via-cyan-500/5 to-blue-500/5 p-3.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[#00F2FE] font-extrabold text-[11px] tracking-wide uppercase">
              <Sparkles className="h-3 w-3 fill-[#00F2FE]" />
              <span>Power Seller Option</span>
            </div>
            <p className="text-xs font-bold text-white truncate">
              Unlimited Scans &bull; 1-Tap eBay Direct List
            </p>
            <p className="text-[10px] text-zinc-400 font-mono">$29 AUD / mo &bull; Cancel anytime</p>
          </div>
          <button
            type="button"
            onClick={handleUpgradeToPro}
            disabled={upgradingToPro}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-black text-slate-950 hover:brightness-110 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {upgradingToPro ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 fill-slate-950" />
            )}
            <span>{upgradingToPro ? "Redirecting..." : "Go Pro ⚡"}</span>
          </button>
        </div>

        {/* Quick Sign Up Options */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl glass hover:bg-white/[0.08] border border-white/[0.1] text-white font-bold py-3 px-4 text-sm transition shadow-md disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting..." : "Continue with Google (1-Click)"}</span>
          </button>

          <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <span className="relative bg-[#030305] px-3 hud-label">
              Or Create with Email
            </span>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-2.5">
            <input
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#00F2FE] focus:outline-none focus:ring-1 focus:ring-[#00F2FE] transition"
            />
            <input
              type="password"
              placeholder="Create password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#00F2FE] focus:outline-none focus:ring-1 focus:ring-[#00F2FE] transition"
            />

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 px-4 text-sm font-black text-slate-950 hover:brightness-110 transition shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Free Account & Resume Scanning</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-zinc-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push(`/login?redirect=${encodeURIComponent("/lens")}`)}
              className="text-[#00F2FE] font-bold hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
