"use client";

import React, { useMemo } from "react";
import { ExternalLink, CheckCircle2, Calendar, ShieldCheck, Tag, Sparkles } from "lucide-react";
import { RawSoldComp } from "@/types/lens";
import { RawSoldCompRecord } from "@/types/ai-listing";
import { getTransparentSoldCompsLedger, AuditableSoldComp } from "@/lib/comps-ledger";

export interface TransparentSoldCompsLedgerProps {
  productName: string;
  brand?: string | null;
  estimatedValue?: number;
  rawComps?: (RawSoldComp | RawSoldCompRecord)[] | null;
  currency?: string;
  variant?: "compact" | "full" | "card_embedded";
  className?: string;
  maxItems?: number;
  onOpenCompsModal?: () => void;
}

export const TransparentSoldCompsLedger: React.FC<TransparentSoldCompsLedgerProps> = ({
  productName,
  brand,
  estimatedValue = 45,
  rawComps,
  currency = "AUD",
  variant = "compact",
  className = "",
  maxItems = 5,
  onOpenCompsModal,
}) => {
  const comps: AuditableSoldComp[] = useMemo(() => {
    const list = getTransparentSoldCompsLedger(productName, brand, estimatedValue, rawComps, currency);
    return list.slice(0, maxItems);
  }, [productName, brand, estimatedValue, rawComps, currency, maxItems]);

  const fmt = (num: number) => {
    const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
    return `${sym}${num.toFixed(2)}`;
  };

  if (!comps || comps.length === 0) return null;

  if (variant === "card_embedded") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-0.5">
          <span className="flex items-center gap-1 text-slate-300 font-extrabold uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3 text-cyan-400" />
            <span>Sold Comps Evidence ({comps.length} listings)</span>
          </span>
          {onOpenCompsModal && (
            <button
              type="button"
              onClick={onOpenCompsModal}
              className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-mono"
            >
              All Comps →
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
          {comps.map((comp) => (
            <div
              key={comp.id}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 transition flex items-center justify-between gap-2 text-[11px]"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={comp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-200 hover:text-cyan-300 truncate block transition"
                  title={comp.title}
                >
                  {comp.title}
                </a>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-mono">
                  <span className="text-slate-300">{comp.condition}</span>
                  <span>•</span>
                  <span>{comp.soldDate}</span>
                </div>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end">
                <span className="font-black text-emerald-400 font-mono text-xs">
                  {fmt(comp.price)}
                </span>
                <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {comp.matchScore}% Match
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full / Modal Variant
  return (
    <div className={`rounded-2xl bg-slate-950/80 border border-slate-800/90 p-3 space-y-2.5 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-black text-white uppercase tracking-wider">
            Transparent Sold Comps Ledger
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            {comps.length} Cleared Sales
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono font-bold">
          Verified Evidence
        </span>
      </div>

      <div className="space-y-2">
        {comps.map((comp) => (
          <div
            key={comp.id}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/40 transition flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {comp.matchScore}% Match
                </span>
                <span className="text-[10px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80">
                  {comp.condition}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-500" /> {comp.soldDate}
                </span>
              </div>

              <a
                href={comp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-100 hover:text-cyan-300 truncate block transition"
                title={comp.title}
              >
                {comp.title}
              </a>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end">
              <span className="text-[9px] font-mono uppercase text-slate-400">Realized</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {fmt(comp.price)}
              </span>
              <a
                href={comp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 hover:text-cyan-300 transition mt-0.5"
              >
                <span>eBay Sold</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
