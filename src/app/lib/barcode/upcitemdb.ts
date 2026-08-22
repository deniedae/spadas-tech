import { BarcodeProduct } from "./types";

export async function lookupUpcItemDb(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    const cleanBarcode = barcode.trim();
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(cleanBarcode)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== "OK" || !data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const name = (item.title || "").trim();

    if (!name) return null;

    return {
      barcode: cleanBarcode,
      name,
      brand: (item.brand || item.publisher || "").trim(),
      category: (item.category || "General").trim(),
      image: item.images?.[0] || "",
      description: (item.description || "").trim(),
      suggestedPrice: Number(item.lowest_recorded_price || item.highest_recorded_price || 0) || 0,
      source: "UPCItemDB",
    };
  } catch (error) {
    console.warn("UPCItemDB lookup failed:", error);
    return null;
  }
}
