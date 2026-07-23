"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
export default function NewListingDialog({
  
  initialData,
}: {
  initialData?: any;
}) {
    const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [product, setProduct] = useState(

    initialData?.name ?? ""
  );
  const [price, setPrice] = useState(
    initialData?.suggestedPrice?.toString() ?? ""
  );
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState(
    initialData?.brand
      ? `Brand: ${initialData.brand}

Category: ${initialData.category}`
      : ""
  );
  const [image, setImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState(
  initialData?.image ?? ""
);
  const [uploading, setUploading] = useState(false);
  const onDrop = (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    const file = acceptedFiles[0];

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple: false,
  });
  async function generateWithAI() {
    if (!product.trim()) {
    toast.error("Please enter a product name.");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/ai-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI failed.");
      }

      setDescription(data.description || "");
      setPrice(data.price?.toString() || "");
    } catch (err) {
      console.error(err);
      toast.error("AI couldn't generate a listing.");
    }

    setGenerating(false);
  }
  async function saveListing() {
    setSaving(true);
    // Validation
    if (!product.trim()) {
      toast.error("Please enter a product name.");
      setSaving(false);
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Please enter a valid price.");
      setSaving(false);
      return;
    }

    if (isNaN(Number(cost)) || Number(cost) < 0) {
      toast.error("Please enter a valid cost.");
      setSaving(false);
      return;
    }

    let aiDescription = description;

    // Try AI (don't fail if unavailable)
    try {
      const response = await fetch("/api/ai-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product }),
      });

      if (response.ok) {
        const ai = await response.json();
        aiDescription = ai.result || description;
      }
    } catch {
      console.log("AI unavailable, using manual description.");
    }

    // Get logged in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

  if (authError) {
  toast.error(authError.message);
  setSaving(false);
  return;
}

    if (!user) {
      toast.error("Please log in.");
      return;
    }
   let imageUrl = initialData?.image ?? "";

    if (image) {
      setUploading(true);

      const fileName = `${user.id}-${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, image);

      if (uploadError) {
        toast.error(uploadError.message);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;

      setUploading(false);
    }
    const { error } = await supabase.from("listings").insert([
      {
        user_id: user.id,
        title: product,
        product,
        price: Number(price),
        cost: Number(cost),
        description: aiDescription,
        image_url: imageUrl,
        status: "Active",
      },
    ]);

   if (error) {
  console.error(error);
  toast.error(error.message);
  return;
}

toast.success("✅ Listing created!");

setOpen(false);

setProduct("");
setPrice("");
setCost("");
setDescription("");
setImage(null);
setImagePreview("");

router.refresh();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
  type="button"
  className="bg-blue-600 hover:bg-blue-700"
  onClick={() => setOpen(true)}
>
  + New Listing
</Button>

  <DialogContent className="sm:max-w-3xl">
  <DialogHeader>
    <DialogTitle>
      📦 Create New Listing
    </DialogTitle>

    <p className="mt-2 text-sm text-gray-500">
      Add a new product to your inventory.
    </p>
  </DialogHeader>
<div className="space-y-6">
          <div>
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              placeholder="Nintendo DS Lite"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              placeholder="120"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="40"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <div>
            <div>
              <Label>Image</Label>

              <div
                {...getRootProps()}
                className={`mt-2 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400"
                  }`}
              >
                <input {...getInputProps()} />

                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto h-48 rounded-xl object-contain"
                    />

                    <p className="text-sm text-gray-500">
                      Click or drag another image to replace it
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-semibold">
                      📷 Drag & Drop an Image
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>

            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
<div className="flex gap-3 pt-2">
  <Button
    type="button"
    className="flex-1 bg-slate-100 text-slate-800 hover:bg-slate-200"
    onClick={generateWithAI}
    disabled={generating}
  >
    {generating ? "Generating..." : "✨ Generate AI"}
  </Button>

  <Button
    type="button"
    className="flex-1 bg-blue-600 hover:bg-blue-700"
    onClick={saveListing}
    disabled={saving || uploading}
  >
    {uploading
      ? "Uploading..."
      : saving
      ? "Saving..."
      : "💾 Save Listing"}
  </Button>
</div>
</div>

</DialogContent>

</Dialog>

);
}