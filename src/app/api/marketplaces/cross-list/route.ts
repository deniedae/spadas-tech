import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";

export interface CrossListPlatformPackage {
  title: string;
  price: number;
  description: string;
  hashtags?: string;
  characterCount: number;
  maxCharacters: number;
  category: string;
  tags?: string[];
  tips?: string[];
}

export interface CrossListResponse {
  success: boolean;
  productName: string;
  brand: string;
  basePrice: number;
  platforms: {
    ebay: CrossListPlatformPackage;
    depop: CrossListPlatformPackage;
    facebook_marketplace: CrossListPlatformPackage;
    poshmark: CrossListPlatformPackage;
    mercari: CrossListPlatformPackage;
  };
  savedToInventory?: boolean;
}

function sanitizeText(str: string): string {
  if (!str) return "";
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
}

function truncateClean(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const truncated = str.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxLen * 0.7 ? truncated.slice(0, lastSpace) : truncated;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productName, brand, price, condition, category, description, size, imageUrls } = body;

    if (!productName || typeof productName !== "string") {
      return NextResponse.json({ error: "productName is required" }, { status: 400 });
    }

    const cleanProductName = sanitizeText(productName);
    const itemBrand = sanitizeText(brand || "Authentic");
    const itemPrice = Math.max(1, Number(price || 25));
    const itemCond = sanitizeText(condition || "Used - Good");
    const itemCat = sanitizeText(category || "Resale Item");
    const itemSize = size ? `Size ${sanitizeText(size)}` : "";

    // 1. eBay Package (Max 80 Chars SEO Structured)
    const rawEbay = `${itemBrand} ${cleanProductName} ${itemSize} ${itemCond}`.replace(/\s+/g, " ").trim();
    const ebayTitle = truncateClean(rawEbay, 80);
    const ebayDescription =
      description ||
      `Authentic ${itemBrand} ${cleanProductName}.\n\n` +
      `• Brand: ${itemBrand}\n` +
      `• Item: ${cleanProductName}\n` +
      (itemSize ? `• Size: ${itemSize}\n` : "") +
      `• Condition: ${itemCond}\n\n` +
      `Inspected and packaged with care. Fast dispatch with tracking across Australia & worldwide. Please review all photos.`;

    // 2. Depop Package (Max 128 Chars Lowercase Aesthetic + Hashtags)
    const rawDepop = `${cleanProductName.toLowerCase()} by ${itemBrand.toLowerCase()} ${itemSize}`.trim();
    const depopTitle = truncateClean(rawDepop, 128);
    const depopTags = [
      `#${itemBrand.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      `#${itemCat.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      "#vintage",
      "#thrift",
      "#streetwear",
      "#depopseller",
    ].filter(Boolean);
    const depopHashtags = depopTags.join(" ");
    const depopDescription =
      `${cleanProductName}\n` +
      `brand: ${itemBrand}\n` +
      `condition: ${itemCond}\n` +
      (itemSize ? `size: ${itemSize}\n` : "") +
      `\ninstant buy is on! tracked postage 📦✨\n\n${depopHashtags}`;

    // 3. Facebook Marketplace (Max 100 Chars Local Friendly)
    const rawFb = `${itemBrand} ${cleanProductName} - ${itemCond}`;
    const fbTitle = truncateClean(rawFb, 100);
    const fbDescription =
      `Authentic ${cleanProductName} in ${itemCond} condition.\n\n` +
      `Price: $${itemPrice} AUD.\n` +
      `• Pick-up available.\n` +
      `• Australia-wide tracked shipping available for flat rate.\n` +
      `Feel free to message with any questions!`;

    // 4. Poshmark Package (Max 50 Chars Direct Format)
    const rawPosh = `${itemBrand} ${cleanProductName} ${itemSize}`.replace(/\s+/g, " ").trim();
    const poshTitle = truncateClean(rawPosh, 50);
    const poshDescription =
      `Gorgeous ${itemBrand} ${cleanProductName} in ${itemCond}.\n\n` +
      (itemSize ? `Size: ${itemSize}\n\n` : "") +
      `Smoke-free home. Bundle & save on shipping! Fast shipper & 5-star seller.`;

    // 5. Mercari Package (Max 80 Chars)
    const rawMercari = `${itemBrand} ${cleanProductName} - ${itemCond}`.replace(/\s+/g, " ").trim();
    const mercariTitle = truncateClean(rawMercari, 80);
    const mercariDescription =
      `${itemBrand} ${cleanProductName}.\n` +
      `Condition: ${itemCond}.\n` +
      `Ships fast with tracking. Check photos for exact details!`;

    const platforms = {
      ebay: {
        title: ebayTitle,
        price: itemPrice,
        description: ebayDescription,
        characterCount: ebayTitle.length,
        maxCharacters: 80,
        category: itemCat,
        tips: ["Never use ALL CAPS", "Put exact brand and model in first 35 chars"],
      },
      depop: {
        title: depopTitle,
        price: itemPrice,
        description: depopDescription,
        hashtags: depopHashtags,
        characterCount: depopTitle.length,
        maxCharacters: 128,
        category: itemCat,
        tags: depopTags,
        tips: ["Tag 3 relevant aesthetic keywords", "Mention instant buy enabled"],
      },
      facebook_marketplace: {
        title: fbTitle,
        price: itemPrice,
        description: fbDescription,
        characterCount: fbTitle.length,
        maxCharacters: 100,
        category: itemCat,
        tips: ["State pickup suburb or postal availability clearly"],
      },
      poshmark: {
        title: poshTitle,
        price: itemPrice,
        description: poshDescription,
        characterCount: poshTitle.length,
        maxCharacters: 50,
        category: itemCat,
        tips: ["Poshmark titles have strict 50 character limit", "Encourage bundle purchases"],
      },
      mercari: {
        title: mercariTitle,
        price: itemPrice,
        description: mercariDescription,
        characterCount: mercariTitle.length,
        maxCharacters: 80,
        category: itemCat,
        tips: ["Accurate condition rating prevents return requests"],
      },
    };

    // Attempt to persist cross-list queue to Supabase if user is logged in
    let savedToInventory = false;
    try {
      const supabase = await createClient();
      let { data: { user } } = await supabase.auth.getUser();

      const authHeader = req.headers.get("authorization");
      if (!user && authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const { data } = await supabase.auth.getUser(token);
        user = data?.user || null;
      }

      if (user) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const dbClient =
          supabaseUrl && serviceRoleKey
            ? createAdminClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
              })
            : supabase;

        await dbClient.from("user_cross_listings").insert({
          user_id: user.id,
          product_name: cleanProductName,
          brand: itemBrand,
          price: itemPrice,
          category: itemCat,
          platforms_json: platforms,
          image_urls: imageUrls || [],
          created_at: new Date().toISOString(),
        });

        savedToInventory = true;
      }
    } catch {
      // Non-blocking: continue serving response
    }

    return NextResponse.json({
      success: true,
      productName: cleanProductName,
      brand: itemBrand,
      basePrice: itemPrice,
      platforms,
      savedToInventory,
    });
  } catch (err: any) {
    console.error("[cross-list] Pipeline error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
