import { getCachedBarcode, saveBarcode } from "./cache";
import { lookupGoogleBooks } from "./google-books";
import { lookupOpenLibrary } from "./open-library";
import { lookupOpenFoodFacts } from "./open-food-facts";
import { lookupUpcItemDb } from "./upcitemdb";
import { estimatePrice } from "./pricing";
import { normalizeProduct } from "./ai";
import { BarcodeProduct } from "./types";
import { createOpenAiClient } from "@/app/lib/config/ai-models";

const SERPAPI_KEY = "837f35e9709091f977c567789f8368b8263b49c1620ed4d47b7aa3825cd0591f";

async function lookupBarcodeLookup(barcode: string): Promise<BarcodeProduct | null> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;

  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(barcode)}&formatted=y&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Barcode Lookup rate limit hit for:", barcode);
      }
      return null;
    }

    const data = await response.json();
    const product = data?.products?.[0];

    if (!product) return null;

    const name = (product.title || product.product_name || "").trim();
    if (!name || name.toLowerCase() === "unknown product" || name.toLowerCase() === "unknown title") {
      return null;
    }

    return {
      barcode: product.barcode_number || barcode,
      name,
      brand: (product.brand || product.manufacturer || "").trim(),
      category: (product.category || "General").trim(),
      image: product.images?.[0] || product.image || "",
      description: (product.description || "").trim(),
      suggestedPrice: Number(product.stores?.[0]?.price || product.price || 0) || 0,
      source: "Barcode Lookup",
    };
  } catch (error) {
    console.warn("Barcode Lookup failed:", error);
    return null;
  }
}

async function lookupEbayByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const serpUrl = `https://serpapi.com/search.json?engine=ebay&ebay_domain=ebay.com.au&_nkw=${encodeURIComponent(barcode)}&api_key=${SERPAPI_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(serpUrl, { signal: controller.signal, next: { revalidate: 3600 } });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const items = data.organic_results || data.sold_results || data.items || [];
    if (!items || items.length === 0) return null;

    const firstItem = items[0];
    const name = (firstItem.title || "").trim();
    if (!name || name.toLowerCase() === "unknown product") return null;

    let price = 0;
    if (firstItem.price?.extracted) {
      price = Number(firstItem.price.extracted);
    } else if (typeof firstItem.price === "number") {
      price = firstItem.price;
    }

    return {
      barcode,
      name,
      brand: "",
      category: "General",
      image: firstItem.thumbnail || firstItem.image || "",
      description: "",
      suggestedPrice: price,
      source: "eBay Search",
    };
  } catch (err) {
    console.warn("eBay search by barcode failed:", err);
    return null;
  }
}

async function lookupOpenAiBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const openai = createOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.0,
      messages: [
        {
          role: "user",
          content: `Identify the exact retail product title, brand, and category associated with the EAN/UPC barcode number "${barcode}". Return ONLY a JSON object: {"name": "Exact Brand + Product Name", "brand": "Brand", "category": "Category"}. If you are not 100% sure of the exact product title for this barcode number, return {"name": null}.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion?.choices?.[0]?.message?.content;
    if (!text) return null;

    const data = JSON.parse(text);
    const name = (data.name || "").trim();

    if (!name || name.toLowerCase() === "null" || name.toLowerCase() === "unknown product") {
      return null;
    }

    return {
      barcode,
      name,
      brand: (data.brand || "").trim(),
      category: (data.category || "General").trim(),
      image: "",
      description: "",
      suggestedPrice: 0,
      source: "AI Identification",
    };
  } catch (err) {
    console.warn("OpenAI barcode identification failed:", err);
    return null;
  }
}

export async function resolveBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode || cleanBarcode.length < 4) return null;

  const cached = await getCachedBarcode(cleanBarcode);

  if (cached && cached.name && cached.name.trim() !== "" && cached.name.toLowerCase() !== "unknown product" && cached.name.toLowerCase() !== "unknown title") {
    return cached;
  }

  // Multi-provider lookup cascade
  let product: BarcodeProduct | null = await lookupBarcodeLookup(cleanBarcode);

  if (!product) {
    product = await lookupUpcItemDb(cleanBarcode);
  }

  if (!product) {
    const googleBook = await lookupGoogleBooks(cleanBarcode);
    const openBook = await lookupOpenLibrary(cleanBarcode);

    if (googleBook || openBook) {
      const bookName = (googleBook?.name || openBook?.name || "").trim();
      if (bookName && bookName.toLowerCase() !== "unknown title" && bookName.toLowerCase() !== "unknown product") {
        product = {
          barcode: cleanBarcode,
          name: bookName,
          brand: googleBook?.brand || openBook?.brand || "",
          category: googleBook?.category || openBook?.category || "Books",
          image: googleBook?.image || openBook?.image || "",
          description: googleBook?.description || openBook?.description || "",
          suggestedPrice: googleBook?.suggestedPrice || openBook?.suggestedPrice || 0,
          source:
            googleBook && openBook
              ? "Google Books + Open Library"
              : googleBook
              ? "Google Books"
              : "Open Library",
        };
      }
    }
  }

  if (!product) {
    product = await lookupOpenFoodFacts(cleanBarcode);
  }

  if (!product) {
    product = await lookupEbayByBarcode(cleanBarcode);
  }

  if (!product) {
    product = await lookupOpenAiBarcode(cleanBarcode);
  }

  if (!product) {
    return null;
  }

  const productName = (product.name || "").trim();
  if (!productName || productName.toLowerCase() === "unknown product" || productName.toLowerCase() === "unknown title") {
    return null;
  }

  const ai = await normalizeProduct({
    name: productName,
    category: product.category,
    brand: product.brand,
  });

  const normalizedProduct: BarcodeProduct = {
    barcode: product.barcode ?? cleanBarcode,
    name: ai.cleanTitle || productName,
    brand: ai.brand || product.brand || "",
    category: ai.category || product.category || "General",
    image: product.image || "",
    description: product.description || "",
    source: product.source ?? "Unknown",
  };

  const pricing = await estimatePrice({
    name: normalizedProduct.name,
    category: normalizedProduct.category,
    brand: normalizedProduct.brand,
  });

  const finalPrice =
    product.suggestedPrice && product.suggestedPrice > 2
      ? product.suggestedPrice
      : pricing.suggestedPrice;

  const finalProduct: BarcodeProduct = {
    barcode: normalizedProduct.barcode,
    name: normalizedProduct.name,
    brand: normalizedProduct.brand || "Authentic",
    category: normalizedProduct.category,
    image: normalizedProduct.image,
    description: normalizedProduct.description,
    suggestedPrice: Math.round(finalPrice * 100) / 100,
    confidence: pricing.confidence,
    source: pricing.source || normalizedProduct.source,
  };

  await saveBarcode({
    barcode: finalProduct.barcode,
    name: finalProduct.name,
    brand: finalProduct.brand,
    category: finalProduct.category,
    image: finalProduct.image,
    description: finalProduct.description,
    suggestedPrice: finalProduct.suggestedPrice,
    source: finalProduct.source,
  });

  return finalProduct;
}