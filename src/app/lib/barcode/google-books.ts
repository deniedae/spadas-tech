import { BarcodeProduct } from "./types";

export async function lookupGoogleBooks(
  barcode: string
): Promise<BarcodeProduct | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}&key=${apiKey}`
  );

  const json = await res.json();

  if (!json.items?.length) return null;

  const book = json.items[0].volumeInfo;

  return 
    barcode,
    name: book.title,
    brand: book.authors?.join(", "),
    category: "Books",
    image: book.imageLinks?.thumbnail,
    description: book.description,
    source: "Google Books",
  };
}