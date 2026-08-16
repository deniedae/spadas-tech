import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productName, brand, price, condition, category, description } = body;

    if (!productName) {
      return NextResponse.json({ error: "productName is required" }, { status: 400 });
    }

    const itemBrand = brand || "Authentic";
    const itemPrice = Number(price || 25);
    const itemCond = condition || "Used - Good";
    const itemCat = category || "Resale Item";

    // 1. eBay Copy Package (Max 80 Char Title, SEO Optimized)
    const ebayTitle = `${itemBrand} ${productName}`.slice(0, 80);
    const ebayDescription =
      description ||
      `Authentic ${itemBrand} ${productName}.\nCondition: ${itemCond}.\nInspected and tested. Fast dispatch from Australia with tracking.`;

    // 2. Depop Copy Package (Aesthetic Lowercase Title, Hashtags)
    const depopTitle = `${productName.toLowerCase()} #${itemBrand.toLowerCase().replace(/\s+/g, "")} #vintage`;
    const depopHashtags = [
      `#${itemBrand.toLowerCase().replace(/\s+/g, "")}`,
      `#${itemCat.toLowerCase().replace(/\s+/g, "")}`,
      "#vintage",
      "#y2k",
      "#streetwear",
      "#thrift",
    ].join(" ");
    const depopDescription = `${productName}\nBrand: ${itemBrand}\nCondition: ${itemCond}\n\n${depopHashtags}`;

    // 3. Facebook Marketplace Package (Local Pickup Friendly)
    const fbTitle = `${itemBrand} ${productName} - ${itemCond}`;
    const fbDescription = `Authentic ${productName}.\nCondition: ${itemCond}.\n\nPrice: $${itemPrice} AUD.\nPick up available or fast dispatch with tracking across Australia.`;

    return NextResponse.json({
      success: true,
      productName,
      price: itemPrice,
      platforms: {
        ebay: {
          title: ebayTitle,
          price: itemPrice,
          description: ebayDescription,
        },
        depop: {
          title: depopTitle,
          price: itemPrice,
          description: depopDescription,
          hashtags: depopHashtags,
        },
        facebook_marketplace: {
          title: fbTitle,
          price: itemPrice,
          description: fbDescription,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
