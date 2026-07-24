"use client";

import { useEffect, useState } from "react";
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

// FIX #4 (TypeScript): replace `any` with a real shape.
interface InitialData {
  name?: string;
  suggestedPrice?: number;
  brand?: string;
  category?: string;
  image?: string;
}

export default function NewListingDialog({
  initialData,
}: {
  initialData?: InitialData;
}) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [product, setProduct] = useState(initialData?.name ?? "");
  const [price, setPrice] = useState(
    initialData?.suggestedPrice?.toString() ?? ""
  );
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState(
    initialData?.brand
      ? `Brand: ${initialData.brand}\n\nCategory: ${initialData.category}`
      : ""
  );
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initialData?.image ?? "");
  const [uploading, setUploading] = useState(false);

  // FIX #3: sync form when initialData changes (e.g. barcode scan reuse).
  useEffect(() => {
    setProduct(initialData?.name ?? "");
    setPrice(initialData?.suggestedPrice?.toString() ?? "");
    setDescription(
      initialData?.brand
        ? `Brand: ${initialData.brand}\n\nCategory: ${initialData.category}`
        : ""
    );
    setImagePreview(initialData?.image ?? "");
    // We intentionally do NOT reset `image` (File) here — only the preview URL.
  }, [initialData]);

  // FIX #5: revoke object URLs to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const onDrop = (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];

    // Revoke the previous blob URL before replacing it.
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
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
    } finally {
      setGenerating(false);
    }
  }

  // FIX #1: removed the duplicate /api/ai-listing call. The description field
  // already holds whatever the user typed or whatever generateWithAI set.
  async function saveListing() {
    setSaving(true);
    try {
      // Validation
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

      // Get logged in user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        toast.error(authError.message);
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
          description, // FIX #1: use the field value directly, no second AI call
          image_url: imageUrl,
          status: "Active",
        },
      ]);

      if (error) {
        console.error(error);
        toast.error(error.message);
        return;
      }

      toast.success("Listing created!");
      setOpen(false);

      // Reset form
      setProduct("");
      setPrice("");
      setCost("");
      setDescription("");
      setImage(null);
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview("");

      router.refresh();
    } finally {
      // FIX #2: saving always resets, even on early return or thrown error.
      setSaving(false);
      setUploading(false);
    }
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
          <DialogTitle>Create New Listing</DialogTitle>
          <p className="mt-2 text-sm text-gray-500">
            Add a new product to your inventory.
          </p>
        </DialogHeader>

        {/* FIX #4: wrap fields in a <form> so Enter submits and a11y tools
            announce a form boundary. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveListing();
          }}
          className="space-y-6"
        >
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

          {/* Image block — grouped cleanly */}
          <div>
            <Label>Image</Label>
            <div
              {...getRootProps()}
              className={`mt-2 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400"
              }`}
            >
              <input {...getInputProps()} />

              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Selected listing image preview"
                    className="mx-auto h-48 max-w-full rounded-xl object-contain"
                  />
                  <p className="text-sm text-gray-500">
                    Click or drag another image to replace it
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    Drag &amp; drop an image
                  </p>
                  <p className="mt-2 text-sm text-gray-500">or click to browse</p>
                </>
              )}
            </div>
          </div>

          {/* Description block — separate, properly ordered */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Mobile: stack buttons; desktop: side by side */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              className="flex-1 bg-slate-100 text-slate-800 hover:bg-slate-200"
              onClick={generateWithAI}
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate with AI"}
            </Button>

            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={saving || uploading}
            >
              {uploading ? "Uploading..." : saving ? "Saving..." : "Save Listing"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
