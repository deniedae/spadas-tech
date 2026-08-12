"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Download, Copy, Check, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ShareDealProps {
  productTitle: string;
  profit: number;
  estPrice: number;
  condition?: string;
  trigger?: React.ReactNode;
}

export default function ShareDealDialog({
  productTitle,
  profit,
  estPrice,
  condition = "Working",
  trigger,
}: ShareDealProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareText = `🔥 Scanned a high-margin flip with Spadas Lens AR!
📦 Item: ${productTitle}
💰 Est. Resale: $${estPrice} AUD
📈 Net Profit: +$${profit.toFixed(2)} AUD
Condition: ${condition}

Scan thrift shelves in real-time with AI: https://spadas.tech/lens`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Copied viral social post text to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Flip Card
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-950 text-white border-slate-800 p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-cyan-400">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Share Your Flip & Earn Scans
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Visual Social Flip Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-[11px] font-extrabold text-cyan-300 border border-cyan-500/40">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> SPADAS LENS AR HIT
              </span>
              <span className="text-xs font-bold text-slate-400">spadas.tech</span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scanned Item</p>
              <h3 className="text-lg font-bold text-white line-clamp-2 mt-0.5">{productTitle}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Resale</p>
                <p className="text-base font-black text-white">${estPrice} AUD</p>
              </div>

              <div className="rounded-xl bg-emerald-500/20 p-3 border border-emerald-500/40">
                <p className="text-[10px] text-emerald-300 uppercase font-bold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Net Profit
                </p>
                <p className="text-base font-black text-emerald-400">+$${profit.toFixed(2)} AUD</p>
              </div>
            </div>
          </div>

          {/* Social Post Caption Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Pre-Formatted Social Caption</label>
            <div className="relative">
              <textarea
                readOnly
                rows={4}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none resize-none font-mono"
                value={shareText}
              />
              <button
                type="button"
                onClick={handleCopyText}
                className="absolute right-2.5 bottom-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy Caption"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
