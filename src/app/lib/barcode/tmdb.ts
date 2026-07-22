import { BarcodeProduct } from "./types";

export async function lookupTMDB(
  barcode: string
): Promise<BarcodeProduct | null> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return null;

  // TODO:
  // DVD barcodes are not searchable directly in TMDb.
  // We'll first convert the barcode into a movie title
  // using another metadata source, then search TMDb.

  return null;
}