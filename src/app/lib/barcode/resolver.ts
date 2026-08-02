import { getCachedBarcode, saveBarcode } from "./cache";
import { lookupGoogleBooks } from "./google-books";
import { lookupOpenLibrary } from "./open-library";
import { lookupOpenFoodFacts } from "./open-food-facts";
import { estimatePrice } from "./pricing";
import { normalizeProduct } from "./ai";
import { BarcodeProduct } from "./types";

async function lookupBarcodeLookup(barcode: string): Promise<BarcodeProduct | null> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;

  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(barcode)}&formatted=y&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Barcode Lookup rate limit hit for:", barcode);
      }
      return null;
    }

    const data = await response.json();
    const product = data?.products?.[0];

    if (!product) return null;

    return {
      barcode: product.barcode_number || barcode,
      name: product.title || product.product_name || "Unknown product",
      brand: product.brand || product.manufacturer || "",
      category: product.category || "General",
      image: product.images?.[0] || product.image || "",
      description: product.description || "",
      suggestedPrice: Number(product.stores?.[0]?.price || product.price || 0) || 0,
      source: "Barcode Lookup",
    };
  } catch (error) {
    console.warn("Barcode Lookup failed:", error);
    return null;
  }
}

export async function resolveBarcode(barcode: string) {
  const cached = await getCachedBarcode(barcode);

  if (cached) {
    return cached;
  }

  let product: BarcodeProduct | null = await lookupBarcodeLookup(barcode);

  if (!product) {
    const googleBook = await lookupGoogleBooks(barcode);
    const openBook = await lookupOpenLibrary(barcode);

    if (googleBook || openBook) {
      const mergedBookProduct: BarcodeProduct = {
        barcode: barcode,
        name: googleBook?.name || openBook?.name || "Unknown product",
        brand: googleBook?.brand || openBook?.brand || "",
        category: googleBook?.category || openBook?.category || "Books",
        image: googleBook?.image || openBook?.image || "",
        description: googleBook?.description || openBook?.description || "",
        suggestedPrice: googleBook?.suggestedPrice || openBook?.suggestedPrice || 0,
        source:
          googleBook && openBook
            ? "Google Books + Open Library"
            : googleBook
            ? "Google Books"
            : "Open Library",
      };

      product = mergedBookProduct;
    }
  }

  if (!product) {
    product = await lookupOpenFoodFacts(barcode);
  }

  if (!product) {
    return null;
  }

  const normalizedProduct: BarcodeProduct = {
    barcode: product.barcode ?? barcode,
    name: product.name ?? "Unknown product",
    brand: product.brand,
    category: product.category ?? "General",
    image: product.image,
    description: product.description,
    source: product.source ?? "Unknown",
  };

  const pricing = await estimatePrice({
    name: normalizedProduct.name,
    category: normalizedProduct.category,
  });

  const ai = await normalizeProduct({
    name: normalizedProduct.name,
    category: normalizedProduct.category,
    brand: normalizedProduct.brand,
  });

  const finalProduct: BarcodeProduct = {
    barcode: normalizedProduct.barcode,
    name: normalizedProduct.name,
    brand: ai.brand || normalizedProduct.brand,
    category: ai.category || normalizedProduct.category,
    image: normalizedProduct.image,
    description: normalizedProduct.description,
    suggestedPrice: pricing.suggestedPrice,
    confidence: pricing.confidence,
    source: normalizedProduct.source,
  };

  await saveBarcode({
    barcode: finalProduct.barcode,
    name: finalProduct.name,
    brand: finalProduct.brand,
    category: finalProduct.category,
    image: finalProduct.image,
    description: finalProduct.description,
    suggestedPrice: finalProduct.suggestedPrice,
    source: finalProduct.source,
  });

  return finalProduct;
}