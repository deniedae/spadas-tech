"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteScanButton({ scanId }: { scanId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this scan record?")) return;
    setLoading(true);

    try {
      const res = await fetch("/api/scans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete scan record.");
      }
    } catch (e) {
      alert("Error deleting scan record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete scan record"
      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}

export function ClearAllHistoryButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClearAll = async () => {
    if (!confirm("⚠️ Are you sure you want to delete ALL scan history? This action cannot be undone.")) return;
    setLoading(true);

    try {
      const res = await fetch("/api/scans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to clear history.");
      }
    } catch (e) {
      alert("Error clearing history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClearAll}
      disabled={loading}
      className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Trash2 className="w-3.5 h-3.5" />}
      <span>Clear History</span>
    </button>
  );
}
