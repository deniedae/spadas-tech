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

const EBAY_ENV = process.env.EBAY_ENVIRONMENT || "sandbox"; // 'sandbox' or 'production'
const EBAY_AUTH_HOST = EBAY_ENV === "production" ? "auth.ebay.com" : "auth.sandbox.ebay.com";
const EBAY_API_HOST = EBAY_ENV === "production" ? "api.ebay.com" : "api.sandbox.ebay.com";

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
].join("%20");

/**
 * Generate official eBay OAuth 2.0 Authorization URL
 */
export function getEbayAuthUrl(state: string): string {
  const clientId = (process.env.EBAY_CLIENT_ID || "").trim();
  const ruName = (process.env.EBAY_RU_NAME || "").trim();
  let env = (process.env.EBAY_ENVIRONMENT || "").trim().toLowerCase();

  if (!clientId || !ruName || clientId.startsWith("DEMO_") || ruName.startsWith("DEMO_")) {
    throw new Error(
      "eBay Client ID or RuName is missing or set to DEMO_ placeholders. Set EBAY_CLIENT_ID and EBAY_RU_NAME in environment variables."
    );
  }

  // Auto-detect environment if not explicitly set
  if (!env) {
    if (clientId.includes("-PRD-") || ruName.includes("-PRD-")) {
      env = "production";
    } else {
      env = "sandbox";
    }
  }

  const host = env === "production" ? "auth.ebay.com" : "auth.sandbox.ebay.com";
  const scopes = [
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  ].join("%20");

  return `https://${host}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(ruName)}&scope=${scopes}&state=${encodeURIComponent(state)}&prompt=login`;
}

/**
 * Exchange Authorization Code for Access & Refresh Tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<EbayOAuthTokens> {
  const clientId = process.env.EBAY_CLIENT_ID || "";
  const clientSecret = process.env.EBAY_CLIENT_SECRET || "";
  const ruName = process.env.EBAY_RU_NAME || "";

  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET environment variables.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const bodyParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: ruName,
  });

  const res = await fetch(`https://${EBAY_API_HOST}/identity/v1/oauth2/token`, {
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
  const clientId = process.env.EBAY_CLIENT_ID || "";
  const clientSecret = process.env.EBAY_CLIENT_SECRET || "";

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const bodyParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES.replace(/%20/g, " "),
  });

  const res = await fetch(`https://${EBAY_API_HOST}/identity/v1/oauth2/token`, {
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
 * Publish Spadas AI Listing to eBay Inventory REST API
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
  const sku = `SPADAS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const payload: EbayInventoryItemPayload = {
    sku,
    product: {
      title: listing.product.slice(0, 80),
      description: listing.description || `Listed via Spadas Technology AI Platform. ${listing.product}`,
      brand: listing.brand || "Unbranded",
      imageUrls: listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls : undefined,
    },
    condition: mapToEbayCondition(listing.condition || "Used"),
    availability: {
      shipToLocationAvailability: {
        quantity: 1,
      },
    },
  };

  const res = await fetch(`https://${EBAY_API_HOST}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Language": "en-US",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`eBay Inventory API error (${res.status}): ${errText}`);
  }

  return {
    success: true,
    sku,
    environment: EBAY_ENV,
    listingUrl: `https://${EBAY_ENV === "production" ? "www" : "sandbox"}.ebay.com/itm/${sku}`,
  };
}
