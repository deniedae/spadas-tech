import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { publishToEbayInventory, refreshEbayToken } from "@/app/lib/marketplaces/ebay";

export async function POST(req: NextRequest) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to publish to eBay." }, { status: 401 });
    }

    const body = await req.json();
    const { listing, product, description, price, condition, brand, imageUrls } = body;

    const targetProduct = product || listing?.product || "AI Scanned Item";
    const targetDesc = description || listing?.seo_description || listing?.detailed_description || "";
    const targetPrice = Number(price || listing?.suggested_price_max || listing?.suggested_price_min || 25);
    const targetCondition = condition || listing?.analysis?.condition || "Used";
    const targetBrand = brand || listing?.analysis?.brand || "Unbranded";
    const targetImages = imageUrls || listing?.imageUrls || [];

    // Fetch user's eBay tokens from Supabase
    const { data: tokenRow } = await supabase
      .from("user_marketplace_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "ebay")
      .single();

    let accessToken = tokenRow?.access_token;
    let refreshToken = tokenRow?.refresh_token || process.env.EBAY_USER_REFRESH_TOKEN;

    if (!accessToken && !refreshToken) {
      // Demo Mode / Unlinked Fallback for Testing
      if (process.env.NODE_ENV === "development" || !process.env.EBAY_CLIENT_ID) {
        return NextResponse.json({
          success: true,
          isDemoMode: true,
          sku: `SPADAS-DEMO-${Date.now()}`,
          message: "Published to eBay Demo Sandbox (Connect real eBay account in Settings for live seller Hub sync).",
          listingUrl: "https://sandbox.ebay.com/itm/SPADAS-DEMO-ITEM",
        });
      }

      return NextResponse.json(
        { error: "Please connect your eBay seller account in Settings first." },
        { status: 400 }
      );
    }

    // Check if Access Token is expired and refresh if necessary
    const isExpired = tokenRow?.expires_at ? new Date(tokenRow.expires_at).getTime() < Date.now() : true;

    if (isExpired && refreshToken) {
      try {
        const refreshed = await refreshEbayToken(refreshToken);
        accessToken = refreshed.access_token;

        await supabase.from("user_marketplace_tokens").update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id).eq("platform", "ebay");
      } catch (refreshErr) {
        console.error("Token refresh failed:", refreshErr);
        return NextResponse.json(
          { error: "eBay connection expired. Please reconnect your eBay account in Settings." },
          { status: 401 }
        );
      }
    }

    const result = await publishToEbayInventory(accessToken, {
      product: targetProduct,
      description: targetDesc,
      price: targetPrice,
      condition: targetCondition,
      brand: targetBrand,
      imageUrls: targetImages,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("eBay Publish Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to publish listing to eBay." },
      { status: 500 }
    );
  }
}
