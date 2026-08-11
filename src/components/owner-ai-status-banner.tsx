"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, ShieldAlert, RefreshCw, ExternalLink, Zap, AlertTriangle } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export default function OwnerAiStatusBanner() {
  const [isOwner, setIsOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "active" | "exhausted">("checking");
  const [statusMessage, setStatusMessage] = useState("Checking AI Credits...");
  const [refreshing, setRefreshing] = useState(false);

  const checkAiCredits = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/ai-credits-status?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Check failed");
      const data = await res.json();
      if (data.isExhausted) {
        setStatus("exhausted");
        setStatusMessage(data.message || "AI Credits Depleted (Quota / Billing Limit)");
      } else {
        setStatus("active");
        setStatusMessage(data.message || "AI Credits Active & Online");
      }
    } catch {
      // Fallback check
      setStatus("exhausted");
      setStatusMessage("AI Credits Status Unreachable (Falling back to Test Mode)");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function verifyUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email?.toLowerCase() === "deniedae@gmail.com") {
          setIsOwner(true);
          setOwnerEmail(user.email);
          void checkAiCredits();
        }
      } catch {
        // Silently fallback
      }
    }

    void verifyUser();
  }, [checkAiCredits]);

  // Listen to window events when API calls encounter credit exhaustion
  useEffect(() => {
    if (!isOwner) return;

    const handleQuotaExhausted = () => {
      setStatus("exhausted");
      setStatusMessage("AI Features Ran Out (401/402/429 Quota Exhausted)");
    };

    window.addEventListener("spadas_ai_credit_exhausted", handleQuotaExhausted);
    return () => window.removeEventListener("spadas_ai_credit_exhausted", handleQuotaExhausted);
  }, [isOwner]);

  if (!isOwner) return null;

  return (
    <div className="w-full bg-slate-950 text-white border-b border-slate-800 px-4 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Side: Owner ID & Real-Time Status */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-bold text-blue-300 border border-blue-500/30">
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            OWNER: {ownerEmail}
          </span>

          {status === "checking" && (
            <span className="inline-flex items-center gap-1.5 text-slate-400 font-semibold">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              Checking AI API Credits...
            </span>
          )}

          {status === "active" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 font-extrabold text-emerald-400 border border-emerald-500/30 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              🟢 AI CREDITS ACTIVE ({statusMessage})
            </span>
          )}

          {status === "exhausted" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1 font-black text-rose-300 border border-rose-500/40 animate-pulse shadow-md">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              🚨 AI FEATURES EXHAUSTED FOR {ownerEmail} — {statusMessage}
            </span>
          )}
        </div>

        {/* Right Side: Quick Action & Refill Billing Button */}
        <div className="flex items-center gap-2">
          {status === "exhausted" && (
            <span className="hidden sm:inline-block text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
              ⚠️ Running in Test Mode Fallback
            </span>
          )}

          <button
            type="button"
            onClick={checkAiCredits}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Check
          </button>

          <a
            href="https://platform.openai.com/settings/organization/billing/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 px-3 py-1 text-[11px] font-black text-white hover:opacity-90 transition shadow-md shadow-rose-600/20"
          >
            <span>Refill / Pay Credits</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
