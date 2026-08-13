"use client";

import React, { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export default function SocialAuthProviders({
  redirectTo = "/dashboard",
  layout = "full",
}: {
  redirectTo?: string;
  layout?: "full" | "compact";
}) {
  const [emailInput, setEmailInput] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: "google" | "facebook" | "github") => {
    setLoadingProvider(provider);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}${redirectTo}`,
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("unsupported provider") || msg.includes("validation_failed") || msg.includes("400")) {
          toast.info(`🔑 ${provider.toUpperCase()} OAuth requires Client ID setup in Supabase Dashboard. Redirecting to quick sign-up...`);
          setTimeout(() => {
            if (typeof window !== "undefined") {
              window.location.href = "/signup";
            }
          }, 1200);
        } else {
          toast.error(`OAuth login notice: ${error.message}`);
        }
      }
    } catch (err) {
      toast.info("Redirecting to email registration...");
      if (typeof window !== "undefined") {
        window.location.href = "/signup";
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setLoadingProvider("email");
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          emailRedirectTo: `${origin}${redirectTo}`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        setMagicLinkSent(true);
        toast.success(`✨ 1-Click Login Link sent to ${emailInput}! Check your inbox.`);
      }
    } catch {
      toast.error("Failed to send login email.");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Google / Gmail Auth Button */}
      <button
        type="button"
        onClick={() => handleOAuthLogin("google")}
        disabled={loadingProvider !== null}
        className="relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:border-slate-600 active:scale-98 cursor-pointer disabled:opacity-50"
      >
        {loadingProvider === "google" ? (
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
        )}
        <span>Continue with Google (Gmail)</span>
      </button>

      {/* Facebook Auth Button */}
      <button
        type="button"
        onClick={() => handleOAuthLogin("facebook")}
        disabled={loadingProvider !== null}
        className="relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#1877F2] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#166FE5] active:scale-98 cursor-pointer disabled:opacity-50"
      >
        {loadingProvider === "facebook" ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <svg className="h-5 w-5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )}
        <span>Continue with Facebook</span>
      </button>

      {/* 1-Tap Passwordless Magic Link Email Form */}
      <form onSubmit={handleMagicLinkLogin} className="space-y-2 pt-1">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="or enter your email address..."
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={loadingProvider !== null || !emailInput.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-cyan-600 px-4 text-xs font-bold text-white shadow-md hover:bg-cyan-500 transition shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {loadingProvider === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                <span>1-Tap Login</span>
              </>
            )}
          </button>
        </div>
        {magicLinkSent && (
          <p className="text-[11px] font-bold text-emerald-400 text-center animate-fade-in">
            ✨ Login link sent to {emailInput}! Check your inbox.
          </p>
        )}
      </form>
    </div>
  );
}
