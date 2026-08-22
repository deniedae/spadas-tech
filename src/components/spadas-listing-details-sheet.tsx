"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Sparkles, ShoppingBag, Edit3, DollarSign, Tag, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";

export interface SpadasListingData {
  productName: string;
  brand: string;
  category: string;
  condition: string;
  size: string;
  description: string;
  weight: string;
  dimensions: string;
  priceMedian: number;
  priceMin: number;
  priceMax: number;
  currency: string;
  photos: string[];
}

interface Props {
  data: SpadasListingData;
  onBack: () => void;
  onSaved?: () => void;
}

export function SpadasListingDetailsSheet({ data: initialData, onBack, onSaved }: Props) {
  const router = useRouter();
  const [data, setData] = useState<SpadasListingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const openEditor = (field: keyof SpadasListingData, label: string) => {
    setEditingField(field);
    setEditValue(String(data[field] || ""));
  };

  const saveField = () => {
    if (!editingField) return;
    setData((prev) => ({
      ...prev,
      [editingField]: editValue,
    }));
    setEditingField(null);
    toast.success("Updated field");
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        toast.error("Please log in to save listing drafts.");
        router.push("/login?redirect=/listings");
        return;
      }

      const cost = Math.max(3, Math.round(data.priceMedian * 0.35));
      const res = await createListing({
        userId,
        product: data.productName,
        description: `${data.description}\n\nSize: ${data.size || "N/A"}\nCondition: ${data.condition || "Pre-owned"}\nWeight: ${data.weight || "N/A"}\nDimensions: ${data.dimensions || "N/A"}`,
        price: data.priceMedian,
        cost,
        status: "Draft",
      });

      if (res?.error) {
        toast.error(res.error.message || "Failed to save draft.");
      } else {
        toast.success("Saved to Drafts!");
        if (onSaved) onSaved();
        else router.push("/listings");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishEbay = async () => {
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        toast.error("Please log in to publish listings.");
        router.push("/login?redirect=/listings");
        return;
      }

      const cost = Math.max(3, Math.round(data.priceMedian * 0.35));
      const res = await createListing({
        userId,
        product: data.productName,
        description: `${data.description}\n\nSize: ${data.size || "N/A"}\nCondition: ${data.condition || "Pre-owned"}\nWeight: ${data.weight || "N/A"}\nDimensions: ${data.dimensions || "N/A"}`,
        price: data.priceMedian,
        cost,
        status: "Active",
      });

      toast.success("🚀 Listing created and queued for eBay AU!");
      if (onSaved) onSaved();
      else router.push("/listings");
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish listing.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-lg mx-auto pb-28 animate-fade-in">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black tracking-tight text-white">Listing Details</h1>
        <div className="w-10" />
      </header>

      {/* Main Form Fields Container */}
      <div className="p-4 space-y-3">
        {/* Photo Carousel Preview */}
        {data.photos && data.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {data.photos.map((img, idx) => (
              <div
                key={idx}
                className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Item angle ${idx + 1}`} className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-300">
                  {idx === 0 ? "Main" : `#${idx + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Title / Product Name Field */}
        <div
          onClick={() => openEditor("productName", "Product Name")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Title</span>
            <p className="text-sm font-extrabold text-white line-clamp-1">{data.productName}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* PROMINENT RESALE PRICE & PROFIT BREAKDOWN CARD */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/50 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                💰 Suggested Resale Price
              </span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black">
              +${(data.priceMedian - Math.max(3, Math.round(data.priceMedian * 0.35))).toFixed(2)} AUD Profit
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-white">${data.priceMedian.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-bold ml-1.5">{data.currency}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-semibold">
                Range: ${data.priceMin.toFixed(0)} - ${data.priceMax.toFixed(0)} {data.currency}
              </span>
            </div>
          </div>

          {/* Transparent Profit Math */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs font-bold text-slate-300 flex-wrap">
            <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
              Sell: ${data.priceMedian.toFixed(2)}
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Buy: ${Math.max(3, Math.round(data.priceMedian * 0.35)).toFixed(2)}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              Net Profit: +${(data.priceMedian - Math.max(3, Math.round(data.priceMedian * 0.35))).toFixed(2)}
            </span>
          </div>

          {/* Smart Pricing Selector Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, priceMedian: Math.max(10, Math.round(prev.priceMin || prev.priceMedian * 0.85)) }))}
              className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                data.priceMedian <= data.priceMin
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md"
                  : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
              }`}
            >
              ⚡ Fast Flip (${Math.max(10, Math.round(data.priceMin || data.priceMedian * 0.85))})
            </button>
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, priceMedian: initialData.priceMedian }))}
              className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                data.priceMedian === initialData.priceMedian
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
                  : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
              }`}
            >
              🎯 Median (${initialData.priceMedian.toFixed(0)})
            </button>
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, priceMedian: Math.round(prev.priceMax || prev.priceMedian * 1.2) }))}
              className={`py-2 px-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                data.priceMedian >= data.priceMax
                  ? "bg-purple-500 text-white border-purple-400 shadow-md"
                  : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
              }`}
            >
              👑 Top Dollar (${Math.round(data.priceMax || data.priceMedian * 1.2)})
            </button>
          </div>
        </div>

        {/* Size Card */}
        <div
          onClick={() => openEditor("size", "Size")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Size</span>
            <p className="text-sm font-bold text-white">{data.size || "One Size"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Condition Card */}
        <div
          onClick={() => openEditor("condition", "Condition")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Condition</span>
            <p className="text-sm font-bold text-emerald-400">{data.condition || "Pre-owned - Like New"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Description Card */}
        <div
          onClick={() => openEditor("description", "Description")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5 max-w-[85%]">
            <span className="text-xs font-bold text-slate-400">Description</span>
            <p className="text-xs font-medium text-slate-300 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Weight Card */}
        <div
          onClick={() => openEditor("weight", "Weight")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Weight</span>
            <p className="text-sm font-bold text-white">{data.weight || "12 oz / 340g"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>

        {/* Dimensions Card */}
        <div
          onClick={() => openEditor("dimensions", "Dimensions")}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400">Dimensions</span>
            <p className="text-sm font-bold text-white">{data.dimensions || "4 x 4 x 10 in"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
        </div>
      </div>

      {/* Floating Bottom Earnings & Actions Bar (Positioned above Mobile Nav) */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 max-w-lg mx-auto p-4 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl z-40 space-y-3 shadow-2xl">
        {/* Estimated Earning Row */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Estimated earning:</span>
            <span className="text-emerald-400 font-black text-sm">
              +${(data.priceMedian - Math.max(3, Math.round(data.priceMedian * 0.35))).toFixed(2)} {data.currency}
            </span>
          </div>
          <span className="text-white font-extrabold text-xs">
            List Price: ${data.priceMedian.toFixed(2)}
          </span>
        </div>

        {/* Dual Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraft}
            className="py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs border border-slate-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Save to drafts
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handlePublishEbay}
            className="py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-[0_0_20px_rgba(37,99,235,0.4)] transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Save & Continue</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inline Field Editor Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white">Edit {editingField}</h3>
            {editingField === "description" ? (
              <textarea
                rows={5}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveField}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs hover:bg-cyan-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
