"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import ImageDropzone from "@/components/image-dropzone";
import SnapPhotoListing from "@/components/snap-photo-listing";
import UsageBadge from "@/components/usage-badge";
import PricingStrategyCard from "@/components/pricing-strategy-card";
import type { AiListingResult, Confidence, ShippingSize } from "@/types/ai-listing";
import { ArrowLeft, Sparkles, Loader2, Save, TrendingUp, ShieldCheck } from "lucide-react";

type AiGenerationStage = "analyzing" | "generating-titles" | "estimating-price" | "finalizing";

const STAGES: { key: AiGenerationStage; label: string }[] = [
  { key: "analyzing", label: "Analyzing images" },
  { key: "generating-titles", label: "Writing marketplace titles" },
  { key: "estimating-price", label: "Estimating price" },
  { key: "finalizing", label: "Finalizing" },
];

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

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
  const [publishingEbay, setPublishingEbay] = useState(false);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handlePublishEbay() {
    if (!form.product.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setPublishingEbay(true);
    try {
      const res = await fetch("/api/marketplaces/ebay/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: form.product.trim(),
          description: form.seo_description || form.detailed_description,
          price: Number(form.price) || 25,
          condition: form.condition,
          brand: form.brand,
          imageUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to publish to eBay.");
      }

      toast.success(data.message || "Successfully published to eBay!");
      if (data.listingUrl) {
        window.open(data.listingUrl, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to publish to eBay.");
    } finally {
      setPublishingEbay(false);
    }
  }

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
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFilesChange = async (nextFiles: File[]) => {
    setFiles(nextFiles);

    if (nextFiles.length === 0) {
      setImageUrls([]);
      return;
    }

    setUploading(true);
    const urls: string[] = [];

    for (const file of nextFiles) {
      try {
        const compressedBase64 = await compressImageFile(file);
        if (compressedBase64) {
          urls.push(compressedBase64);
        }
      } catch (err) {
        console.error("Failed to compress image file:", err);
        toast.error("Failed to process image file.");
      }
    }

    setImageUrls(urls);
    setUploading(false);
  };

  const canGenerate = imageUrls.length > 0 && !uploading && !generating;

  async function handleGenerate() {
    if (!canGenerate) {
      toast.error("Please upload at least one product image.");
      return;
    }

    setGenerating(true);
    setStageIdx(0);
    stageTimer.current = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGES.length - 1));
    }, 1800);
    setResult(null);
    try {
      const response = await fetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls, keyword: keyword.trim() }),
      });
      if (!response.ok) {
        let errMessage = "AI generation failed.";
        try {
          const err = await response.json();
          errMessage = err.error || errMessage;
        } catch {
          const textText = await response.text().catch(() => "");
          errMessage = textText || `Server error (${response.status})`;
        }
        throw new Error(errMessage);
      }
      const data = await response.json();
      window.dispatchEvent(new Event("usage-updated"));
      setResult(data);
      setForm({
        product: data.analysis.product_name || "",
        price: data.suggested_price_max ? String(data.suggested_price_max) : "",
        cost: "",
        status: "Draft",
        condition: data.analysis.condition || "",
        brand: data.analysis.brand || "",
        model: data.analysis.model || "",
        category: data.analysis.category || "",
        color: data.analysis.color || "",
        material: data.analysis.material || "",
        seo_description: data.seo_description || "",
        detailed_description: data.detailed_description || "",
        keywords: data.suggested_keywords.join(", "),
        ebay_title: data.market_titles.ebay || "",
        fb_title: data.market_titles.facebook_marketplace || "",
        vinted_title: data.market_titles.vinted || "",
        depop_title: data.market_titles.depop || "",
        shipping_size: data.shipping_estimate?.size || "medium",
        shipping_weight: data.shipping_estimate?.estimated_weight_grams
          ? String(data.shipping_estimate.estimated_weight_grams)
          : "",
        shipping_notes: data.shipping_estimate?.notes || "",
      });
      toast.success("AI listing generated!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI generation failed.";
      if (err instanceof Error && err.name !== "AbortError") toast.error(message);
    } finally {
      if (stageTimer.current) {
        clearInterval(stageTimer.current);
        stageTimer.current = null;
      }
      setGenerating(false);
    }
  }

  async function handleSave() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
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

      if (result) {
        const sanitizedUrls = imageUrls.map((u) =>
          u.startsWith("data:") ? `data:image/jpeg;base64,...(${u.length} bytes)` : u
        );
        const { error: analysisError } = await supabase
          .from("ai_listing_analyses")
          .insert([
            {
              user_id: user.id,
              image_urls: sanitizedUrls,
        result: {
          ...result,
          analysis: {
            ...result.analysis,
            product_name: form.product,
            brand: form.brand || null,
            model: form.model || null,
            category: form.category,
            color: form.color || null,
            material: form.material || null,
            condition: form.condition,
          },
          market_titles: {
            ebay: form.ebay_title,
            facebook_marketplace: form.fb_title,
            vinted: form.vinted_title,
            depop: form.depop_title,
          },
          seo_description: form.seo_description,
          detailed_description: form.detailed_description,
          shipping_estimate: {
            size: form.shipping_size,
            estimated_weight_grams: Number(form.shipping_weight) || 0,
            dimensions_cm: result.shipping_estimate?.dimensions_cm ?? null,
            notes: form.shipping_notes || null,
          },
          suggested_keywords: form.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        },
        listing_id: listing.id,
      },
    ]);

  if (analysisError) {
    toast.error("Listing saved, but AI analysis failed to save.");
  }
}

      toast.success("Listing saved!");
      router.push("/listings");
    } catch (err) {
  console.error(err);
  toast.error("Failed to save listing.");
} finally {
  setSaving(false);
}

  }

  return (
    <main className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => router.push("/listings")}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">AI Listing Generator</h1>
          <UsageBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          Snap a photo or upload product images to generate a marketplace-ready listing with AI.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border bg-card border-border p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
  1. Optional notes
</h2>

            <input
              type="text"
              placeholder="Optional notes about the item"

              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-3 shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="rounded-2xl border bg-card border-border p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              2. Product photos
            </h2>
            <ImageDropzone files={files} onFilesChange={handleFilesChange} max={10} disabled={generating} />
            {uploading && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-card border-border p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              3. Generate
            </h2>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate AI Listing
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{imageUrls.length} of 10 images ready</p>
          </div>

          {result && (
            <div className="rounded-2xl border bg-card border-border p-6 shadow-sm animate-fade-in">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Analysis</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceStyles[result.analysis.confidence]}`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {result.analysis.confidence} confidence ·{" "}
                  {Math.round(result.analysis.confidence_score * 100)}%
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Detail label="Category" value={result.analysis.category} />
                <Detail label="Color" value={result.analysis.color} />
                <Detail label="Material" value={result.analysis.material} />
                <Detail label="Condition" value={result.analysis.condition} />
                <Detail label="Brand" value={result.analysis.brand} />
                <Detail label="Model" value={result.analysis.model} />
              </dl>
              {result.shipping_estimate && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estimated shipping
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Size:{" "}
                      <strong className="capitalize">
                        {result.shipping_estimate.size.replace("-", " ")}
                      </strong>
                    </span>
                    {result.shipping_estimate.estimated_weight_grams > 0 && (
                      <span>~{result.shipping_estimate.estimated_weight_grams} g</span>
                    )}
                    {result.shipping_estimate.dimensions_cm && (
                      <span>
                        {result.shipping_estimate.dimensions_cm.length}×
                        {result.shipping_estimate.dimensions_cm.width}×
                        {result.shipping_estimate.dimensions_cm.height} cm
                      </span>
                    )}
                  </div>
                  {result.shipping_estimate.notes && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {result.shipping_estimate.notes}
                    </p>
                  )}
                </div>
              )}
              {result.analysis.accessories_detected.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Accessories detected
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.analysis.accessories_detected.map((a) => (
                      <span
                        key={a}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>
                  Suggested price:{" "}
                  <strong>
                    ${result.suggested_price_min.toFixed(2)} –{" "}
                    ${result.suggested_price_max.toFixed(2)}
                  </strong>{" "}
                  {result.suggested_price_currency}
                </span>
              </div>
            </div>
          )}
        </section>

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

          <div className="rounded-2xl border bg-card border-border p-6 shadow-sm space-y-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Listing details
            </h2>

            <Field label="Product name">
              <input
                className={inputCls}
                value={form.product}
                onChange={(e) => update("product", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ($)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Cost ($)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.cost}
                  onChange={(e) => update("cost", e.target.value)}
                  className={inputCls}
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
                  <option>Draft</option>
                  <option>Active</option>
                  <option>Sold</option>
                </select>
              </Field>
              <Field label="Condition">
                <input
                  className={inputCls}
                  value={form.condition}
                  onChange={(e) => update("condition", e.target.value)}
                />
              </Field>
              
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand">
                <input
                  className={inputCls}
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                />
              </Field>
              <Field label="Category">
                <input
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Marketplace titles" hint="eBay / FB / Vinted / Depop">
              <input
                className={inputCls}
                value={form.ebay_title}
                onChange={(e) => update("ebay_title", e.target.value)}
                placeholder="eBay title"
              />
              <input
                className={inputCls}
                value={form.fb_title}
                onChange={(e) => update("fb_title", e.target.value)}
                placeholder="Facebook Marketplace title"
              />
              <input
                className={inputCls}
                value={form.vinted_title}
                onChange={(e) => update("vinted_title", e.target.value)}
                placeholder="Vinted title"
              />
              <input
                className={inputCls}
                value={form.depop_title}
                onChange={(e) => update("depop_title", e.target.value)}
                placeholder="Depop title"
              />
            </Field>

            <Field label="SEO description">
              <textarea
                className={`${inputCls} min-h-[90px] resize-y`}
                value={form.seo_description}
                onChange={(e) => update("seo_description", e.target.value)}
              />
            </Field>

            <Field label="Keywords" hint="comma separated">
              <input
                className={inputCls}
                value={form.keywords}
                onChange={(e) => update("keywords", e.target.value)}
              />
            </Field>

            <Field label="Detailed description" hint="marketplace body">
              <textarea
                className={`${inputCls} min-h-[160px] resize-y`}
                value={form.detailed_description}
                onChange={(e) => update("detailed_description", e.target.value)}
              />
            </Field>

            <Field label="Shipping estimate">
              <div className="grid grid-cols-2 gap-3">
                <select
                  className={inputCls}
                  value={form.shipping_size}
                  onChange={(e) => update("shipping_size", e.target.value)}
                >
                  <option value="small">Small (satchel)</option>
                  <option value="medium">Medium (small box)</option>
                  <option value="large">Large (medium box)</option>
                  <option value="extra-large">Extra-large (bulky)</option>
                </select>

                <input
                  className={inputCls}
                  type="number"
                  inputMode="numeric"
                  placeholder="Weight (g)"
                  value={form.shipping_weight}
                  onChange={(e) => update("shipping_weight", e.target.value)}
                />
              </div>

              <input
                className={inputCls}
                placeholder="Shipping notes (optional)"
                value={form.shipping_notes}
                onChange={(e) => update("shipping_notes", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || publishingEbay}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save Listing"}
              </button>

              <button
                type="button"
                onClick={handlePublishEbay}
                disabled={saving || publishingEbay}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {publishingEbay ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>🔵 1-Click Publish to eBay</span>}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </span>
      <div>{children}</div>
    </label>
  );
}
function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
