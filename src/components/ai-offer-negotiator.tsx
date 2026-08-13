"use client";

import React, { useState } from "react";
import { Bot, Sparkles, DollarSign, Send, Copy, Check, ShieldCheck, Zap, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";

export interface NegotiatorTactic {
  type: "HIGH_MARGIN" | "FAST_CLOSING" | "POLITE_SHIELD";
  title: string;
  counterPrice: number;
  expectedProfit: number;
  aiMessageScript: string;
}

export default function AiOfferNegotiator({
  productTitle = "Sony Cyber-shot DSC-W80",
  currentAskingPrice = 120,
  itemCost = 15,
}: {
  productTitle?: string;
  currentAskingPrice?: number;
  itemCost?: number;
}) {
  const [buyerOffer, setBuyerOffer] = useState<number>(45);
  const [buyerMessage, setBuyerMessage] = useState<string>("Will u take $45 cash today?");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [tactics, setTactics] = useState<NegotiatorTactic[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerateTactics = () => {
    setAnalyzing(true);
    setTactics(null);

    setTimeout(() => {
      const minFloorPrice = Math.max(itemCost + 25, Math.round(currentAskingPrice * 0.7));
      const highMarginCounter = Math.round(currentAskingPrice * 0.88);
      const fastClosingCounter = Math.round(currentAskingPrice * 0.78);

      const generated: NegotiatorTactic[] = [
        {
          type: "HIGH_MARGIN",
          title: "🚀 High-Margin Counter-Offer",
          counterPrice: highMarginCounter,
          expectedProfit: highMarginCounter - itemCost,
          aiMessageScript: `Hi! Thanks for your interest in the ${productTitle}. $${buyerOffer} is a bit too low given recent eBay sold comps. I can do $${highMarginCounter} AUD with fast dispatch today if that works for you!`,
        },
        {
          type: "FAST_CLOSING",
          title: "⚡ Fast-Closing Cash Deal",
          counterPrice: fastClosingCounter,
          expectedProfit: fastClosingCounter - itemCost,
          aiMessageScript: `Hey! I appreciate the offer. $${buyerOffer} is low, but I'd be willing to meet you at $${fastClosingCounter} AUD for immediate pickup / PayID today. Let me know!`,
        },
        {
          type: "POLITE_SHIELD",
          title: "🛡️ Firm Market-Value Shield",
          counterPrice: currentAskingPrice,
          expectedProfit: currentAskingPrice - itemCost,
          aiMessageScript: `Hi there, thanks for reaching out! $${buyerOffer} is below my minimum threshold for this ${productTitle}. Market comps are currently selling for $${currentAskingPrice}+ AUD, so price is firm for now. Thanks!`,
        },
      ];

      setTactics(generated);
      setAnalyzing(false);
      toast.success("🤖 AI Offer Negotiation Tactics Generated!");

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(12); } catch {}
      }
    }, 600);
  };

  const handleCopyScript = (script: string, index: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(script);
      setCopiedIndex(index);
      toast.success("Copied AI counter-offer to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2500);
    }
  };

  return (
    <div className="rounded-3xl border border-blue-500/30 bg-slate-950 p-6 md:p-8 space-y-6 shadow-2xl overflow-hidden box-border max-w-full text-white">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 border border-blue-400/40 px-3.5 py-1 text-xs font-black text-blue-300">
            <Bot className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            AI AUTO-NEGOTIATOR & COUNTER-OFFER COPILOT
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-2">
            <span>Dynamic Buyer Offer Copilot</span>
            <Sparkles className="h-6 w-6 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Input lowball buyer offers from eBay, FB Marketplace, or Depop. AI instantly calculates minimum floor margins and generates high-converting counter-offers.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Asking Price / Cost</span>
          <span className="text-base font-black text-cyan-400">{fmtMoney(currentAskingPrice)}</span>
          <span className="text-xs text-slate-400 block font-semibold">Cost: {fmtMoney(itemCost)}</span>
        </div>
      </div>

      {/* Offer Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">Item Title</label>
          <input
            type="text"
            value={productTitle}
            disabled
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-300 font-semibold"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">Buyer Offered Price ($ AUD)</label>
          <input
            type="number"
            value={buyerOffer}
            onChange={(e) => setBuyerOffer(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">Buyer Message (Optional)</label>
          <input
            type="text"
            value={buyerMessage}
            onChange={(e) => setBuyerMessage(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerateTactics}
        disabled={analyzing}
        className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-xs font-black text-white shadow-lg hover:opacity-90 transition cursor-pointer active:scale-98"
      >
        {analyzing ? (
          <>
            <Bot className="h-4 w-4 animate-spin" />
            <span>AI Calculating Counter-Offer Margins...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>🤖 Generate 3 AI Counter-Offer Tactics</span>
          </>
        )}
      </button>

      {/* Tactics Output Grid */}
      {tactics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-fade-in">
          {tactics.map((tactic, idx) => (
            <div
              key={tactic.type}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3 flex flex-col justify-between shadow-xl"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-300">{tactic.title}</span>
                  <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-black text-emerald-400">
                    +{fmtMoney(tactic.expectedProfit)} Profit
                  </span>
                </div>

                <div className="text-xl font-black text-white">
                  Counter at {fmtMoney(tactic.counterPrice)} AUD
                </div>

                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed font-sans">
                  "{tactic.aiMessageScript}"
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopyScript(tactic.aiMessageScript, idx)}
                className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer active:scale-95 border border-slate-700"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied Script!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Copy Buyer Reply</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
