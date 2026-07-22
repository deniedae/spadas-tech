import { supabase } from "../supabase";

export async function getCachedBarcode(barcode: string) {
  const { data, error } = await supabase
    .from("barcode_cache")
    .select("*")
    .eq("barcode", barcode)
    .single();

  if (error) return null;

  return data;
}

export async function saveBarcode(product: any) {
  await supabase.from("barcode_cache").upsert({
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    image: product.image,
    description: product.description,
    suggested_price: product.suggestedPrice,
    source: product.source,
  });
}