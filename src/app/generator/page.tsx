"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import ImageDropzone from "@/components/image-dropzone";
import { Sparkles, Loader2, AlertCircle, Package, Save, ArrowRight, ArrowLeft } from "lucide-react";

interface GeneratedListing {
  title: string;
  description: string;
  price?: string | number;
}

type Step = "input" | "review" | "saving";

export default function GeneratorPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [product, setProduct] = useState("");
  const [listing, setListing] = useState<GeneratedListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Editable form fields (after generation)
  
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editStatus, setEditStatus] = useState("Draft");

  // Images
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // Real sold-price suggestion
  const [priceSuggestion, setPriceSuggestion] = useState<{
    suggested_min: number;
    suggested_max: number;
    suggested_median: number;
    sample_size: number;
    currency: string;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const inputCls =
    "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

  // Upload images whenever they change
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

  async function generateListing(e: React.FormEvent) {
    e.preventDefault();
    if (!product.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    setLoading(true);
    setListing(null);
    setError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Generation failed (${res.status})`);
      }
        async function fetchPriceSuggestion(query: string) {
    setPriceLoading(true);
    setPriceError(null);
    setPriceSuggestion(null);
    try {
      const res = await fetch("/api/price-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Price lookup failed (${res.status})`);
      }
      const data = await res.json();
      setPriceSuggestion(data);
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : "Couldn't load sold prices.");
    } finally {
      setPriceLoading(false);
    }
  }

      const data = await res.json();
              setListing(data);
      setEditTitle(data.title || "");
      setEditDescription(data.description || "");
      setEditPrice(data.price !== undefined ? String(data.price) : "");
      setStep("review");
      toast.success("Listing generated!");

      // Kick off real sold-price lookup in the background
      fetchPriceSuggestion(product.trim());


    } catch (err) {
      console.error(err);
      setError(true);
      toast.error(err instanceof Error ? err.message : "Couldn't generate a listing.");
    } finally {
      setLoading(false);
    }
  }

  async function saveListing() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    if (!editTitle.trim()) { toast.error("Title is required."); return; }
    setStep("saving");
    try {
      const { error } = await supabase
        .from("listings")
        .insert([{
          user_id: user.id,
          product: editTitle.trim(),
          price: Number(editPrice) || 0,
          cost: Number(editCost) || 0,
          status: editStatus,
          image_url: imageUrls[0] ?? null,
        }]);
      if (error) throw error;
      toast.success("Listing saved!");
      router.push("/listings");
    } catch (err: any) {
      toast.error(err.message || "Failed to save listing.");
      setStep("review");
    }
  }

  function reset() {
    setStep("input");
    setListing(null);
    setProduct("");
    setFiles([]);
    setImageUrls([]);
    setError(false);
  }

  // ───────────────────────────────────────────────
  // STEP 1: Input
  // ───────────────────────────────────────────────
  if (step === "input") {
    return (
      <main className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Listing Generator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Type a product name, get a title, description, and suggested price. Then add photos and save.
          </p>
        </div>

        <form
          onSubmit={generateListing}
          className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <label htmlFor="product" className="mb-1.5 block text-sm font-medium">
            Product
          </label>
          <input
            id="product"
            type="text"
            placeholder="e.g. Nintendo DS Lite, vintage camera, sneaker brand…"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className={inputCls}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate Listing
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {loading && (
          <div className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-3">
              <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-20 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex max-w-xl items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p>Could not generate a listing. Check the form above and try again.</p>
          </div>
        )}

        {!loading && !error && !listing && (
          <div className="flex max-w-xl flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">No listing yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Enter a product above and we'll generate a title, description, and suggested price for you.
            </p>
          </div>
        )}
      </main>
    );
  }

  // ───────────────────────────────────────────────
  // STEP 2: Review + images + save
  // ───────────────────────────────────────────────
  return (
    <main className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review & Save</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit anything below, add photos, then save your listing.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Start over
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT: Editable listing fields */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Listing details
          </h2>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Title</span>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Description</span>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className={`${inputCls} min-h-[120px] resize-y`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Price ($)</span>
              <input
                type="number"
                inputMode="decimal"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className={inputCls}
              />
            </label>

            {/* Real sold-price suggestion */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Real sold prices
              </p>

              {priceLoading && (
                <p className="text-sm text-muted-foreground">
                  Checking recent eBay sales…
                </p>
              )}

              {priceError && !priceLoading && (
                <p className="text-sm text-muted-foreground">
                  Couldn't load sold prices. You can still set your own price above.
                </p>
              )}

              {priceSuggestion && !priceLoading && !priceError && (
                <>
                  {priceSuggestion.sample_size > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Based on{" "}
                        <strong>{priceSuggestion.sample_size}</strong> recent eBay sale
                        {priceSuggestion.sample_size === 1 ? "" : "s"} (last 30 days):
                      </p>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <span>
                          Suggested:{" "}
                          <strong>
                            {priceSuggestion.currency} {priceSuggestion.suggested_min.toFixed(2)} –{" "}
                            {priceSuggestion.suggested_max.toFixed(2)}
                          </strong>
                        </span>
                        <span className="text-muted-foreground">
                          median {priceSuggestion.currency} {priceSuggestion.suggested_median.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditPrice(String(priceSuggestion.suggested_median.toFixed(2)))
                        }
                        className="inline-flex h-7 items-center rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/20"
                      >
                        Use median price
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recent eBay sales found for this product. Set your own price above.
                    </p>
                  )}
                </>
              )}
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Cost ($)</span>
              <input
                type="number"
                inputMode="decimal"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
                placeholder="What you paid"
                className={inputCls}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className={inputCls}
            >
              <option>Draft</option>
              <option>Active</option>
              <option>Sold</option>
            </select>
          </label>

          {editPrice && Number(editPrice) > 0 && editCost && Number(editCost) > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              Projected profit:{" "}
              <strong className="text-green-600 dark:text-green-400">
                ${(Number(editPrice) - Number(editCost)).toFixed(2)}
              </strong>
            </div>
          )}
        </div>

        {/* RIGHT: Image upload */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Product photos
          </h2>
          <ImageDropzone files={files} onFilesChange={setFiles} max={10} disabled={step === "saving"} />

          {uploading && (
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </p>
          )}

          <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Tip</p>
            <p className="mt-1">
              The first photo becomes the cover image shown in your listings table. Good lighting and a clean background help buyers decide faster.
            </p>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm text-muted-foreground">
          {imageUrls.length > 0
            ? `${imageUrls.length} photo${imageUrls.length === 1 ? "" : "s"} ready`
            : "No photos (optional)"}
        </p>
        <button
          type="button"
          onClick={saveListing}
          disabled={step === "saving" || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {step === "saving" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-4 w-4" /> Save Listing</>
          )}
        </button>
      </div>
    </main>
  );
}
