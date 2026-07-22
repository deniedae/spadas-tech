import { BarcodeProduct } from "./types";

export async function lookupGoogleBooks(
  barcode: string
): Promise<BarcodeProduct | null> {
  console.log("Looking up Google Books:", barcode);

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  console.log("API Key loaded:", !!apiKey);

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}&key=${apiKey}`;

  console.log("Google URL:", url);

  const res = await fetch(url);

  console.log("Google Books status:", res.status);

  if (!res.ok) {
    console.log("Google Books request failed");
    return null;
  }

  const data = await res.json();

  console.log("Google Books response:", JSON.stringify(data, null, 2));

  if (!data.items || data.items.length === 0) {
    console.log("No Google Books results");
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