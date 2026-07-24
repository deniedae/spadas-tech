"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { Sparkles, Loader2, AlertCircle, Package } from "lucide-react";

interface GeneratedListing {
  title: string;
  description: string;
  price?: string | number;
}

export default function GeneratorPage() {
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [listing, setListing] = useState<GeneratedListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });

      if (!res.ok) {
        throw new Error("Generation failed.");
      }

      const data = await res.json();
      setListing(data);
      toast.success("Listing generated!");
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Couldn't generate a listing. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          AI Listing Generator
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create marketplace listings instantly.
        </p>
      </div>

      <form
        onSubmit={generateListing}
        className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <label htmlFor="product" className="mb-1.5 block text-sm font-medium text-gray-700">
          Product
        </label>
        <input
          id="product"
          type="text"
          placeholder="e.g. Nintendo DS Lite, vintage camera, sneaker brand…"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
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
            </>
          )}
        </button>
      </form>

      {/* Loading skeleton */}
      {loading && (
        <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="h-7 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex max-w-xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p>Could not generate a listing. Check your connection and try again.</p>
        </div>
      )}

      {/* Result */}
      {!loading && listing && !error && (
        <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">{listing.title}</h2>
          </div>

          {listing.price !== undefined && listing.price !== null && (
            <p className="mt-2 text-2xl font-bold tabular-nums text-blue-600">
              {listing.price}
            </p>
          )}

          {listing.description && (
            <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
              {listing.description}
            </p>
          )}
        </div>
      )}

      {/* Empty state — before any generation */}
      {!loading && !listing && !error && (
        <div className="flex max-w-xl flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-900">No listing yet</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">
            Enter a product above and we'll generate a title, description, and suggested price for you.
          </p>
        </div>
      )}
    </main>
  );
}
