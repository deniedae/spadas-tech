import { supabase } from "@/app/lib/supabase";
import { saveListingToFirestore } from "@/app/lib/firestore-listings";

export interface ListingInput {
  userId: string;
  product: string;
  description?: string;
  price?: number;
  cost?: number;
  purchase_price?: number;
  sold_price?: number;
  shipping_cost?: number;
  fees?: number;
  image?: string;
  status?: "Draft" | "Active" | "Sold";
}

export async function createListing(data: ListingInput) {
  // 1. Primary Store: Supabase
  const { data: result, error } = await supabase
    .from("listings")
    .insert([
      {
        user_id: data.userId,
        title: data.product,
        product: data.product,
        description: data.description ?? "",
        price: data.price ?? 0,
        cost: data.cost ?? 0,
        purchase_price: data.purchase_price ?? 0,
        sold_price: data.sold_price ?? 0,
        shipping_cost: data.shipping_cost ?? 0,
        fees: data.fees ?? 0,
        image_url: data.image ?? "",
        status: data.status ?? "Active",
      },
    ])
    .select()
    .single();

  // 2. Dual-Store Sync: Cloud Firestore
  try {
    void saveListingToFirestore(data.userId, {
      product: data.product,
      description: data.description ?? "",
      price: data.price ?? 0,
      cost: data.cost ?? 0,
      image: data.image ?? "",
      status: data.status ?? "Active",
    });
  } catch (fsErr) {
    console.warn("[Firestore Dual-Store] Non-blocking sync notice:", fsErr);
  }

  return { data: result, error };
}
