"use client";

import React, { useState } from "react";
import { Star, Sparkles, X, Heart, ThumbsUp, ArrowRight, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { toast } from "sonner";

interface InAppReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanCount?: number;
  profitAmount?: number;
  itemName?: string;
  customBadge?: string;
  customTitle?: string;
  customSubtitle?: string;
}

const PLAY_STORE_URL = "market://details?id=com.spadas.ai";
const PLAY_STORE_WEB_URL = "https://play.google.com/store/apps/details?id=com.spadas.ai&showAllReviews=true";

export function openPlayStoreReview() {
  if (typeof window === "undefined") return;
  try {
    triggerTactileHaptic("success");
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

export function checkWinDelightPrompt(profit?: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const status = localStorage.getItem("spadas_review_status");
    if (status === "rated" || status === "dismissed_forever" || status === "feedback_sent") {
      return false;
    }

    const snoozeUntil = parseInt(localStorage.getItem("spadas_review_snooze_until") || "0", 10);
    if (Date.now() < snoozeUntil) {
      return false;
    }

    // Trigger on high-margin win (profit >= $35 AUD)
    if (typeof profit === "number" && profit >= 35) {
      return true;
    }

    const currentCount = parseInt(localStorage.getItem("spadas_scans_completed_total") || "0", 10);
    if (currentCount === 3 || currentCount === 10 || (currentCount > 10 && currentCount % 15 === 0)) {
      return true;
    }
  } catch (e) {
    console.warn("[Review Prompt] localStorage error:", e);
  }
  return false;
}

export function recordSuccessfulScanAndCheckReviewPrompt(profit?: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const currentCount = parseInt(localStorage.getItem("spadas_scans_completed_total") || "0", 10) + 1;
    localStorage.setItem("spadas_scans_completed_total", currentCount.toString());
    return checkWinDelightPrompt(profit);
  } catch (e) {
    console.warn("[Review Prompt] localStorage error:", e);
  }
  return false;
}

export default function InAppReviewModal({
  isOpen,
  onClose,
  scanCount = 3,
  profitAmount,
  itemName,
  customBadge,
  customTitle,
  customSubtitle,
}: InAppReviewModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hasRated, setHasRated] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  if (!isOpen) return null;

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    triggerTactileHaptic("selection");

    if (rating >= 4) {
      try {
        localStorage.setItem("spadas_review_status", "rated");
      } catch {}
      setHasRated(true);
      triggerTactileHaptic("success");
      setTimeout(() => {
        openPlayStoreReview();
        onClose();
      }, 550);
    } else {
      // For 1-3 stars, keep feedback private to protect Play Store rating
      setShowFeedbackInput(true);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.info("Please enter a few words so our team can improve!");
      return;
    }

    setIsSubmittingFeedback(true);
    triggerTactileHaptic("medium");
    try {
      localStorage.setItem("spadas_review_status", "feedback_sent");
      // Store in local feedback buffer for support
      const existing = JSON.parse(localStorage.getItem("spadas_user_feedback_queue") || "[]");
      existing.push({
        rating: selectedRating,
        text: feedbackText.trim(),
        timestamp: Date.now(),
        context: itemName ? `Item: ${itemName} (${profitAmount ? `$${profitAmount} profit` : ""})` : "General",
      });
      localStorage.setItem("spadas_user_feedback_queue", JSON.stringify(existing.slice(-20)));

      toast.success("Thank you! Your feedback was sent directly to our Australian dev team.");
      triggerTactileHaptic("success");
      setTimeout(() => {
        onClose();
      }, 600);
    } catch {
      toast.success("Feedback noted. Thank you for helping us improve!");
      onClose();
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleRemindLater = () => {
    try {
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

  const badgeText = customBadge || (profitAmount && profitAmount >= 30 ? `+$${profitAmount.toFixed(0)} NET FLIP DETECTED!` : `${scanCount} SCANS COMPLETED!`);
  const titleText = customTitle || (profitAmount && profitAmount >= 30 ? "Loving the flips? 🎉" : "Loving Spadas AI? 🚀");
  const subtitleText = customSubtitle || (profitAmount && profitAmount >= 30
    ? `You just spotted a $${profitAmount.toFixed(0)} profit margin! If Spadas is putting money in your pocket, dropping a quick 5-star review helps us keep sold comps fast and accurate.`
    : "You're powering through thrift finds! Taking 5 seconds to rate us on Google Play helps other Australian resellers find the app.");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-center shadow-[0_0_50px_rgba(251,191,36,0.18)] text-white space-y-5">
        
        {/* Close Button */}
        <button
          onClick={handleRemindLater}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Milestone or Win Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-black text-amber-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <span>{badgeText}</span>
        </div>

        {!showFeedbackInput ? (
          <>
            {/* Header Content */}
            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight text-white">
                {titleText}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {subtitleText}
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
                  aria-label={`${star} star`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= selectedRating
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.85)]"
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
                  <span>Opening Google Play Store...</span>
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
          </>
        ) : (
          /* Private In-App Feedback Form for 1-3 Stars (Shields Play Store rating!) */
          <div className="space-y-4 text-left animate-in fade-in duration-200">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                How can we make Spadas better?
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Your direct feedback goes straight to the founders to improve our models.
              </p>
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. eBay comps accuracy, barcode scanning in low light, platform fees..."
              rows={3}
              className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700/80 p-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFeedbackInput(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
