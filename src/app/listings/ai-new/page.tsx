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
  const [keyword, setKeyword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<AiListingResult | null>(null);
  const [saving, setSaving] = useState(false);
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

  const canGenerate = (imageUrls.length > 0 || keyword.trim().length > 0) && !uploading && !generating;

  async function handleGenerate() {
    if (!canGenerate) {
      toast.error("Please upload images or enter product keywords.");
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
          const text = await response.text().catch(() => "");
          errMessage = text || `Server error (${response.status})`;
        }
        throw new Error(errMessage);
      }
      const data = await response.json();
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
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error(err.message || "AI generation failed.");
      }
    } finally {
      if (stageTimer.current) {
        clearInterval(stageTimer.current);
        stageTimer.current = null;
      }
      setGenerating(false);
    }
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
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

      if (result) {
        await supabase.from("ai_listing_analyses").insert([{
          user_id: user.id,
          image_urls: imageUrls,
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
            suggested_keywords: form.keywords.split(",").map(k => k.trim()).filter(Boolean),
          },
          listing_id: listing.id,
        }]);
      }
      toast.success("Listing saved!");
      router.push("/listings");
    } catch {
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
        <h1 className="text-2xl font-bold tracking-tight">AI Listing Generator</h1>
        <p className="text-sm text-muted-foreground">
          Upload photos and/or enter product keywords to build your marketplace listing.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Product keywords</h2>
            <input
              type="text"
              placeholder="Enter product keywords"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-3 shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">2. Product photos</h2>
            <ImageDropzone files={files} onFilesChange={setFiles} max={10} disabled={generating} />
            {uploading && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">3. Generate</h2>
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
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
              {/* AI Analysis summary here */}
              {/* ... */}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Listing details
            </h2>

            {/* Form Fields */}
            <Field label="Product name">
              <input className={inputCls} value={form.product} onChange={(e) => update("product", e.target.value)} />
            </Field>
            {/* More form fields here following your structure */}
            {/* ... */}
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
