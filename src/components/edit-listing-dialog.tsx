"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { X, Pencil, Check, Loader2, DollarSign, Tag, TrendingUp } from "lucide-react";

type ListingLike = {
  id: number | string;
  product: string;
  description?: string | null;
  price?: number | string | null;
  cost?: number | string | null;
  purchase_price?: number | string | null;
  sold_price?: number | string | null;
  shipping_cost?: number | string | null;
  fees?: number | string | null;
  sold_at?: string | null;
  status: string;
};

type Props = {
  listing: ListingLike;
  onUpdated: () => void;
};

export default function EditListingDialog({ listing, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [fees, setFees] = useState("");

  const [status, setStatus] = useState<"Draft" | "Active" | "Sold">("Active");

  function syncFromListing() {
    setProduct(listing.product || "");
    setDescription(listing.description || "");
    setPrice(listing.price !== null && listing.price !== undefined ? String(listing.price) : "");
    setCost(listing.cost !== null && listing.cost !== undefined ? String(listing.cost) : "");
    setPurchasePrice(listing.purchase_price !== null && listing.purchase_price !== undefined ? String(listing.purchase_price) : "0");
    setSoldPrice(listing.sold_price !== null && listing.sold_price !== undefined ? String(listing.sold_price) : "0");
    setShippingCost(listing.shipping_cost !== null && listing.shipping_cost !== undefined ? String(listing.shipping_cost) : "0");
    setFees(listing.fees !== null && listing.fees !== undefined ? String(listing.fees) : "0");
    setStatus((["Draft", "Active", "Sold"].includes(listing.status) ? listing.status : "Active") as "Draft" | "Active" | "Sold");
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Realized net profit calculation when status is Sold
  const realizedNetProfit = useMemo(() => {
    const sPrice = Number(soldPrice) || 0;
    const itemCost = Number(cost) || Number(purchasePrice) || 0;
    const shipping = Number(shippingCost) || 0;
    const feeAmount = Number(fees) || 0;
    return sPrice - itemCost - shipping - feeAmount;
  }, [soldPrice, cost, purchasePrice, shippingCost, fees]);

  async function saveChanges() {
    if (!product.trim()) {
      toast.error("Product name is required.");
      return;
    }

    const parsedPrice = Number(price);
    const parsedCost = Number(cost);
    const parsedPurchasePrice = Number(purchasePrice);
    const parsedSoldPrice = Number(soldPrice);
    const parsedShipping = Number(shippingCost);
    const parsedFees = Number(fees);

    if ([parsedPrice, parsedCost, parsedPurchasePrice, parsedSoldPrice, parsedShipping, parsedFees].some((v) => Number.isNaN(v))) {
      toast.error("Please enter valid numeric values for all pricing fields.");
      return;
    }

    setSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        product: product.trim(),
        description: description.trim(),
        price: parsedPrice,
        cost: parsedCost,
        purchase_price: parsedPurchasePrice,
        sold_price: parsedSoldPrice,
        shipping_cost: parsedShipping,
        fees: parsedFees,
        status,
        sold_at:
          status === "Sold"
            ? listing.sold_at ?? new Date().toISOString()
            : null,
      };

      const { error } = await supabase
        .from("listings")
        .update(updatePayload)
        .eq("id", listing.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Listing updated successfully!");
      setOpen(false);
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update listing.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <>
      {/* Sleek Hardware-Themed Pencil Action Button */}
      <button
        type="button"
        onClick={() => {
          syncFromListing();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#12151E] hover:bg-[#1A1F2C] text-zinc-300 hover:text-white text-[10px] font-mono font-bold border border-zinc-700/80 hover:border-cyan-500/40 transition cursor-pointer active:scale-95 shadow-sm"
        title={`Edit ${listing.product}`}
      >
        <Pencil className="w-2.5 h-2.5 text-cyan-400" />
        <span>EDIT</span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in"
            onClick={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-listing-title"
            tabIndex={-1}
          >
            {/* Modal Card Container */}
            <div
              className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-2xl bg-[#0B0D14] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.85)] text-zinc-100 overflow-hidden font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pinned Industrial Header */}
              <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#0E1118]/90 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 id="edit-listing-title" className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <span>Edit Listing</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                        #{listing.id}
                      </span>
                    </h2>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[240px] sm:max-w-xs mt-0.5 font-sans">
                      {listing.product}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close edit listing dialog"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 text-xs font-mono touch-pan-y">
                {/* Product Name Field */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-product" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Product Title
                  </label>
                  <input
                    id="edit-product"
                    type="text"
                    className="w-full bg-[#090A0F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition font-sans font-medium"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="e.g. Nike Vintage 90s Windbreaker"
                    required
                  />
                </div>

                {/* Status Segmented Mechanical Switcher */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Inventory Status
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                    {(["Draft", "Active", "Sold"] as const).map((st) => {
                      const isSelected = status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(st)}
                          className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? st === "Sold"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                                : st === "Draft"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/10"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            st === "Sold" ? "bg-emerald-400" : st === "Draft" ? "bg-amber-400" : "bg-sky-400"
                          }`} />
                          <span>{st.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Core Pricing & Cost Data Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Listing Price */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-price" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Listing Price ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">$</span>
                      <input
                        id="edit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-[#090A0F] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-zinc-100 tabular-nums focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Estimated Unit Cost */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-cost" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Unit Cost ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">$</span>
                      <input
                        id="edit-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-[#090A0F] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-zinc-100 tabular-nums focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Purchase / Acquisition Price */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-purchase-price" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Purchase Price / COGS ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">$</span>
                    <input
                      id="edit-purchase-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-[#090A0F] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-zinc-100 tabular-nums focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Realized Sold Details Container (Active when status === 'Sold') */}
                {status === "Sold" && (
                  <div className="rounded-xl p-3.5 bg-[#22C55E]/5 border border-[#22C55E]/20 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Realized Sale Reconciliation
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        realizedNetProfit >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}>
                        Net: {realizedNetProfit >= 0 ? `+$${realizedNetProfit.toFixed(2)}` : `-$${Math.abs(realizedNetProfit).toFixed(2)}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="edit-sold-price" className="block text-[10px] font-bold text-zinc-400 uppercase">
                          Sold Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[11px] font-bold text-zinc-500">$</span>
                          <input
                            id="edit-sold-price"
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full bg-[#090A0F] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-zinc-100 tabular-nums focus:outline-none focus:border-emerald-500/70"
                            value={soldPrice}
                            onChange={(e) => setSoldPrice(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="edit-shipping" className="block text-[10px] font-bold text-zinc-400 uppercase">
                          Shipping
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[11px] font-bold text-zinc-500">$</span>
                          <input
                            id="edit-shipping"
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full bg-[#090A0F] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-zinc-100 tabular-nums focus:outline-none focus:border-emerald-500/70"
                            value={shippingCost}
                            onChange={(e) => setShippingCost(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="edit-fees" className="block text-[10px] font-bold text-zinc-400 uppercase">
                          Platform Fees
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[11px] font-bold text-zinc-500">$</span>
                          <input
                            id="edit-fees"
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full bg-[#090A0F] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-zinc-100 tabular-nums focus:outline-none focus:border-emerald-500/70"
                            value={fees}
                            onChange={(e) => setFees(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Item Description */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-description" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Description Notes
                  </label>
                  <textarea
                    id="edit-description"
                    rows={2}
                    className="w-full bg-[#090A0F] border border-white/10 rounded-xl p-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition resize-none font-sans"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Condition notes, defects, size info..."
                  />
                </div>

                <div className="h-1" />
              </div>

              {/* Pinned Sticky Footer Actions */}
              <div className="shrink-0 p-4 border-t border-white/10 bg-[#0E1118]/95 backdrop-blur flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-bold text-xs border border-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
