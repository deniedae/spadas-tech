import { getCachedBarcode, saveBarcode } from "./cache";
import { lookupGoogleBooks } from "./google-books";
import { lookupOpenFoodFacts } from "./open-food-facts";
import { estimatePrice } from "./pricing";
import { normalizeProduct } from "./ai";
import { lookupOpenLibrary } from "./open-library";
export async function resolveBarcode(barcode: string) {
  // 1. Cache
  const cached = await getCachedBarcode(barcode);

  if (cached) {
    return cached;
  }

  let product = null;

// Books (Google Books)
product = await lookupGoogleBooks(barcode);

// Books (Open Library fallback)
if (!product) {
  product = await lookupOpenLibrary(barcode);
}

// Food
if (!product) {
  product = await lookupOpenFoodFacts(barcode);
}
  if (!product) {
    return null;
  }

  // 4. Price
  const pricing = await estimatePrice(product);

 const ai = await normalizeProduct(product);

const finalProduct = {
  ...product,
  ...ai,
  ...pricing,
};

  await saveBarcode(finalProduct);

  return finalProduct;
}