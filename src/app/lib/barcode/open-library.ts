import { BarcodeProduct } from "./types";

export async function lookupOpenLibrary(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`
    );

    const json = await res.json();

    const book = json[`ISBN:${barcode}`];

    if (!book) return null;

    return {
      barcode,
      name: book.title,
      brand: book.authors?.map((a: any) => a.name).join(", ") || "",
      category: "Books",
      image:
        book.cover?.large ||
        book.cover?.medium ||
        book.cover?.small ||
        "",
      description: "",
      suggestedPrice: 0,
      confidence: "Unknown",
      source: "Open Library",
    };
  } catch (error) {
    console.error("Open Library lookup failed:", error);
    return null;
  }
}