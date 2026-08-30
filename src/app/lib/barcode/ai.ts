export interface AIProduct {
  cleanTitle: string;
  category: string;
  brand?: string;
  keywords: string[];
}

const KNOWN_BRANDS = [
  // Streetwear & Sneakers
  "Nike", "Adidas", "Jordan", "Yeezy", "New Balance", "Asics", "Puma", "Reebok", "Vans", "Converse",
  "Supreme", "Stussy", "Bape", "Palace", "Kith", "Fear of God", "Essentials", "Off-White", "Carhartt",
  "The North Face", "Patagonia", "Arc'teryx", "Columbia", "Champion", "Ralph Lauren", "Polo Ralph Lauren",
  "Tommy Hilfiger", "Calvin Klein", "Lacoste", "Hugo Boss", "Levi's", "Wrangler", "Diesel",
  
  // Luxury & High End
  "Gucci", "Louis Vuitton", "Prada", "Balenciaga", "Burberry", "Fendi", "Dior", "Versace", "Saint Laurent",
  "Moncler", "Stone Island", "Givenchy", "Bottega Veneta", "Loewe", "Coach", "Michael Kors", "Kate Spade",
  
  // Tech & Electronics
  "Apple", "Sony", "Samsung", "Bose", "Sennheiser", "JBL", "Logitech", "Razer", "Corsair", "SteelSeries",
  "Canon", "Nikon", "Fujifilm", "Panasonic", "GoPro", "DJI", "Garmin", "Fitbit", "Sonos", "Anker",
  
  // Gaming & Toys
  "Nintendo", "PlayStation", "Xbox", "Pokemon", "Lego", "Funko", "Bandai", "Hasbro", "Mattel", "Hot Wheels",
  "Nerf", "Transformers", "Marvel", "DC Comics", "Star Wars", "Disney", "Sanrio", "Squishmallows",
  
  // Outdoors & Workwear
  "Yeti", "Stanley", "Hydro Flask", "Osprey", "DeWalt", "Milwaukee", "Makita", "Ryobi", "Bosch",
  
  // Media & Publishing
  "Penguin", "HarperCollins", "Scholastic", "Bloomsbury", "Criterion", "Studio Ghibli"
];

export async function normalizeProduct(product: {
  name: string;
  category?: string;
  brand?: string;
}): Promise<AIProduct> {
  const rawTitle = (product.name || "").trim();
  const cleanTitle = rawTitle
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-':&/.]/g, "")
    .trim();

  const lower = cleanTitle.toLowerCase();

  // 1. Detect Brand if missing
  let brand = (product.brand || "").trim();

  if (!brand || brand.toLowerCase() === "unknown" || brand.toLowerCase() === "authentic") {
    for (const b of KNOWN_BRANDS) {
      const regex = new RegExp(`\\b${b.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
      if (regex.test(cleanTitle)) {
        brand = b;
        break;
      }
    }
  }

  // 2. Intelligent Category Normalization
  let category = product.category || "General";

  if (/\b(pokemon|nintendo|switch|ps5|ps4|playstation|xbox|gamecube|sega|game boy|ds|3ds|game)\b/i.test(lower)) {
    category = "Video Games & Consoles";
  } else if (/\b(shoe|sneaker|dunk|jordan|air max|boost|slide|boot|cleat|runner)\b/i.test(lower)) {
    category = "Footwear & Sneakers";
  } else if (/\b(hoodie|jacket|tee|shirt|sweater|pants|jeans|fleece|coat|crewneck|vest)\b/i.test(lower)) {
    category = "Clothing & Streetwear";
  } else if (/\b(headphone|earbud|speaker|camera|lens|keyboard|mouse|monitor|drone|gopro|console)\b/i.test(lower)) {
    category = "Consumer Electronics";
  } else if (/\b(lego|funko|pop|figure|card|booster|pack|plush|hasbro|diecast)\b/i.test(lower)) {
    category = "Toys & Collectibles";
  } else if (/\b(book|novel|hardcover|paperback|guide|textbook|author|isbn|edition)\b/i.test(lower)) {
    category = "Books";
  } else if (/\b(dvd|blu-ray|vhs|4k uhd|movie|disc|season)\b/i.test(lower)) {
    category = "Media & Movies";
  }

  const keywords = lower
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["the", "and", "with", "for", "item"].includes(word));

  return {
    cleanTitle,
    category,
    brand: brand || undefined,
    keywords,
  };
}