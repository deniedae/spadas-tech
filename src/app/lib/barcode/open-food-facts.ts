import { BarcodeProduct } from "./types";

export async function lookupOpenFoodFacts(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1) return null;

    const product = data.product;
    if (!product) return null;

    const brand = (product.brands || product.brand_owner || "").trim();
    const quantity = (product.quantity || product.serving_size || "").trim();

    let rawName =
      product.product_name ||
      product.product_name_en ||
      product.abbreviated_product_name ||
      product.generic_name ||
      "";

    if (!rawName && brand) {
      rawName = `${brand} Grocery Item`;
    }

    let name = String(rawName || "").trim();
    if (!name) return null;

    // Append quantity/volume if not already included (e.g. "Devondale Moo Chocolate Flavoured Milk 200ml")
    if (quantity && !name.toLowerCase().includes(quantity.toLowerCase())) {
      name = `${name} ${quantity}`;
    }

    return {
      barcode,
      name,
      brand: brand || "",
      category: "Groceries & Beverages",
      image: product.image_front_url || product.image_url || "",
      description: (product.ingredients_text || "").trim(),
      suggestedPrice: 0,
      source: "open_food_facts",
    };
  } catch (err) {
    console.warn("[OpenFoodFacts] Barcode lookup failed:", err);
    return null;
  }
}