"use client";

import { useState } from "react";
import { Camera, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { DeleteScanButton } from "./delete-button";

interface ScanRecord {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
  result_json: any;
  token_count: number;
  status: "completed" | "failed";
}

export function ScanItemCard({
  scan,
  onDeleted,
}: {
  scan: ScanRecord;
  onDeleted?: () => void;
}) {
  const [deleted, setDeleted] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  if (deleted) return null;

  const submitRating = async (value: "up" | "down") => {
    setRating(value);
    await fetch("/api/scans/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: scan.id, rating: value }),
    }).catch(() => {});
  };

  const handleDeleted = () => {
    setDeleted(true);
    if (onDeleted) onDeleted();
  };

  const res = scan.result_json || {};
  const title =
    res?.analysis?.product_name ||
    res?.detected_objects?.[0]?.product_name ||
    res?.product_name ||
    res?.item_title ||
    (scan.status === "failed" ? "Failed Scan Attempt" : "Scanned Item");

  const brand = res?.analysis?.brand || res?.brand || "Generic";
  const category = res?.analysis?.category || res?.category || "Resale Item";
  const minPrice = res?.suggested_price_min || 0;
  const maxPrice = res?.suggested_price_max || 0;
  const isFailed = scan.status === "failed";
  const formattedDate = new Date(scan.created_at).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isFailed
          ? "bg-rose-950/20 border-rose-900/50"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold shrink-0 ${
            isFailed ? "bg-rose-900/40 text-rose-400" : "bg-emerald-950 text-emerald-400"
          }`}
        >
          {isFailed ? <AlertTriangle className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100 text-base">{title}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
                isFailed
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {isFailed ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span>FAILED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>COMPLETED</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <span>Brand: {brand}</span>
            <span>•</span>
            <span>Category: {category}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
        {!isFailed && minPrice > 0 && (
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Resale Value</div>
            <div className="text-emerald-400 font-bold text-lg">
              ${minPrice} - ${maxPrice} AUD
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-slate-950/40 p-1 rounded-lg border border-slate-800/60">
          <button
            type="button"
            onClick={() => submitRating("up")}
            className={`text-base transition cursor-pointer px-1 hover:scale-110 ${rating === "up" ? "opacity-100 scale-110" : "opacity-40 hover:opacity-80"}`}
            title="Rate accurate identification"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => submitRating("down")}
            className={`text-base transition cursor-pointer px-1 hover:scale-110 ${rating === "down" ? "opacity-100 scale-110" : "opacity-40 hover:opacity-80"}`}
            title="Rate misidentification"
          >
            👎
          </button>
        </div>
        <DeleteScanButton scanId={scan.id} onDeleted={handleDeleted} />
      </div>
    </div>
  );
}
