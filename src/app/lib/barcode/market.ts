import { supabase } from "../supabase";

export async function getMarketPrice(barcode: string) {
  const { data } = await supabase
    .from("product_prices")
    .select("*")
    .eq("barcode", barcode)
    .single();

  if (!data) return null;

  return data;
}

export async function saveMarketPrice(price: any) {
  await supabase.from("product_prices").upsert(price);
}