"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";

export default function SnapPhotoListing({
  onListingCreated,
}: {
  onListingCreated?: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setProcessing(true);
    setStatusText("Uploading photo…");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in first to create a listing.");
        setProcessing(false);
        return;
      }

      // 1. Upload to Supabase Storage
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      // 2. Run AI Analysis via /api/ai-listing
      setStatusText("Analyzing image with AI…");

      const response = await fetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: [publicUrl] }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "AI analysis failed.");
      }

      const aiData = await response.json();
      window.dispatchEvent(new Event("usage-updated"));
      const productName = aiData.analysis?.product_name || "New AI Item";
      const price = Number(aiData.suggested_price_max || aiData.suggested_price_min || 0);

      // 3. Create Draft Listing
      setStatusText("Creating listing…");

      const { error: insertError } = await supabase.from("listings").insert([
        {
          user_id: user.id,
          product: productName,
          price,
          cost: 0,
          status: "Draft",
          image_url: publicUrl,
        },
      ]);

      if (insertError) {
        throw new Error(`Listing save failed: ${insertError.message}`);
      }

      toast.success(`Created listing: "${productName}"!`);
      onListingCreated?.();
      router.push("/listings");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to create listing from photo.";
      toast.error(msg);
    } finally {
      setProcessing(false);
      setStatusText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-background p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> Instant AI Camera
          </div>
          <h2 className="text-lg font-bold">Snap Photo & Create Listing</h2>
          <p className="text-xs text-muted-foreground">
            Take a photo of any item on your phone to automatically generate title, price, and draft listing.
          </p>
        </div>

        {/* Hidden File Input configured for Mobile Camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
          id="instant-camera-input"
        />

        <button
          type="button"
          disabled={processing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-12 w-full sm:w-auto min-w-[200px] items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{statusText}</span>
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" />
              <span>📸 Snap Photo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
