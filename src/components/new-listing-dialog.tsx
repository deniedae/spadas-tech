"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { Loader2, X, Camera, Zap, Package, DollarSign, ArrowRight, ShieldAlert } from "lucide-react";
import { fmtMoney, calcProfit } from "@/app/lib/listings";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import { estimateCategoryShippingCost } from "@/lib/thrift-cop-engine";

type InitialListingData = {
  name?: string;
  suggestedPrice?: number;
  brand?: string;
  category?: string;
  image?: string;
};

export default function NewListingDialog({
  initialData,
  trigger,
}: {
  initialData?: InitialListingData;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [product, setProduct] = useState(initialData?.name ?? "");
  const [price, setPrice] = useState(initialData?.suggestedPrice?.toString() ?? "");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState(
    initialData?.brand
      ? `Brand: ${initialData.brand}\nCategory: ${initialData.category || "General"}`
      : ""
  );

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initialData?.image ?? "");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files: File[]) => {
      if (files.length === 0) return;
      setImage(files[0]);
      setImagePreview(URL.createObjectURL(files[0]));
    },
    accept: { "image/*": [] },
    multiple: false,
  });

  // Real-Time Hardware Margin & Velocity Telemetry Preview
  const numPrice = Number(price) || 0;
  const numCost = Number(cost) || 0;

  const telemetry = useMemo(() => {
    if (numPrice <= 0) return null;
    const ebayFee = Math.round((numPrice * 0.134 + 0.33) * 100) / 100;
    const estShipping = estimateCategoryShippingCost("General", product);
    const netProfit = Math.round((numPrice - numCost - ebayFee - estShipping) * 100) / 100;
    const roi = numCost > 0 ? Math.round((netProfit / numCost) * 100) : 0;
    const velocity = calculateSalesVelocity({
      productName: product || "General Item",
      category: "",
    });

    return {
      netProfit,
      roi,
      ebayFee,
      estShipping,
      velocity,
      isFastFlip: velocity.sellThroughRate > 90,
      isTrap: velocity.sellThroughRate < 25 || velocity.isHoarderRisk,
    };
  }, [numPrice, numCost, product]);

  async function handleGenerateAI() {
    if (!image && !imagePreview) {
      toast.error("Please upload an image first.");
      return;
    }
    setAiLoading(true);

    try {
      let payloadUrl = imagePreview;

      if (image) {
        payloadUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image file."));
          reader.readAsDataURL(image);
        });
      }

      if (!payloadUrl) throw new Error("No image data available.");

      const response = await fetch("/api/rapid-thrift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: payloadUrl, currency: "AUD" }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "AI generation failed.");

      setProduct(result.itemName || result.product_name || product);
      if (result.ebayTitle || result.product_name) {
        setDescription(
          `Title: ${result.ebayTitle || result.product_name}\nCondition: ${result.condition || "USED"}\nPart Number: ${result.partNumber || "N/A"}`
        );
      }
      if (result.estimatedValue || result.estimated_value) {
        setPrice(String(result.estimatedValue || result.estimated_value));
      }
      if (result.thriftCost || result.thrift_cost) {
        setCost(String(result.thriftCost || result.thrift_cost));
      }

      toast.success("Specimen analyzed with Vercel AI SDK!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI generation failed.";
      toast.error(message);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveListing() {
    if (!product.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Please enter a valid target price.");
      return;
    }
    if (isNaN(Number(cost)) || Number(cost) < 0) {
      toast.error("Please enter a valid cost basis.");
      return;
    }
    setSaving(true);

    let imageUrl = initialData?.image ?? "";
    if (!imageUrl && imagePreview && imagePreview.startsWith("http")) {
      imageUrl = imagePreview;
    }

    if (image) {
      setUploading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Please log in.");
        setUploading(false);
        setSaving(false);
        return;
      }
      const filename = `${user.id}-${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filename, image);
      if (uploadError) {
        toast.error(uploadError.message);
        setUploading(false);
        setSaving(false);
        return;
      }
      const { data } = supabase.storage.from("listing-images").getPublicUrl(filename);
      imageUrl = data.publicUrl;
      setUploading(false);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Please log in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("listings").insert([
      {
        user_id: user.id,
        title: product,
        product,
        price: Number(price),
        cost: Number(cost),
        description,
        image_url: imageUrl,
        status: "Active",
      },
    ]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Inventory unit committed!");
    setOpen(false);

    setProduct("");
    setPrice("");
    setCost("");
    setDescription("");
    setImage(null);
    setImagePreview("");

    router.refresh();
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)} style={{ cursor: "pointer", display: "inline-block" }}>
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary text-xs font-bold px-3.5 h-9"
        >
          <span>+ LOG UNIT</span>
        </button>
      )}

      <DialogContent className="sm:max-w-2xl bg-[#0E1118] border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-xl shadow-2xl relative overflow-hidden">
        {/* Tactical Corner Crosshair */}
        <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#F97316] pointer-events-none" />
        <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#F97316] pointer-events-none" />

        {/* Dialog Header */}
        <div className="border-b border-zinc-800 pb-3 mb-4 space-y-1">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span>SPECIMEN INGESTION // MANUAL ENTRY</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-sans">
            Log New Inventory Unit
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Catalog newly acquired stock with automated margin & STR% turnover analysis.
          </p>
        </div>

        <div className="space-y-4">
          {/* Specimen Product Name */}
          <div className="space-y-1.5">
            <Label htmlFor="product" className="font-mono text-[11px] uppercase font-bold text-zinc-300">
              Item / Specimen Name <span className="text-[#F97316]">*</span>
            </Label>
            <Input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Bosch ME7.2 Engine Control Unit 0-261-207-106"
              className="h-9 bg-[#090A0F] border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-[#F97316]"
              required
            />
          </div>

          {/* Price & Cost Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="font-mono text-[11px] uppercase font-bold text-zinc-300">
                Target Resale ($ AUD) <span className="text-[#F97316]">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">$</span>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-9 pl-6 bg-[#090A0F] border border-zinc-800 text-xs font-mono text-zinc-100 font-bold placeholder:text-zinc-600 focus:border-[#F97316]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cost" className="font-mono text-[11px] uppercase font-bold text-zinc-300">
                Acquisition Cost ($ AUD)
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">$</span>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="h-9 pl-6 bg-[#090A0F] border border-zinc-800 text-xs font-mono text-zinc-100 font-bold placeholder:text-zinc-600 focus:border-[#F97316]"
                />
              </div>
            </div>
          </div>

          {/* Live Telemetry & Margin Readout Box */}
          {telemetry && (
            <div className="p-3 rounded-lg bg-[#090A0F] border border-zinc-800/90 font-mono text-xs space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase pb-1 border-b border-zinc-800/60">
                <span>ESTIMATED UNIT TELEMETRY</span>
                <span>STR: {telemetry.velocity.sellThroughRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Net Take-Home:</span>
                <span
                  className={`font-black tabular-nums ${
                    telemetry.netProfit > 0
                      ? "text-[#22C55E]"
                      : telemetry.netProfit < 0
                      ? "text-[#DC2626]"
                      : "text-zinc-400"
                  }`}
                >
                  {telemetry.netProfit > 0 ? `+${fmtMoney(telemetry.netProfit)}` : fmtMoney(telemetry.netProfit)}
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">({telemetry.roi}% ROI)</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Fees & Parcel: -${(telemetry.ebayFee + telemetry.estShipping).toFixed(2)}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    telemetry.isFastFlip
                      ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30"
                      : telemetry.isTrap
                      ? "bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  {telemetry.velocity.estDaysToSell} turn
                </span>
              </div>
            </div>
          )}

          {/* Field Notes / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="font-mono text-[11px] uppercase font-bold text-zinc-300">
              Field Notes / Part Specifics
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Tested working pull, clean connectors, matches OEM part numbers"
              rows={3}
              className="bg-[#090A0F] border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-[#F97316]"
            />
          </div>

          {/* Specimen Photo Upload */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[11px] uppercase font-bold text-zinc-300">
              Specimen Photo Attachment
            </Label>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border border-dashed p-4 text-center transition-colors bg-[#090A0F] ${
                isDragActive
                  ? "border-[#F97316] bg-[#161922]"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Specimen preview"
                    className="mx-auto max-h-32 rounded object-contain border border-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setImagePreview("");
                    }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Camera className="h-5 w-5 text-zinc-500 mx-auto" />
                  <p className="text-xs font-mono text-zinc-400">
                    Drag & drop specimen image, or tap to browse
                  </p>
                  <p className="text-[10px] font-mono text-zinc-600">Supports JPG, PNG, WEBP</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary h-9 px-3.5 text-xs font-mono"
            >
              <span>CANCEL</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={aiLoading || saving || uploading}
              className="btn-secondary h-9 px-3.5 text-xs font-mono gap-1.5 text-zinc-200"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 text-[#F97316]" />
                  <span>ANALYZING...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-[#F97316]" />
                  <span>AI AUTO-FILL</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={saveListing}
              disabled={saving || uploading || aiLoading}
              className="btn-primary h-9 px-4 text-xs font-mono gap-1.5"
            >
              {saving || uploading ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                  <span>SAVING...</span>
                </>
              ) : (
                <span>+ COMMIT TO INVENTORY</span>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
