import { supabase } from "@/app/lib/supabase";

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

  return { data: result, error };
}
