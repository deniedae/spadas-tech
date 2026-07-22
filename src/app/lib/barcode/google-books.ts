import { BarcodeProduct } from "./types";

export async function lookupGoogleBooks(
  barcode: string
): Promise<BarcodeProduct | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}`
  );

  if (!res.ok) return null;

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const book = data.items[0].volumeInfo;

  return {
    barcode,
    name: book.title ?? "",
    brand: book.publisher ?? "Unknown",
    category: "Books",
    image: book.imageLinks?.thumbnail ?? "",
    description: book.description ?? "",
    suggestedPrice: 0,
    source: "google_books",
  };
}