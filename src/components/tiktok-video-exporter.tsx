"use client";

import React, { useRef, useState } from "react";
import { Download, Copy, Check, Video, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";

interface TiktokVideoExporterProps {
  productTitle: string;
  profit: number;
  estPrice: number;
  condition: string;
  sellSpeed?: string;
  estDays?: string;
  triggerButton?: React.ReactNode;
}

export default function TiktokVideoExporter({
  productTitle,
  profit,
  estPrice,
  condition,
  sellSpeed = "FAST FLIP",
  estDays = "1-3 Days",
  triggerButton,
}: TiktokVideoExporterProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const captionText = `Stop checking eBay sold comps manually at thrift stores 🛑 
Spadas Lens AR scanned this ${productTitle} and found +${fmtMoney(profit)} net profit in real time! 🔔💰

Try 10 free scans: Link in bio 🚀
#reseller #thrifttok #flipping #ebayseller #sidehustle #spadasai #retailarbitrage`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText);
    setCopied(true);
    toast.success("Viral TikTok caption copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Draw canvas if not rendered
      renderCanvas();
    }
    const targetCanvas = canvasRef.current;
    if (!targetCanvas) return;

    try {
      const dataUrl = targetCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `spadas-ar-flip-${productTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("9:16 TikTok story card downloaded!");
    } catch (err) {
      console.error("Canvas export error:", err);
      toast.error("Failed to download story card.");
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1080x1920 (Standard 9:16 Vertical TikTok Canvas Resolution)
    canvas.width = 1080;
    canvas.height = 1920;

    // Background Gradient (Dark Holographic Slate to Cyan/Amber glow)
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, "#020617");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#090d16");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing Neon Framing Border
    ctx.strokeStyle = profit >= 80 ? "#f59e0b" : "#06b6d4";
    ctx.lineWidth = 18;
    ctx.strokeRect(30, 30, 1020, 1860);

    // Top Header Badge
    ctx.fillStyle = profit >= 80 ? "#f59e0b" : "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(140, 160, 800, 110, 55);
    ctx.fill();

    ctx.fillStyle = "#020617";
    ctx.font = "900 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(profit >= 80 ? "👑 SPADAS AR GRAIL FIND" : "⚡ SPADAS LENS AR HIT", 540, 232);

    // Main Card Frame Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(90, 360, 900, 1200, 48);
    ctx.fill();
    ctx.stroke();

    // Product Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 58px sans-serif";
    ctx.textAlign = "center";

    // Wrap product title text
    const words = productTitle.split(" ");
    let line = "";
    let y = 480;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 780 && i > 0) {
        ctx.fillText(line, 540, y);
        line = words[i] + " ";
        y += 75;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 540, y);

    // Condition Pill
    ctx.fillStyle = "rgba(34, 211, 238, 0.15)";
    ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(310, y + 40, 460, 70, 35);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 34px sans-serif";
    ctx.fillText(`Condition: ${condition}`, 540, y + 86);

    // Giant Green Net Profit Ticker
    const profitY = y + 260;
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(140, profitY, 800, 260, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "900 100px sans-serif";
    ctx.fillText(`+${fmtMoney(profit)}`, 540, profitY + 140);

    ctx.fillStyle = "#a7f3d0";
    ctx.font = "800 38px sans-serif";
    ctx.fillText("ESTIMATED NET PROFIT", 540, profitY + 210);

    // Market Comps & Sales Velocity Info
    const infoY = profitY + 340;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 40px sans-serif";
    ctx.fillText(`Est. Market Value: ${fmtMoney(estPrice)} AUD`, 540, infoY);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 38px sans-serif";
    ctx.fillText(`⚡ Flip Speed: ${sellSpeed} (${estDays})`, 540, infoY + 70);

    // Watermark Footer Branding
    ctx.fillStyle = "#38bdf8";
    ctx.font = "900 42px sans-serif";
    ctx.fillText("🚀 Try 10 Free Scans: spadas-tech.vercel.app/lens", 540, 1720);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 32px sans-serif";
    ctx.fillText("Spadas AI Reseller Scanner • TikTok & Reels Export", 540, 1780);
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => {
      renderCanvas();
    }, 100);
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpen}>{triggerButton}</div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
          title="Export TikTok Story Video Card"
        >
          <Video className="h-3.5 w-3.5 text-amber-400" />
          <span>TikTok Clip</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>TikTok & Reels Video Exporter</span>
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400">9:16 Vertical Story Card for TikTok, Shorts & Reels</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Canvas Preview Container */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-amber-400/50 shadow-2xl bg-slate-950">
                <canvas ref={canvasRef} className="h-full w-full object-contain" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadCard}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-black text-slate-950 shadow-lg hover:bg-amber-300 transition cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download 9:16 Card
              </button>

              <button
                type="button"
                onClick={handleCopyCaption}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 text-xs font-bold text-white shadow-md hover:bg-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-300" />}
                <span>{copied ? "Caption Copied!" : "Copy TikTok Caption"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
