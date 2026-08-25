"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import ImageDropzone from "@/components/image-dropzone";
import UsageBadge from "@/components/usage-badge";
import PricingStrategyCard from "@/components/pricing-strategy-card";
import EbayListingModal from "@/components/ebay-listing-modal";
import type { AiListingResult, Confidence, ShippingSize } from "@/types/ai-listing";
import { ArrowLeft, Sparkles, Loader2, Save, TrendingUp, ShieldCheck, ShoppingBag, Camera } from "lucide-react";
import Link from "next/link";

type AiGenerationStage = "analyzing" | "generating-titles" | "estimating-price" | "finalizing";

const STAGES: { key: AiGenerationStage; label: string }[] = [
  { key: "analyzing", label: "Analyzing images" },
  { key: "generating-titles", label: "Writing marketplace titles" },
  { key: "estimating-price", label: "Estimating price" },
  { key: "finalizing", label: "Finalizing" },
];

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  low: "bg-slate-800 text-slate-400 border border-slate-700",
};

const inputCls =
  "h-11 w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3 text-xs font-semibold text-slate-100 placeholder:text-slate-500 shadow-inner transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export default function AiNewListingPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<AiListingResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEbayModalOpen, setIsEbayModalOpen] = useState(false);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    product: "",
    price: "",
    cost: "",
    status: "Draft" as const,
    condition: "",
    brand: "",
    model: "",
    category: "",
    color: "",
    material: "",
    seo_description: "",
    detailed_description: "",
    keywords: "",
    ebay_title: "",
    fb_title: "",
    vinted_title: "",
    depop_title: "",
    shipping_size: "medium" as ShippingSize,
    shipping_weight: "",
    shipping_notes: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const img = searchParams.get("image");
      const prod = searchParams.get("product");
      const cst = searchParams.get("cost");

      if (img) setImageUrls([img]);
      if (prod) update("product", prod);
      if (cst) update("cost", cst);
    }
  }, []);

  useEffect(() => {
    if (!stageTimer.current) return;
    return () => {
      clearInterval(stageTimer.current!);
      stageTimer.current = null;
    };
  }, []);

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  async function handleFilesChange(newFiles: File[]) {
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setImageUrls([]);
      return;
    }
    setUploading(true);
    try {
      const compressedUrls = await Promise.all(newFiles.map(compressImageFile));
      setImageUrls(compressedUrls);
    } catch {
      toast.error("Failed to process images.");
    } finally {
      setUploading(false);
    }
  }

  function startStageProgress() {
    setStageIdx(0);
    stageTimer.current = setInterval(() => {
      setStageIdx((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 1200);
  }

  function stopStageProgress() {
    if (stageTimer.current) {
      clearInterval(stageTimer.current);
      stageTimer.current = null;
    }
  }

  async function handleGenerate() {
    if (imageUrls.length === 0 && !keyword.trim()) {
      toast.error("Add at least one photo or product notes to generate.");
      return;
    }
    setGenerating(true);
    setResult(null);
    startStageProgress();

    try {
      const res = await fetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls,
          keyword: keyword.trim() || undefined,
          currency: "AUD",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Generation failed.");
      }

      setResult(data);
      setForm({
        product: data.analysis?.product_name || "",
        price: data.suggested_price_median ? String(data.suggested_price_median) : "",
        cost: form.cost,
        status: "Draft",
        condition: data.analysis?.condition || "",
        brand: data.analysis?.brand || "",
        model: data.analysis?.model || "",
        category: data.analysis?.category || "",
        color: data.analysis?.color || "",
        material: data.analysis?.material || "",
        seo_description: data.seo_description || "",
        detailed_description: data.detailed_description || "",
        keywords: (data.suggested_keywords || []).join(", "),
        ebay_title: data.market_titles?.ebay || "",
        fb_title: data.market_titles?.facebook_marketplace || "",
        vinted_title: data.market_titles?.vinted || "",
        depop_title: data.market_titles?.depop || "",
        shipping_size: data.shipping_estimate?.size || "medium",
        shipping_weight: data.shipping_estimate?.estimated_weight_grams
          ? String(data.shipping_estimate.estimated_weight_grams)
          : "",
        shipping_notes: data.shipping_estimate?.notes || "",
      });

      toast.success("✨ AI listing generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate listing.");
    } finally {
      stopStageProgress();
      setGenerating(false);
    }
  }

  async function handleSave() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in to save.");
      return;
    }
    if (!form.product.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setSaving(true);
    try {
      const firstImg = imageUrls[0] ?? null;
      const dbImgUrl = firstImg && firstImg.startsWith("data:") ? null : firstImg;

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert([
          {
            user_id: user.id,
            product: form.product.trim(),
            price: Number(form.price) || 0,
            cost: Number(form.cost) || 0,
            status: form.status,
            image_url: dbImgUrl,
          },
        ])
        .select("id")
        .single();

      if (listingError || !listing) {
        toast.error(listingError?.message || "Failed to save listing.");
        setSaving(false);
        return;
      }

      toast.success("Listing saved to inventory!");
      router.push("/listings");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save listing.");
    } finally {
      setSaving(false);
    }
  }

  const canGenerate = (imageUrls.length > 0 || !!keyword.trim()) && !generating;

  return (
    <main className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100 pb-28">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to My Listings
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AI Listing Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Snap photos or enter item notes to generate marketplace-ready titles, sold pricing comps, and descriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UsageBadge />
          <Link
            href="/lens"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 transition active:scale-95"
          >
            <Camera className="h-4 w-4 text-slate-950" />
            <span>Open Lens AR</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Column: Photos & Generator Control */}
        <section className="space-y-6 lg:col-span-3">
          {/* Notes Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>1. Item Details or Search Term</span>
            </h2>

            <input
              type="text"
              placeholder="e.g. Nike Vintage 90s Windbreaker Jacket Navy Blue XL"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 text-xs font-medium text-slate-100 placeholder:text-slate-500 shadow-inner focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Photos Upload Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                2. Product Photos
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {imageUrls.length} of 10 photos added
              </span>
            </div>

            <ImageDropzone files={files} onFilesChange={handleFilesChange} max={10} disabled={generating} />
            {uploading && (
              <p className="mt-2 inline-flex items-center gap-2 text-xs text-cyan-400 font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" /> Optimizing photos…
              </p>
            )}
          </div>

          {/* Action Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              3. AI Generation
            </h2>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-4 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.98] transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{STAGES[stageIdx]?.label || "Generating…"}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Full Marketplace Listing</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis View */}
          {result && (
            <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Visual Identification</span>
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${confidenceStyles[result.analysis.confidence]}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {result.analysis.confidence} · {Math.round(result.analysis.confidence_score * 100)}%
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <Detail label="Category" value={result.analysis.category} />
                <Detail label="Color" value={result.analysis.color} />
                <Detail label="Material" value={result.analysis.material} />
                <Detail label="Condition" value={result.analysis.condition} />
                <Detail label="Brand" value={result.analysis.brand} />
                <Detail label="Model" value={result.analysis.model} />
              </dl>

              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span className="text-slate-300 font-bold">Suggested Market Price:</span>
                </div>
                <span className="text-base font-black text-emerald-400 tabular-nums">
                  ${result.suggested_price_min.toFixed(2)} – ${result.suggested_price_max.toFixed(2)}{" "}
                  {result.suggested_price_currency}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Listing Details & Marketplace Sync */}
        <section className="lg:col-span-2 space-y-6">
          {result && (
            <PricingStrategyCard
              medianPrice={(result.suggested_price_min + result.suggested_price_max) / 2}
              minPrice={result.suggested_price_min}
              maxPrice={result.suggested_price_max}
              currency={result.suggested_price_currency}
              onSelectPrice={(selectedPrice) => {
                update("price", String(selectedPrice));
                toast.success(`Updated listing price to $${selectedPrice.toFixed(2)}`);
              }}
            />
          )}

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Listing Form & Specs
            </h2>

            <Field label="Product Title">
              <input
                className={inputCls}
                value={form.product}
                onChange={(e) => update("product", e.target.value)}
                placeholder="Product name"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ($ AUD)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Cost Basis ($ AUD)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.cost}
                  onChange={(e) => update("cost", e.target.value)}
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                  className={inputCls}
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Sold">Sold</option>
                </select>
              </Field>
              <Field label="Condition">
                <input
                  className={inputCls}
                  value={form.condition}
                  onChange={(e) => update("condition", e.target.value)}
                  placeholder="Pre-owned - Excellent"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand">
                <input
                  className={inputCls}
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                  placeholder="Brand"
                />
              </Field>
              <Field label="Category">
                <input
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  placeholder="Category"
                />
              </Field>
            </div>

            <Field label="eBay 80-Char SEO Title" hint={`${form.ebay_title.length}/80`}>
              <input
                className={inputCls}
                value={form.ebay_title}
                onChange={(e) => update("ebay_title", e.target.value)}
                placeholder="eBay title (max 80 chars)"
              />
            </Field>

            <Field label="Marketplace Description">
              <textarea
                className={`${inputCls} min-h-[140px] resize-y py-2.5 font-sans leading-relaxed`}
                value={form.detailed_description || form.seo_description}
                onChange={(e) => update("detailed_description", e.target.value)}
                placeholder="Item description, specifics, and condition..."
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-bold text-slate-200 border border-slate-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? "Saving…" : "Save to Inventory"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!form.product.trim()) {
                    toast.error("Please enter a product title first.");
                    return;
                  }
                  setIsEbayModalOpen(true);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>⚡ Publish to eBay</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Dedicated eBay Publish Review Modal */}
      <EbayListingModal
        isOpen={isEbayModalOpen}
        onClose={() => setIsEbayModalOpen(false)}
        title={form.ebay_title || form.product}
        brand={form.brand || "Authentic"}
        price={Number(form.price) || 25}
        condition={form.condition || "Used - Good"}
        description={form.detailed_description || form.seo_description}
        imageUrls={imageUrls}
      />
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-[11px] font-bold text-slate-400">
        <span>{label}</span>
        {hint && <span className="font-mono text-[10px] text-slate-500">{hint}</span>}
      </span>
      <div>{children}</div>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="font-bold text-slate-200 truncate">{value || "—"}</dd>
    </div>
  );
}
