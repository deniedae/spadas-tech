import { BarcodeProduct } from "./types";

export async function lookupOpenFoodFacts(
  barcode: string
): Promise<BarcodeProduct | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  );

  if (!res.ok) return null;

  const data = await res.json();

  if (data.status !== 1) return null;

  const product = data.product;

  return {
    barcode,
    name: product.product_name ?? "",
    brand: product.brands ?? "",
    category: product.categories ?? "Food",
    image: product.image_front_url ?? "",
    description: product.ingredients_text ?? "",
    suggestedPrice: 0,
    source: "open_food_facts",
  };
}