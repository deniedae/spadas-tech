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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewListingDialog() {
  const router = useRouter();

  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
const [uploading, setUploading] = useState(false);

  async function saveListing() {
    // Validation
    if (!product.trim()) {
      alert("Please enter a product name.");
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    if (isNaN(Number(cost)) || Number(cost) < 0) {
      alert("Please enter a valid cost.");
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
      alert(authError.message);
      return;
    }

    if (!user) {
      alert("Please log in.");
      return;
    }
let imageUrl = "";

if (image) {
  setUploading(true);

  const fileName = `${user.id}-${Date.now()}-${image.name}`;

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(fileName, image);

  if (uploadError) {
    alert(uploadError.message);
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
      alert(error.message);
      return;
    }

    alert("Listing created!");

    setProduct("");
    setPrice("");
    setCost("");
    setDescription("");

    router.refresh();
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Button type="button" className="bg-blue-600 hover:bg-blue-700">
          + New Listing
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
  <Label htmlFor="image">Image</Label>

  <Input
    id="image"
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (e.target.files?.length) {
        setImage(e.target.files[0]);
      }
    }}
  />
</div>

<div>
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Describe your item..."
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
</div>

          <Button className="w-full" onClick={saveListing}>
            Save Listing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}