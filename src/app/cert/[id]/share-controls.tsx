"use client";

import { useState } from "react";
import { Share2, Printer, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CertificateShareControlsProps {
  certUrl: string;
  certId: string;
  productName: string;
}

export default function CertificateShareControls({
  certUrl,
  certId,
  productName,
}: CertificateShareControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(certUrl);
    setCopied(true);
    toast.success("Public Certificate Link copied! Paste into your eBay listing.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer active:scale-95 shadow-lg shadow-cyan-500/20"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span>{copied ? "Link Copied!" : "Copy Link for eBay"}</span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer active:scale-95"
        title="Print or Save PDF"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print Certificate</span>
      </button>
    </div>
  );
}
