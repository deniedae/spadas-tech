import { BarcodeProduct } from "./types";

export async function lookupOpenLibrary(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`
    );

    interface OpenLibraryBook {
      title?: string;
      authors?: Array<{ name?: string }>;
      cover?: {
        large?: string;
        medium?: string;
        small?: string;
      };
    }

    const json = (await res.json()) as Record<string, OpenLibraryBook>;

    const book = json[`ISBN:${barcode}`];

    if (!book) return null;

    return {
      barcode,
      name: book.title ?? "Unknown title",
      brand: book.authors?.map((author) => author.name ?? "").filter(Boolean).join(", ") || "",
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