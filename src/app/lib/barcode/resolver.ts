import { getCachedBarcode, saveBarcode } from "./cache";
import { lookupGoogleBooks } from "./google-books";
import { lookupOpenLibrary } from "./open-library";
import { lookupOpenFoodFacts } from "./open-food-facts";
import { estimatePrice } from "./pricing";
import { normalizeProduct } from "./ai";

export async function resolveBarcode(barcode: string) {
  // 1. Cache
  const cached = await getCachedBarcode(barcode);

  if (cached) {
    return cached;
  }

  let product = null;

  // Check both book providers
  const googleBook = await lookupGoogleBooks(barcode);
  const openBook = await lookupOpenLibrary(barcode);

  // Merge Google Books + Open Library
  if (googleBook || openBook) {
    product = {
      ...(openBook || {}),
      ...(googleBook || {}),

      // Use Open Library only when Google is missing data
      image: googleBook?.image || openBook?.image,
      description: googleBook?.description || openBook?.description,
      brand: googleBook?.brand || openBook?.brand,

      source:
        googleBook && openBook
          ? "Google Books + Open Library"
          : googleBook
          ? "Google Books"
          : "Open Library",
    };
  }

  // Food
  if (!product) {
    product = await lookupOpenFoodFacts(barcode);
  }

  if (!product) {
    return null;
  }

  // Price
  const pricing = await estimatePrice({
    name: product.name ?? "",
    category: product.category ?? "",
  });

  // AI normalization
  const ai = await normalizeProduct({
    name: product.name ?? "",
    category: product.category,
    brand: product.brand,
  });

  const finalProduct = {
    ...product,
    ...ai,
    ...pricing,
  };

  await saveBarcode(finalProduct);

  return finalProduct;
}