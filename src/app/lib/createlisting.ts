import { supabase } from "@/app/lib/supabase";

export async function createListing(data: {
  userId: string;
  product: string;
  description?: string;
  price?: number;
  cost?: number;
  image?: string;
  status?: string;
}) {
  return await supabase
    .from("listings")
    .insert([
      {
        user_id: data.userId,
        title: data.product,
        product: data.product,
        description: data.description ?? "",
        price: data.price ?? 0,
        cost: data.cost ?? 0,
        image_url: data.image ?? "",
        status: data.status ?? "Draft",
      },
    ])
    .select()
    .single();
}