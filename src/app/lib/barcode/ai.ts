export interface AIProduct {
  cleanTitle: string;
  category: string;
  brand?: string;
  keywords: string[];
}

export async function normalizeProduct(product: {
  name: string;
  category?: string;
  brand?: string;
}) : Promise<AIProduct> {

  const cleanTitle = product.name
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-':]/g, "")
    .trim();

  const lower = cleanTitle.toLowerCase();

  let category = product.category || "General";

  if (lower.includes("pokemon")) category = "Games";
  if (lower.includes("xbox")) category = "Games";
  if (lower.includes("playstation")) category = "Games";
  if (lower.includes("dvd")) category = "DVDs";
  if (lower.includes("blu-ray")) category = "DVDs";
  if (lower.includes("cookbook")) category = "Books";

  const keywords = lower
    .split(" ")
    .filter(word => word.length > 2);

  return {
    cleanTitle,
    category,
    brand: product.brand,
    keywords,
  };
}