"use client";

import React, { useState, useEffect } from "react";
import { Star, Sparkles, X, Heart, ThumbsUp, ArrowRight, CheckCircle2 } from "lucide-react";

interface InAppReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanCount?: number;
}

const PLAY_STORE_URL = "market://details?id=com.spadas.ai";
const PLAY_STORE_WEB_URL = "https://play.google.com/store/apps/details?id=com.spadas.ai&showAllReviews=true";

export function openPlayStoreReview() {
  if (typeof window === "undefined") return;
  try {
    // Attempt native Android Market intent
    window.location.href = PLAY_STORE_URL;
    // Set fallback timeout if intent is not handled (e.g. desktop web)
    setTimeout(() => {
      window.open(PLAY_STORE_WEB_URL, "_blank", "noopener,noreferrer");
    }, 400);
  } catch {
    window.open(PLAY_STORE_WEB_URL, "_blank", "noopener,noreferrer");
  }
}

export function recordSuccessfulScanAndCheckReviewPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const status = localStorage.getItem("spadas_review_status");
    if (status === "rated" || status === "dismissed_forever") {
      return false;
    }

    const currentCount = parseInt(localStorage.getItem("spadas_scans_completed_total") || "0", 10) + 1;
    localStorage.setItem("spadas_scans_completed_total", currentCount.toString());

    const snoozeUntil = parseInt(localStorage.getItem("spadas_review_snooze_until") || "0", 10);
    if (Date.now() < snoozeUntil) {
      return false;
    }

    // Trigger on scan #3 (first milestone) and scan #10 (power user milestone)
    if (currentCount === 3 || currentCount === 10 || (currentCount > 10 && currentCount % 15 === 0)) {
      return true;
    }
  } catch (e) {
    console.warn("[Review Prompt] localStorage error:", e);
  }
  return false;
}

export default function InAppReviewModal({
  isOpen,
  onClose,
  scanCount = 3,
}: InAppReviewModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hasRated, setHasRated] = useState(false);

  if (!isOpen) return null;

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    try {
      localStorage.setItem("spadas_review_status", "rated");
    } catch {}

    setHasRated(true);

    if (rating >= 4) {
      setTimeout(() => {
        openPlayStoreReview();
        onClose();
      }, 500);
    } else {
      // If 1-3 stars, direct to in-app feedback/support instead of public negative Play Store review!
      setTimeout(() => {
        onClose();
        if (typeof window !== "undefined") {
          window.location.href = "/settings#support";
        }
      }, 800);
    }
  };

  const handleRemindLater = () => {
    try {
      // Snooze for 3 days
      const threeDays = Date.now() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem("spadas_review_snooze_until", threeDays.toString());
      localStorage.setItem("spadas_review_status", "snoozed");
    } catch {}
    onClose();
  };

  const handleDismissForever = () => {
    try {
      localStorage.setItem("spadas_review_status", "dismissed_forever");
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-center shadow-[0_0_50px_rgba(251,191,36,0.15)] text-white space-y-5">
        
        {/* Close Button */}
        <button
          onClick={handleRemindLater}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-black text-amber-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
          <span>3 SCANS COMPLETED!</span>
        </div>

        {/* Header Content */}
        <div className="space-y-2">
          <h3 className="text-xl font-black tracking-tight text-white">
            Loving Spadas Lens? 🎉
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            You just completed your 3rd successful scan! Taking 5 seconds to rate us on Google Play helps other resellers find the app and keeps our sold comp data fast and free.
          </p>
        </div>

        {/* Interactive 5 Star Selector */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRate(star)}
              onMouseEnter={() => setSelectedRating(star)}
              className="p-1 transition-all duration-150 transform hover:scale-125 active:scale-95 focus:outline-none cursor-pointer"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= selectedRating
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                    : "fill-transparent text-slate-600"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handleRate(selectedRating)}
          className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-98 transition cursor-pointer"
        >
          {hasRated ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Thank You! Opening Google Play...</span>
            </>
          ) : (
            <>
              <span>Rate 5 Stars on Google Play</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Secondary Snooze / Dismiss Options */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 px-1">
          <button
            type="button"
            onClick={handleRemindLater}
            className="hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
          >
            Remind Me Later
          </button>
          <button
            type="button"
            onClick={handleDismissForever}
            className="hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
          >
            Don&apos;t Ask Again
          </button>
        </div>

      </div>
    </div>
  );
}
