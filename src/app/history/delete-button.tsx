"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteScanButton({
  scanId,
  onDeleted,
}: {
  scanId: string;
  onDeleted?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);

    // Optimistically notify parent element to hide immediately
    if (onDeleted) {
      onDeleted();
    }

    try {
      const res = await fetch("/api/scans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        toast.success("Scan record deleted");
        router.refresh();
      } else {
        toast.error(`Failed to delete scan: ${data.error || "Server error"}`);
        router.refresh(); // Restore true state if API failed
      }
    } catch (err: any) {
      toast.error(`Error deleting scan: ${err?.message || "Network failure"}`);
      router.refresh(); // Restore true state if Network failed
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      type="button"
      title="Delete scan record"
      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40 shrink-0"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}

export function ClearAllHistoryButton({
  onClearedAll,
}: {
  onClearedAll?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClearAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/scans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        toast.success("All scan history cleared");
        onClearedAll?.();
        router.refresh();
      } else {
        toast.error(`Failed to clear history: ${data.error || "Server error"}`);
      }
    } catch (err: any) {
      toast.error(`Error clearing history: ${err?.message || "Network failure"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClearAll}
      disabled={loading}
      type="button"
      className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Trash2 className="w-3.5 h-3.5" />}
      <span>Clear History</span>
    </button>
  );
}
