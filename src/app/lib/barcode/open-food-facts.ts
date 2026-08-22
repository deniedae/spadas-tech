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
  if (!product) return null;

  const rawName =
    product.product_name ||
    product.product_name_en ||
    product.abbreviated_product_name ||
    product.generic_name ||
    (product.brands ? `${product.brands} Product` : "");

  const name = String(rawName || "").trim();

  if (!name) return null;

  return {
    barcode,
    name,
    brand: (product.brands || "").trim(),
    category: (product.categories || "Food").trim(),
    image: product.image_front_url || product.image_url || "",
    description: (product.ingredients_text || "").trim(),
    suggestedPrice: 0,
    source: "open_food_facts",
  };
}