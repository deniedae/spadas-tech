"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import ImageDropzone from "@/components/image-dropzone";
import { generateListing } from "@/lib/ai/listing-generator";
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
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<AiListingResult | null>(null);
  const [saving, setSaving] = useState(false);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
  product: "", price: "", cost: "", status: "Draft", condition: "",
  brand: "", model: "", category: "", color: "", material: "",
  seo_description: "", detailed_description: "", keywords: "",
  ebay_title: "", fb_title: "", vinted_title: "", depop_title: "",
  shipping_size: "medium", shipping_weight: "", shipping_notes: "",
});
  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [router]);

  useEffect(() => {
    if (generating) {
      setStageIdx(0);
      stageTimer.current = setInterval(() => {
        setStageIdx((i) => Math.min(i + 1, STAGES.length - 1));
      }, 1800);
    } else if (stageTimer.current) {
      clearInterval(stageTimer.current);
      stageTimer.current = null;
    }
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, [generating]);

  // Upload to storage whenever files change.
  useEffect(() => {
    if (files.length === 0) {
      setImageUrls([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUploading(false); return; }
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("listing-images")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      if (!cancelled) setImageUrls(urls);
      setUploading(false);
    })();
    return () => { cancelled = true; };
  }, [files]);

  const canGenerate = imageUrls.length > 0 && !uploading && !generating;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setResult(null);
    try {
      const r = await generateListing({ imageUrls });
      setResult(r);
   setForm({
  product: r.analysis.product_name || "",
  price: r.suggested_price_max ? String(r.suggested_price_max) : "",
  cost: "", status: "Draft", condition: r.analysis.condition || "",
  brand: r.analysis.brand || "", model: r.analysis.model || "",
  category: r.analysis.category || "", color: r.analysis.color || "",
  material: r.analysis.material || "", seo_description: r.seo_description || "",
  detailed_description: r.detailed_description || "",
  keywords: r.suggested_keywords.join(", "),
  ebay_title: r.market_titles.ebay || "",
  fb_title: r.market_titles.facebook_marketplace || "",
  vinted_title: r.market_titles.vinted || "",
  depop_title: r.market_titles.depop || "",
  shipping_size: r.shipping_estimate?.size || "medium",
  shipping_weight: r.shipping_estimate?.estimated_weight_grams
    ? String(r.shipping_estimate.estimated_weight_grams) : "",
  shipping_notes: r.shipping_estimate?.notes || "",
});
      toast.success("AI listing generated!");
    } catch (err: any) {
      if (err.name !== "AbortError") toast.error(err.message || "AI generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    if (!form.product.trim()) { toast.error("Product name is required."); return; }
    setSaving(true);

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert([{
        user_id: user.id,
        product: form.product.trim(),
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        status: form.status,
        image_url: imageUrls[0] ?? null,
      }])
      .select("id")
      .single();

    if (listingError || !listing) {
      toast.error(listingError?.message || "Failed to save listing.");
      setSaving(false);
      return;
    }

    const enrichedResult: AiListingResult | null = result
      ? {
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
  size: form.shipping_size as ShippingSize,
  estimated_weight_grams: Number(form.shipping_weight) || 0,
  dimensions_cm: result.shipping_estimate?.dimensions_cm ?? null,
  notes: form.shipping_notes || null,
},

suggested_keywords: form.keywords
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean),
        }
      : null;

    if (enrichedResult) {
      await supabase.from("ai_listing_analyses").insert([{
        user_id: user.id,
        image_urls: imageUrls,
        result: enrichedResult,
        listing_id: listing.id,
      }]);
    }

    toast.success("Listing saved!");
    router.push("/listings");
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
        <h1 className="text-2xl font-bold tracking-tight">AI Listing Generator</h1>
        <p className="text-sm text-muted-foreground">
          Upload photos and let AI build your marketplace listing.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              1. Product photos
            </h2>
            <ImageDropzone files={files} onFilesChange={setFiles} max={10} disabled={generating} />
            {uploading && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              2. Generate
            </h2>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate AI Listing</>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {imageUrls.length} of 10 images ready
            </p>

            {generating && (
              <div className="mt-5 space-y-2">
                {STAGES.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2 text-sm">
                    {i < stageIdx ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : i === stageIdx ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border" />
                    )}
                    <span className={i <= stageIdx ? "text-foreground" : "text-muted-foreground"}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Analysis
                </h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceStyles[result.analysis.confidence]}`}>
                  <ShieldCheck className="h-3 w-3" />
                  {result.analysis.confidence} confidence · {Math.round(result.analysis.confidence_score * 100)}%
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
        Size: <strong className="capitalize">{result.shipping_estimate.size.replace("-", " ")}</strong>
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
      <p className="mt-1.5 text-xs text-muted-foreground">{result.shipping_estimate.notes}</p>
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
                      <span key={a} className="rounded-md bg-muted px-2 py-0.5 text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>
                  Suggested price:{" "}
                  <strong>
                    ${result.suggested_price_min.toFixed(2)} – ${result.suggested_price_max.toFixed(2)}
                  </strong>{" "}
                  {result.suggested_price_currency}
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Listing details
            </h2>

            {generating && !result && (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {!generating && !result && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Your generated listing will appear here.
              </p>
            )}

            {result && (
              <div className="space-y-4 animate-fade-in">
                <Field label="Product name">
                  <input className={inputCls} value={form.product} onChange={(e) => update("product", e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price ($)">
                    <input className={inputCls} type="number" inputMode="decimal" value={form.price} onChange={(e) => update("price", e.target.value)} />
                  </Field>
                  <Field label="Cost ($)">
                    <input className={inputCls} type="number" inputMode="decimal" value={form.cost} onChange={(e) => update("cost", e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <select className={inputCls} value={form.status} onChange={(e) => update("status", e.target.value)}>
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Sold</option>
                    </select>
                  </Field>
                  <Field label="Condition">
                    <input className={inputCls} value={form.condition} onChange={(e) => update("condition", e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Brand">
                    <input className={inputCls} value={form.brand} onChange={(e) => update("brand", e.target.value)} />
                  </Field>
                  <Field label="Category">
                    <input className={inputCls} value={form.category} onChange={(e) => update("category", e.target.value)} />
                  </Field>
                </div>
                <Field label="Marketplace titles" hint="eBay / FB / Vinted / Depop">
                  <input className={inputCls} value={form.ebay_title} onChange={(e) => update("ebay_title", e.target.value)} placeholder="eBay title" />
                  <input className={inputCls} value={form.fb_title} onChange={(e) => update("fb_title", e.target.value)} placeholder="Facebook Marketplace title" />
                  <input className={inputCls} value={form.vinted_title} onChange={(e) => update("vinted_title", e.target.value)} placeholder="Vinted title" />
                  <input className={inputCls} value={form.depop_title} onChange={(e) => update("depop_title", e.target.value)} placeholder="Depop title" />
                </Field>
                <Field label="SEO description">
                  <textarea className={`${inputCls} min-h-[90px] resize-y`} value={form.seo_description} onChange={(e) => update("seo_description", e.target.value)} />
                </Field>
                <Field label="Keywords" hint="comma separated">
                  <input className={inputCls} value={form.keywords} onChange={(e) => update("keywords", e.target.value)} />
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
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save Listing"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </span>
      <div className="space-y-1.5">{children}</div>
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
