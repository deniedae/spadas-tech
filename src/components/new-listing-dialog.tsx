"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { Loader2, X } from "lucide-react";

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
      ? `Brand: ${initialData.brand}\n\nCategory: ${initialData.category}`
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

      const response = await fetch("/api/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: [payloadUrl] }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "AI generation failed.");

      setProduct(result.analysis?.product_name ?? product);
      setDescription(result.detailed_description ?? result.seo_description ?? "");
      if (result.suggested_price_min) setPrice(String(result.suggested_price_min));

      toast.success("AI listing generated successfully!");
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
      toast.error("Please enter a valid price.");
      return;
    }
    if (isNaN(Number(cost)) || Number(cost) < 0) {
      toast.error("Please enter a valid cost.");
      return;
    }
    setSaving(true);

    let imageUrl = initialData?.image ?? "";
    if (!imageUrl && imagePreview && imagePreview.startsWith("http")) {
      imageUrl = imagePreview;
    }

    if (image) {
      setUploading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Please log in.");
        setUploading(false);
        setSaving(false);
        return;
      }
      const filename = `${user.id}-${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabase.storage.from("listing-images").upload(filename, image);
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Please log in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("listings").insert([{
      user_id: user.id,
      title: product,
      product,
      price: Number(price),
      cost: Number(cost),
      description,
      image_url: imageUrl,
      status: "Active",
    }]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Listing created!");
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
        <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          + New Listing
        </Button>
      )}

      <DialogContent className="sm:max-w-3xl relative">



        <div className="mt-4 space-y-6">
          <div>
            <Label htmlFor="product">Product Name</Label>
            <Input id="product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter detailed description"
              rows={4}
            />
          </div>

          <div>
            <Label>Upload Image</Label>
            <div
              {...getRootProps()}
              className={`mt-2 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center ${
                isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
              }`}
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                <img src={imagePreview} alt="Listing preview" className="mx-auto max-h-48 rounded-lg object-contain" />
              ) : (
                <p className="text-muted-foreground">Drag & drop or click to upload image</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              onClick={handleGenerateAI}
              disabled={aiLoading || saving || uploading}
              variant="outline"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generating AI...
                </>
              ) : (
                "Generate AI Listing"
              )}
            </Button>

            <Button
              onClick={saveListing}
              disabled={saving || uploading || aiLoading}
              className="flex items-center gap-2"
            >
              {(saving || uploading) && <Loader2 className="animate-spin h-5 w-5" />}
              {saving ? "Saving..." : "Create Listing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
