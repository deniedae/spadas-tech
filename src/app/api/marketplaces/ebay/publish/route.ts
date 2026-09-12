import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/server";
import { publishToEbayInventory, refreshEbayToken } from "@/app/lib/marketplaces/ebay";
import { convertBase64ToPublicUrls } from "@/app/lib/marketplaces/ebay-storage";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // Support Bearer token authentication from client app
    const authHeader = req.headers.get("authorization");
    if (!user && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data } = await supabase.auth.getUser(token);
      user = data?.user || null;
    }

    if (!user) {
      return NextResponse.json({ error: "Please log in to publish to eBay." }, { status: 401 });
    }

    const body = await req.json();
    const {
      listing,
      product,
      description,
      price,
      currency,
      condition,
      brand,
      category,
      imageUrls,
      sessionId,
      publishMode,
      forceLive,
    } = body;

    const targetProduct = product || listing?.product || "AI Scanned Item";
    const targetDesc = description || listing?.seo_description || listing?.detailed_description || "";
    const targetPrice = Number(price || listing?.suggested_price_max || listing?.suggested_price_min || 25);
    const targetCurrency = currency || listing?.currency || "AUD";
    const targetCondition = condition || listing?.analysis?.condition || "Used";
    const targetBrand = brand || listing?.analysis?.brand || "Unbranded";
    const targetCategory = category || listing?.category || listing?.analysis?.category || "Accessories";
    const targetImages: string[] = Array.isArray(imageUrls || listing?.imageUrls)
      ? (imageUrls || listing?.imageUrls || []).filter((u: unknown) => typeof u === "string")
      : [];

    // Force live publish unless user explicitly requested a draft save
    const isExplicitDraft = publishMode === "draft" && !forceLive;
    const shouldForceLive = !isExplicitDraft;

    // Convert Base64 image payloads to public Supabase Storage URLs so eBay can ingest them
    let publicImages: string[] = targetImages;
    const hasBase64 = targetImages.some(
      (img) => typeof img === "string" && img.startsWith("data:")
    );

    if (hasBase64) {
      try {
        const { urls, allUploaded } = await convertBase64ToPublicUrls(
          targetImages,
          user.id,
          sessionId || listing?.id || `ebay_${Date.now()}`
        );
        publicImages = urls;

        if (!allUploaded) {
          console.error("[eBay Publish] Base64 → Supabase upload failed. Images are not publicly accessible.");
          return NextResponse.json(
            {
              error:
                "Photo upload to storage failed. Please check that the 'listing-images' Supabase Storage bucket exists and is set to public, then try again.",
              image_upload_failed: true,
            },
            { status: 400 }
          );
        }
      } catch (storageErr) {
        console.error("[eBay Publish] convertBase64ToPublicUrls threw:", storageErr);
        return NextResponse.json(
          { error: "Photo upload failed unexpectedly. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Already-public URLs: pass through directly
      publicImages = targetImages.filter(
        (img) => typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))
      );
    }


    // Fetch user's eBay tokens from Supabase using admin client or SSR client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const dbClient =
      supabaseUrl && serviceRoleKey
        ? createAdminClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : supabase;

    const { data: tokenRow } = await dbClient
      .from("user_marketplace_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "ebay")
      .maybeSingle();

    let accessToken = tokenRow?.access_token;
    let refreshToken = tokenRow?.refresh_token;

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: "Please connect your eBay seller account in Settings first, or use 1-Tap Fast-List." },
        { status: 400 }
      );
    }

    // Check if Access Token is expired and refresh if necessary
    const isExpired = tokenRow?.expires_at ? new Date(tokenRow.expires_at).getTime() < Date.now() : true;

    if (isExpired && refreshToken) {
      try {
        const refreshed = await refreshEbayToken(refreshToken);
        accessToken = refreshed.access_token;

        await dbClient
          .from("user_marketplace_tokens")
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("platform", "ebay");
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
      currency: targetCurrency,
      condition: targetCondition,
      brand: targetBrand,
      category: targetCategory,
      imageUrls: publicImages,
      publishMode: isExplicitDraft ? "draft" : "live",
      forceLive: shouldForceLive,
    });

    if (!result.success || (shouldForceLive && !result.isLive)) {
      return NextResponse.json(
        {
          ...result,
          success: false,
          error: result.error || result.message || "Failed to publish live listing to eBay.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to publish listing to eBay.";
    console.error("eBay Publish Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
