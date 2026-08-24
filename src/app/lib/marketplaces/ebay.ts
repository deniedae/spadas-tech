import { supabase } from "@/app/lib/supabase";

export interface EbayOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  token_type: string;
}

export interface EbayInventoryItemPayload {
  sku: string;
  product: {
    title: string;
    description: string;
    aspects?: Record<string, string[]>;
    brand?: string;
    mpn?: string;
    imageUrls?: string[];
  };
  condition: "NEW" | "LIKE_NEW" | "USED_EXCELLENT" | "USED_VERY_GOOD" | "USED_GOOD" | "USED_ACCEPTABLE" | "FOR_PARTS_OR_NOT_WORKING";
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
}

export function getApiHost(): string {
  const clientId = resolveClientId();
  if (clientId.includes("-PRD-") || process.env.EBAY_ENVIRONMENT === "production") {
    return "api.ebay.com";
  }
  return "api.sandbox.ebay.com";
}

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
].join(" ");

export function resolveRuName(): string {
  const envRuName = (process.env.EBAY_RU_NAME || "").trim();
  // If the env var is missing, set to the App ID, or has incorrect dots
  if (
    !envRuName ||
    envRuName === (process.env.EBAY_CLIENT_ID || "").trim() ||
    envRuName.includes(".spada.") ||
    !envRuName.includes("_")
  ) {
    return "mathew_spada-mathewsp-Spadas-nfyqlyy";
  }
  return envRuName;
}

export function resolveClientId(): string {
  return (process.env.EBAY_CLIENT_ID || "").trim();
}

export function resolveClientSecret(): string {
  return (process.env.EBAY_CLIENT_SECRET || "").trim();
}

/**
 * Generate official eBay OAuth 2.0 Authorization URL
 */
export function getEbayAuthUrl(state: string): string {
  const clientId = resolveClientId();
  const ruName = resolveRuName();

  const host = "auth.ebay.com";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: ruName,
    scope: SCOPES,
    state: state,
  });

  return `https://${host}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange Authorization Code for Access & Refresh Tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<EbayOAuthTokens> {
  const clientId = resolveClientId();
  const clientSecret = resolveClientSecret();
  const ruName = resolveRuName();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const bodyParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: ruName,
  });

  const apiHost = getApiHost();
  const res = await fetch(`https://${apiHost}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`eBay Token Exchange failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as EbayOAuthTokens;
}

/**
 * Refresh expired eBay Access Token using Refresh Token
 */
export async function refreshEbayToken(refreshToken: string): Promise<EbayOAuthTokens> {
  const clientId = resolveClientId();
  const clientSecret = resolveClientSecret();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const bodyParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES,
  });

  const apiHost = getApiHost();
  const res = await fetch(`https://${apiHost}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`eBay Refresh Token failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as EbayOAuthTokens;
}

/**
 * Map Spadas AI Listing condition text to eBay condition enum
 */
export function mapToEbayCondition(cond: string): EbayInventoryItemPayload["condition"] {
  const lower = (cond || "").toLowerCase();
  if (lower.includes("new")) return "NEW";
  if (lower.includes("like new") || lower.includes("mint")) return "LIKE_NEW";
  if (lower.includes("excellent")) return "USED_EXCELLENT";
  if (lower.includes("very good")) return "USED_VERY_GOOD";
  if (lower.includes("parts") || lower.includes("untested") || lower.includes("faulty")) return "FOR_PARTS_OR_NOT_WORKING";
  return "USED_GOOD";
}

/**
 * Ensure an inventory location exists on the seller's account
 */
async function ensureMerchantLocation(apiHost: string, accessToken: string, locationKey: string) {
  try {
    const locPayload = {
      location: {
        address: {
          addressLine1: "123 Reseller St",
          city: "Melbourne",
          stateOrProvince: "VIC",
          postalCode: "3000",
          country: "AU",
        },
      },
      name: "Spadas Main Warehouse",
      merchantLocationStatus: "ENABLED",
      locationTypes: ["WAREHOUSE"],
    };

    await fetch(`https://${apiHost}/sell/inventory/v1/location/${locationKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(locPayload),
    });
  } catch (locErr) {
    console.warn("Could not ensure merchant location:", locErr);
  }
}

/**
 * Publish Spadas AI Listing to eBay Inventory & Offer REST API
 */
export async function publishToEbayInventory(
  accessToken: string,
  listing: {
    product: string;
    description: string;
    price: number;
    condition?: string;
    brand?: string;
    imageUrls?: string[];
  }
) {
  const apiHost = getApiHost();
  const merchantLocationKey = "spadas_store_au";
  const sku = `SPADAS_AU_${Date.now()}`;

  // 1. Ensure merchant location exists on eBay
  await ensureMerchantLocation(apiHost, accessToken, merchantLocationKey);

  // 2. Filter valid image URLs
  const validHttpImageUrls = (listing.imageUrls || []).filter(
    (url) => typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))
  );

  const condition = mapToEbayCondition(listing.condition || "Used");
  const itemPayload: Record<string, unknown> = {
    product: {
      title: listing.product.slice(0, 80),
      description: listing.description || `Listed via Spadas Technology AI Platform. ${listing.product}`,
      aspects: {
        Brand: [listing.brand || "Unbranded"],
      },
      ...(validHttpImageUrls.length > 0 ? { imageUrls: validHttpImageUrls } : {}),
    },
    condition,
    ...(condition !== "NEW" ? { conditionDescription: "Pre-owned in working condition." } : {}),
    availability: {
      shipToLocationAvailability: {
        quantity: 1,
      },
    },
  };

  // 3. Create or Replace Inventory Item
  const res = await fetch(`https://${apiHost}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Language": "en-AU",
      "Accept": "application/json",
      "Accept-Language": "en-AU",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(itemPayload),
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`eBay Inventory API error (${res.status}): ${errText}`);
  }

  // 4. Create an Offer for this inventory item
  let offerId: string | null = null;
  let isLive = false;
  let listingId: string | null = null;

  try {
    const offerPayload = {
      sku: sku,
      marketplaceId: "EBAY_AU",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      merchantLocationKey: merchantLocationKey,
      pricingSummary: {
        price: {
          value: Number(listing.price || 25).toFixed(2),
          currency: "AUD",
        },
      },
      listingDescription: listing.description || `Listed via Spadas Technology AI Platform. ${listing.product}`,
    };

    const offerRes = await fetch(`https://${apiHost}/sell/inventory/v1/offer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Language": "en-AU",
        "Accept": "application/json",
        "Accept-Language": "en-AU",
      },
      body: JSON.stringify(offerPayload),
    });

    if (offerRes.ok) {
      const offerData = await offerRes.json();
      offerId = offerData.offerId || null;

      // 5. If offer created, attempt to publish it live
      if (offerId) {
        const pubRes = await fetch(`https://${apiHost}/sell/inventory/v1/offer/${offerId}/publish`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Content-Language": "en-AU",
            "Accept": "application/json",
            "Accept-Language": "en-AU",
          },
        });

        if (pubRes.ok) {
          const pubData = await pubRes.json();
          listingId = pubData.listingId || null;
          isLive = !!listingId;
        }
      }
    }
  } catch (offerErr) {
    console.warn("Offer creation/publish warning:", offerErr);
  }

  const isProduction = apiHost === "api.ebay.com";
  const listingUrl = isLive && listingId
    ? `https://${isProduction ? "www" : "sandbox"}.ebay.com.au/itm/${listingId}`
    : `https://${isProduction ? "www" : "sandbox"}.ebay.com.au/sh/lst/drafts`;

  return {
    success: true,
    sku,
    offerId,
    isLive,
    listingId,
    environment: isProduction ? "production" : "sandbox",
    listingUrl,
    message: isLive
      ? "Listing is LIVE on eBay!"
      : "Inventory draft and offer created in your eBay Seller Hub!",
  };
}
