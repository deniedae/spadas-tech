"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import ImageDropzone from "@/components/image-dropzone";
import UsageBadge from "@/components/usage-badge";
import PricingStrategyCard from "@/components/pricing-strategy-card";
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, XCircle,
  TrendingUp, DollarSign, Target, ArrowRight,
} from "lucide-react";

interface SourcingVerdict {
  identification: {
    product_name: string;
    brand: string | null;
    category: string;
    condition: string;
    confidence: "high" | "medium" | "low";
    confidence_score: number;
  };
  market_prices: {
    suggested_median: number;
    suggested_min: number;
    suggested_max: number;
    sample_size: number;
    currency: string;
  };
  cost: number;
  fees: {
    marketplace_fee: number;
    payment_fee: number;
    shipping_estimated: number;
  };
  profit: {
    gross: number;
    net: number;
    margin_pct: number;
    roi_pct: number;
  };
  verdict: "buy" | "caution" | "pass";
  verdict_reason: string;
}

const verdictConfig = {
  buy: {
    label: "BUY",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    border: "border-green-500/40",
    bg: "bg-green-50 dark:bg-green-500/10",
  },
  caution: {
    label: "CAUTION",
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  pass: {
    label: "PASS",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    border: "border-red-500/40",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
};

const inputCls =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

export default function SourcingPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [cost, setCost] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<SourcingVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [router]);

  const handleFilesChange = async (nextFiles: File[]) => {
    setFiles(nextFiles);
    if (nextFiles.length === 0) {
      setImageUrls([]);
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const urls: string[] = [];
    for (const file of nextFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    setImageUrls(urls);
    setUploading(false);
  };

  const canCheck =
    imageUrls.length > 0 && !uploading && !checking && cost && Number(cost) >= 0;

  async function handleCheck() {
    if (!canCheck) return;
    setChecking(true);
    setVerdict(null);
    setError(null);
    try {
      const res = await fetch("/api/sourcing-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls, cost: Number(cost) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Check failed (${res.status})`);
      }
      const data = (await res.json()) as SourcingVerdict;
      window.dispatchEvent(new Event("usage-updated"));
      setVerdict(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sourcing check failed.");
      toast.error(err instanceof Error ? err.message : "Sourcing check failed.");
    } finally {
      setChecking(false);
    }
  }

  function reset() {
    setFiles([]);
    setImageUrls([]);
    setCost("");
    setVerdict(null);
    setError(null);
  }

  return (
    <main className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sourcing Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Snap a photo, enter what you&apos;d pay, and get a buy/pass verdict based on real eBay sold prices.
          </p>
        </div>
        <UsageBadge />
      </div>

      {!verdict && !checking && (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              1. Product photos
            </h2>
            <ImageDropzone files={files} onFilesChange={handleFilesChange} max={10} />
            {uploading && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              2. Your cost
            </h2>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                inputMode="decimal"
                placeholder="What would you pay for this?"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className={`${inputCls} pl-12`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5" />
            Check This Item
          </button>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </>
      )}

      {checking && (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-semibold">Analyzing your item</p>
              <p className="text-sm text-muted-foreground">
                Identifying the product, pulling real sold prices, and calculating profit…
              </p>
            </div>
          </div>
        </div>
      )}

      {verdict && !checking && (
        <div className="space-y-6 animate-fade-in">
          {/* Verdict card */}
          <div className={`rounded-2xl border-2 ${verdictConfig[verdict.verdict].border} ${verdictConfig[verdict.verdict].bg} p-6 shadow-sm`}>
            <div className="flex items-center gap-4">
              {(() => {
                const Icon = verdictConfig[verdict.verdict].icon;
                return <Icon className={`h-12 w-12 ${verdictConfig[verdict.verdict].className}`} />;
              })()}
              <div className="flex-1">
                <p className={`text-2xl font-bold ${verdictConfig[verdict.verdict].className}`}>
                  {verdictConfig[verdict.verdict].label}
                </p>
                <p className="mt-1 text-sm text-foreground">{verdict.verdict_reason}</p>
              </div>
            </div>
          </div>

          {/* Identification */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Identification
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Product</dt>
                <dd className="font-medium">{verdict.identification.product_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Brand</dt>
                <dd className="font-medium">{verdict.identification.brand || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="font-medium">{verdict.identification.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Condition</dt>
                <dd className="font-medium">{verdict.identification.condition}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <Target className="h-4 w-4 text-primary" />
              <span>
                AI confidence:{" "}
                <strong className="capitalize">{verdict.identification.confidence}</strong>{" "}
                ({Math.round(verdict.identification.confidence_score * 100)}%)
              </span>
            </div>
          </div>

          {/* Interactive Pricing Strategy (Quick Sell vs Market vs Top Dollar) */}
          <PricingStrategyCard
            medianPrice={verdict.market_prices.suggested_median}
            minPrice={verdict.market_prices.suggested_min}
            maxPrice={verdict.market_prices.suggested_max}
            currency={verdict.market_prices.currency}
            onSelectPrice={(selectedPrice) => {
              toast.success(`Selected strategy price: ${verdict.market_prices.currency} $${selectedPrice.toFixed(2)}`);
            }}
          />

          {/* Market prices */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Real sold prices
            </h2>
            {verdict.market_prices.sample_size > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Based on{" "}
                  <strong>{verdict.market_prices.sample_size}</strong> recent eBay sale
                  {verdict.market_prices.sample_size === 1 ? "" : "s"} (last 30 days):
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {verdict.market_prices.currency} {verdict.market_prices.suggested_median.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">median sold price</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Range: {verdict.market_prices.currency} {verdict.market_prices.suggested_min.toFixed(2)} –{" "}
                  {verdict.market_prices.suggested_max.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent eBay sales found for this item. Price estimate is unreliable.
              </p>
            )}
          </div>

          {/* Profit breakdown */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Profit breakdown
            </h2>
            <div className="space-y-2 text-sm">
              <Row label="Estimated sale price" value={`${verdict.market_prices.currency} ${verdict.market_prices.suggested_median.toFixed(2)}`} />
              <Row label="Your cost" value={`− ${verdict.market_prices.currency} ${verdict.cost.toFixed(2)}`} />
              <Row label="Marketplace fee (13.25%)" value={`− ${verdict.market_prices.currency} ${verdict.fees.marketplace_fee.toFixed(2)}`} muted />
              <Row label="Payment fee (~2.7%)" value={`− ${verdict.market_prices.currency} ${verdict.fees.payment_fee.toFixed(2)}`} muted />
              <Row label="Est. shipping" value={`− ${verdict.market_prices.currency} ${verdict.fees.shipping_estimated.toFixed(2)}`} muted />
              <div className="border-t border-border pt-2">
                <Row
                  label="Net profit"
                  value={`${verdict.profit.net >= 0 ? "" : "−"} ${verdict.market_prices.currency} ${Math.abs(verdict.profit.net).toFixed(2)}`}
                  strong
                  positive={verdict.profit.net >= 0}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-muted-foreground">Margin</p>
                  <p className={`mt-0.5 text-lg font-bold ${verdict.profit.margin_pct >= 20 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {verdict.profit.margin_pct}%
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-muted-foreground">ROI</p>
                  <p className={`mt-0.5 text-lg font-bold ${verdict.profit.roi_pct >= 30 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {verdict.profit.roi_pct}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Check another item
            </button>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                if (imageUrls[0]) params.set("image", imageUrls[0]);
                if (verdict?.identification?.product_name)
                  params.set("product", verdict.identification.product_name);
                if (cost) params.set("cost", cost);
                router.push(`/generator?${params.toString()}`);
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              List this item
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({
  label, value, strong, muted, positive,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : strong ? "font-semibold" : ""}>
        {label}
      </span>
      <span
        className={`tabular-nums ${strong ? "font-bold" : ""} ${
          strong && positive ? "text-green-600 dark:text-green-400" : ""
        } ${strong && !positive ? "text-red-600 dark:text-red-400" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
