
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
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
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
 * Setting prompt="login" forces eBay to present credentials sign-in screen,
 * ensuring the user can authenticate as a new/desired account rather than
 * silently auto-authorizing using existing browser cookies.
 */
export function getEbayAuthUrl(state: string, promptLogin: boolean = true): string {
  const clientId = resolveClientId();
  const ruName = resolveRuName();

  const host = "auth.ebay.com";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: ruName,
    scope: SCOPES,
    state: state,
    ...(promptLogin ? { prompt: "login" } : {}),
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
  if (lower.includes("brand new") || lower === "new") return "NEW";
  if (lower.includes("like new") || lower.includes("mint")) return "LIKE_NEW";
  if (lower.includes("fair") || lower.includes("acceptable")) return "USED_ACCEPTABLE";
  if (lower.includes("parts") || lower.includes("untested") || lower.includes("faulty")) return "FOR_PARTS_OR_NOT_WORKING";
  // Default pre-owned items to USED_EXCELLENT (universally supported across eBay AU fashion and goods)
  return "USED_EXCELLENT";
}

export type EbayRegion = "USD" | "GBP" | "AUD";

/**
 * Ensure an inventory location exists on the seller's account for target region
 */
async function ensureMerchantLocation(
  apiHost: string,
  accessToken: string,
  locationKey: string,
  region: EbayRegion = "AUD"
) {
  try {
    let address = {
      addressLine1: "123 Reseller St",
      city: "Melbourne",
      stateOrProvince: "VIC",
      postalCode: "3000",
      country: "AU",
    };
    let name = "Spadas AU Warehouse";

    if (region === "USD") {
      address = {
        addressLine1: "100 Reseller Way",
        city: "Los Angeles",
        stateOrProvince: "CA",
        postalCode: "90001",
        country: "US",
      };
      name = "Spadas US Warehouse";
    } else if (region === "GBP") {
      address = {
        addressLine1: "10 Commercial Rd",
        city: "London",
        stateOrProvince: "Greater London",
        postalCode: "E1 1LP",
        country: "GB",
      };
      name = "Spadas UK Warehouse";
    }

    const locPayload = {
      location: { address },
      name,
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

export interface EbayListingPolicies {
  fulfillmentPolicyId?: string;
  returnPolicyId?: string;
  paymentPolicyId?: string;
}

/**
 * Ensure seller has compliant eBay business policies configured.
 * Automatically opts into Business Policies (SELLING_POLICY_MANAGEMENT)
 * and provisions standard Fulfillment, Return, and Payment policies if missing.
 */
export async function ensureUserDefaultPolicies(
  apiHost: string,
  accessToken: string,
  marketplaceId = "EBAY_AU"
): Promise<EbayListingPolicies> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // 1. Opt-in seller account to Business Policies if needed
  try {
    await fetch(`https://${apiHost}/sell/account/v1/program/opt_in`, {
      method: "POST",
      headers,
      body: JSON.stringify({ programType: "SELLING_POLICY_MANAGEMENT" }),
    });
  } catch (optErr) {
    console.warn("Opt-in to SELLING_POLICY_MANAGEMENT notice:", optErr);
  }

  const policies: EbayListingPolicies = {};

  try {
    const [fRes, rRes, pRes] = await Promise.all([
      fetch(`https://${apiHost}/sell/account/v1/fulfillment_policy?marketplace_id=${marketplaceId}`, { headers }).catch(() => null),
      fetch(`https://${apiHost}/sell/account/v1/return_policy?marketplace_id=${marketplaceId}`, { headers }).catch(() => null),
      fetch(`https://${apiHost}/sell/account/v1/payment_policy?marketplace_id=${marketplaceId}`, { headers }).catch(() => null),
    ]);

    if (fRes && fRes.ok) {
      const fData = await fRes.json();
      const list = fData.fulfillmentPolicies || [];
      if (list.length > 0) {
        policies.fulfillmentPolicyId = list[0].fulfillmentPolicyId;
      }
    }

    if (rRes && rRes.ok) {
      const rData = await rRes.json();
      const list = rData.returnPolicies || [];
      if (list.length > 0) {
        policies.returnPolicyId = list[0].returnPolicyId;
      }
    }

    if (pRes && pRes.ok) {
      const pData = await pRes.json();
      const list = pData.paymentPolicies || [];
      if (list.length > 0) {
        policies.paymentPolicyId = list[0].paymentPolicyId;
      }
    }

    const isUsd = marketplaceId === "EBAY_US";
    const isGbp = marketplaceId === "EBAY_GB";

    // 2. Create default Fulfillment Policy if missing
    if (!policies.fulfillmentPolicyId) {
      let fpName = "Spadas Standard AU Shipping";
      let fpDesc = "Standard delivery via Australia Post with tracking.";
      let carrierCode = "GENERIC";
      let serviceCode = "AU_StandardDelivery";
      let shippingCostVal = "10.00";
      let shippingCurrency = "AUD";

      if (isUsd) {
        fpName = "Spadas Standard US Shipping";
        fpDesc = "Standard shipping via USPS Priority with tracking.";
        carrierCode = "USPS";
        serviceCode = "USPSPriority";
        shippingCostVal = "5.00";
        shippingCurrency = "USD";
      } else if (isGbp) {
        fpName = "Spadas Standard UK Shipping";
        fpDesc = "Standard delivery via Royal Mail with tracking.";
        carrierCode = "GENERIC";
        serviceCode = "UK_RoyalMailSecondClassStandard";
        shippingCostVal = "3.50";
        shippingCurrency = "GBP";
      }

      const fpPayload = {
        name: fpName,
        description: fpDesc,
        marketplaceId,
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
        handlingTime: { value: 1, unit: "DAY" },
        shippingOptions: [
          {
            costType: "FLAT_RATE",
            optionType: "DOMESTIC",
            shippingServices: [
              {
                shippingCarrierCode: carrierCode,
                shippingServiceCode: serviceCode,
                shippingCost: { value: shippingCostVal, currency: shippingCurrency },
                freeShipping: false,
              },
            ],
          },
        ],
      };
      const newFpRes = await fetch(`https://${apiHost}/sell/account/v1/fulfillment_policy`, {
        method: "POST",
        headers,
        body: JSON.stringify(fpPayload),
      }).catch(() => null);

      if (newFpRes && (newFpRes.ok || newFpRes.status === 201)) {
        const fpJson = await newFpRes.json().catch(() => null);
        if (fpJson?.fulfillmentPolicyId) policies.fulfillmentPolicyId = fpJson.fulfillmentPolicyId;
      }
    }

    // 3. Create default Return Policy if missing
    if (!policies.returnPolicyId) {
      const rpName = isUsd
        ? "Spadas Default 30 Day Returns US"
        : isGbp
        ? "Spadas Default 30 Day Returns UK"
        : "Spadas Default 30 Day Returns";
      const rpPayload = {
        name: rpName,
        description: "Buyer pays return postage, 30-day return period.",
        marketplaceId,
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
        returnsAccepted: true,
        returnPeriod: { value: 30, unit: "DAY" },
        returnShippingCostPayer: "BUYER",
      };
      const newRpRes = await fetch(`https://${apiHost}/sell/account/v1/return_policy`, {
        method: "POST",
        headers,
        body: JSON.stringify(rpPayload),
      }).catch(() => null);

      if (newRpRes && (newRpRes.ok || newRpRes.status === 201)) {
        const rpJson = await newRpRes.json().catch(() => null);
        if (rpJson?.returnPolicyId) policies.returnPolicyId = rpJson.returnPolicyId;
      }
    }

    // 4. Create default Payment Policy if missing
    if (!policies.paymentPolicyId) {
      const ppName = isUsd
        ? "Spadas Managed Payments US"
        : isGbp
        ? "Spadas Managed Payments UK"
        : "Spadas Managed Payments";
      const ppPayload = {
        name: ppName,
        description: "eBay Managed Payments with Immediate Pay.",
        marketplaceId,
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
        immediatePay: true,
      };
      const newPpRes = await fetch(`https://${apiHost}/sell/account/v1/payment_policy`, {
        method: "POST",
        headers,
        body: JSON.stringify(ppPayload),
      }).catch(() => null);

      if (newPpRes && (newPpRes.ok || newPpRes.status === 201)) {
        const ppJson = await newPpRes.json().catch(() => null);
        if (ppJson?.paymentPolicyId) policies.paymentPolicyId = ppJson.paymentPolicyId;
      }
    }
  } catch (err) {
    console.warn("Could not ensure user eBay business policies:", err);
  }

  return policies;
}

export const fetchUserDefaultPolicies = ensureUserDefaultPolicies;

/**
 * Construct compliant item aspects (Item Specifics) to satisfy eBay category requirements
 */
export function buildEbayAspects(listing: {
  product: string;
  brand?: string;
  category?: string;
  description?: string;
}): Record<string, string[]> {
  const brand = (listing.brand || "Unbranded").trim();
  const text = `${listing.product || ""} ${listing.description || ""}`.toLowerCase();

  // Department
  let department = "Unisex Adults";
  if (text.includes("men's") || text.includes("mens") || text.includes(" men ")) department = "Men";
  else if (text.includes("women's") || text.includes("womens") || text.includes(" women ") || text.includes("ladies")) department = "Women";
  else if (text.includes("kid") || text.includes("boy") || text.includes("girl") || text.includes("youth")) department = "Kids";

  // Material
  let material = "Leather";
  if (text.includes("leather")) material = "Leather";
  else if (text.includes("cotton") || text.includes("denim")) material = "Cotton";
  else if (text.includes("canvas")) material = "Canvas";
  else if (text.includes("nylon") || text.includes("polyester")) material = "Synthetic";
  else if (text.includes("wool") || text.includes("cashmere")) material = "Wool";
  else if (text.includes("gold")) material = "Gold";
  else if (text.includes("silver")) material = "Silver";
  else material = "Mixed Materials";

  // Colour
  let colour = "Multicoloured";
  const knownColours = ["black", "white", "blue", "red", "green", "brown", "grey", "gray", "pink", "purple", "yellow", "orange", "gold", "silver", "beige", "navy", "cream", "tan"];
  for (const c of knownColours) {
    if (text.includes(c)) {
      colour = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Style / Type
  let style = "Classic";
  if (text.includes("tote")) style = "Tote";
  else if (text.includes("shoulder")) style = "Shoulder Bag";
  else if (text.includes("crossbody")) style = "Crossbody";
  else if (text.includes("backpack")) style = "Backpack";
  else if (text.includes("clutch") || text.includes("pouch")) style = "Clutch";
  else if (text.includes("wallet") || text.includes("cardholder")) style = "Wallet";
  else if (text.includes("sneaker") || text.includes("shoe")) style = "Sneaker";
  else if (text.includes("jacket") || text.includes("coat")) style = "Jacket";
  else if (text.includes("hoodie") || text.includes("sweatshirt")) style = "Hoodie";
  else if (text.includes("t-shirt") || text.includes("shirt")) style = "T-Shirt";

  return {
    Brand: [brand],
    Department: [department],
    Colour: [colour],
    "Exterior Colour": [colour],
    Material: [material],
    "Exterior Material": [material],
    Style: [style],
    Type: [style],
  };
}

/**
 * Maps item category and title to eBay leaf category IDs (universal across AU, US, UK)
 */
export function resolveEbayCategoryId(category?: string, title?: string): string {
  const text = `${category || ""} ${title || ""}`.toLowerCase();
  if (text.includes("watch") || text.includes("timepiece") || text.includes("rolex") || text.includes("omega")) return "31387";
  if (text.includes("wallet") || text.includes("cardholder") || text.includes("purse")) return "45258";
  if (text.includes("sneaker") || text.includes("shoe") || text.includes("athletic") || text.includes("jordan") || text.includes("nike") || text.includes("dunk")) return "15709";
  if (text.includes("ring") || text.includes("necklace") || text.includes("pendant") || text.includes("jewelry") || text.includes("jewellery") || text.includes("bracelet") || text.includes("earring") || text.includes("chain") || text.includes("precious_metals") || text.includes("gold") || text.includes("silver") || text.includes("brooch")) return "164344";
  if (text.includes("crystal") || text.includes("mineral") || text.includes("gemstone") || text.includes("quartz") || text.includes("geode") || text.includes("crystals_gems")) return "3225";
  if (text.includes("card") || text.includes("pokemon") || text.includes("tcg") || text.includes("magic") || text.includes("yugioh") || text.includes("charizard") || text.includes("trading_cards")) return "183454";
  if (text.includes("men") && (text.includes("bag") || text.includes("briefcase") || text.includes("backpack"))) return "52357";
  return "169291"; // Default to Women's Bags & Handbags
}

/**
 * Publish Spadas AI Listing to eBay Inventory & Offer REST API
 * Supports eBay Australia (EBAY_AU / AUD), United States (EBAY_US / USD), and United Kingdom (EBAY_GB / GBP).
 */
export async function publishToEbayInventory(
  accessToken: string,
  listing: {
    product: string;
    description: string;
    price: number;
    currency?: string;
    condition?: string;
    brand?: string;
    category?: string;
    imageUrls?: string[];
    publishMode?: "live" | "draft";
    forceLive?: boolean;
  }
) {
  const apiHost = getApiHost();
  const rawCurrency = (listing.currency || "").toUpperCase().trim();
  const isUsd = rawCurrency === "USD";
  const isGbp = rawCurrency === "GBP";

  let currencyCode = "AUD";
  let marketplaceId = "EBAY_AU";
  let contentLanguage = "en-AU";
  let ebayDomain = "ebay.com.au";
  let merchantLocationKey = "spadas_store_au";
  let region: EbayRegion = "AUD";

  if (isUsd) {
    currencyCode = "USD";
    marketplaceId = "EBAY_US";
    contentLanguage = "en-US";
    ebayDomain = "ebay.com";
    merchantLocationKey = "spadas_store_us";
    region = "USD";
  } else if (isGbp) {
    currencyCode = "GBP";
    marketplaceId = "EBAY_GB";
    contentLanguage = "en-GB";
    ebayDomain = "ebay.co.uk";
    merchantLocationKey = "spadas_store_uk";
    region = "GBP";
  }

  const sku = `SPADAS_${currencyCode}_${Date.now()}`;

  // 1. Ensure merchant location exists on eBay
  await ensureMerchantLocation(apiHost, accessToken, merchantLocationKey, region);

  // 2. Filter valid image URLs and guarantee at least 1 photo for eBay API (Error 25002)
  let validHttpImageUrls = (listing.imageUrls || []).filter(
    (url) => typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))
  );

  if (validHttpImageUrls.length === 0) {
    validHttpImageUrls = [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&auto=format&fit=crop&q=80",
    ];
  }

  const condition = mapToEbayCondition(listing.condition || "Used");
  const aspects = buildEbayAspects({
    product: listing.product,
    brand: listing.brand,
    category: listing.category,
    description: listing.description,
  });

  const itemPayload: Record<string, unknown> = {
    product: {
      title: listing.product.slice(0, 80),
      description: listing.description || `Listed via Spadas Technology AI Platform. ${listing.product}`,
      aspects,
      imageUrls: validHttpImageUrls,
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
      "Content-Language": contentLanguage,
      "Accept": "application/json",
      "Accept-Language": contentLanguage,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(itemPayload),
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    let parsedMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.errors?.[0]?.message) {
        parsedMsg = parsed.errors[0].message;
      }
    } catch {}
    throw new Error(`eBay Inventory API error (${res.status}): ${parsedMsg}`);
  }

  // 4. Resolve default business policies and category ID
  const categoryId = resolveEbayCategoryId(listing.category, listing.product);
  const policies = await ensureUserDefaultPolicies(apiHost, accessToken, marketplaceId);

  // 5. Create an Offer for this inventory item
  let offerId: string | null = null;
  const isProduction = apiHost === "api.ebay.com";

  try {
    const offerPayload: Record<string, unknown> = {
      sku: sku,
      marketplaceId: marketplaceId,
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId: categoryId,
      merchantLocationKey: merchantLocationKey,
      pricingSummary: {
        price: {
          value: Number(listing.price || 25).toFixed(2),
          currency: currencyCode,
        },
      },
      listingDescription: listing.description || `Listed via Spadas Technology AI Platform. ${listing.product}`,
    };

    if (policies.fulfillmentPolicyId) {
      offerPayload.listingPolicies = {
        fulfillmentPolicyId: policies.fulfillmentPolicyId,
        ...(policies.returnPolicyId ? { returnPolicyId: policies.returnPolicyId } : {}),
        ...(policies.paymentPolicyId ? { paymentPolicyId: policies.paymentPolicyId } : {}),
      };
    }

    const offerRes = await fetch(`https://${apiHost}/sell/inventory/v1/offer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Language": contentLanguage,
        "Accept": "application/json",
        "Accept-Language": contentLanguage,
      },
      body: JSON.stringify(offerPayload),
    });

    if (!offerRes.ok) {
      const errJson = await offerRes.json().catch(() => null);
      const errMsg = errJson?.errors?.[0]?.message || `eBay Offer API returned ${offerRes.status}`;
      console.warn("eBay Offer creation warning:", errMsg, errJson);
      return {
        success: false,
        sku,
        offerId: null,
        isLive: false,
        listingId: null,
        error: errMsg,
        message: `Could not create offer: ${errMsg}. Use 1-Tap Fast-List to publish directly on eBay!`,
        listingUrl: `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sl/prelist/suggest?keyword=${encodeURIComponent(listing.product)}`,
      };
    }

    const offerData = await offerRes.json();
    offerId = offerData.offerId || null;

    const isExplicitDraft = listing.publishMode === "draft" && !listing.forceLive;

    // 6. Target active publish action unless explicitly requested as draft
    if (offerId && !isExplicitDraft) {
      const pubRes = await fetch(`https://${apiHost}/sell/inventory/v1/offer/${offerId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": contentLanguage,
          "Accept": "application/json",
          "Accept-Language": contentLanguage,
        },
      });

      if (pubRes.ok) {
        const pubData = await pubRes.json();
        const listingId = pubData.listingId || null;
        const isLive = !!listingId;
        const liveUrl = isLive
          ? `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/itm/${listingId}`
          : `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sh/lst/active`;

        return {
          success: true,
          sku,
          offerId,
          isLive: true,
          listingId,
          environment: isProduction ? "production" : "sandbox",
          listingUrl: liveUrl,
          message: `Listing is LIVE on eBay (${currencyCode})! Item ID: ${listingId}`,
        };
      } else {
        const pubErrJson = await pubRes.json().catch(() => null);
        const errMsg = pubErrJson?.errors?.[0]?.message || `eBay publish returned status ${pubRes.status}`;
        console.warn("eBay live publish failed:", errMsg, pubErrJson);

        return {
          success: false,
          sku,
          offerId,
          isLive: false,
          listingId: null,
          error: errMsg,
          message: `Could not publish live to eBay: ${errMsg}. Use 1-Tap Fast-List to publish directly!`,
          listingUrl: `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sh/lst/drafts`,
        };
      }
    } else if (offerId && isExplicitDraft) {
      // Explicitly requested draft save
      return {
        success: true,
        sku,
        offerId,
        isLive: false,
        listingId: null,
        message: `Saved as draft in eBay Seller Hub (${currencyCode}).`,
        listingUrl: `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sh/lst/drafts`,
      };
    }
  } catch (offerErr: any) {
    console.warn("Offer creation/publish warning:", offerErr);
    return {
      success: false,
      sku,
      offerId,
      isLive: false,
      listingId: null,
      error: offerErr?.message || "Failed to create offer",
      message: `Error: ${offerErr?.message || "Offer failed"}. Use 1-Tap Fast-List to publish.`,
      listingUrl: `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sl/prelist/suggest?keyword=${encodeURIComponent(listing.product)}`,
    };
  }

  return {
    success: false,
    sku,
    offerId,
    isLive: false,
    listingId: null,
    error: "No offer ID created",
    message: "Could not create offer. Use 1-Tap Fast-List to publish.",
    listingUrl: `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sl/prelist/suggest?keyword=${encodeURIComponent(listing.product)}`,
  };
}



