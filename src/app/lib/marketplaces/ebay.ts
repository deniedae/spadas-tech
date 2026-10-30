import {
  generateOptimizedEbayTitle,
  buildEbayPolicyCompliantDescription,
} from "./ebay-prefill";

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

export function getAuthHost(): string {
  const clientId = resolveClientId();
  if (clientId.includes("-PRD-") || process.env.EBAY_ENVIRONMENT === "production") {
    return "auth.ebay.com";
  }
  return "auth.sandbox.ebay.com";
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

  const host = getAuthHost();

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
  if (lower.includes("very good")) return "USED_VERY_GOOD";
  if (lower.includes("good")) return "USED_GOOD";
  if (lower.includes("excellent")) return "USED_EXCELLENT";
  if (lower.includes("fair") || lower.includes("acceptable")) return "USED_ACCEPTABLE";
  if (lower.includes("parts") || lower.includes("untested") || lower.includes("faulty")) return "FOR_PARTS_OR_NOT_WORKING";
  // Default pre-owned items to USED_GOOD
  return "USED_GOOD";
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
      let carrierCode = "AustraliaPost";
      let serviceCode = "AU_StandardDelivery";
      let shippingCostVal = "10.00";
      let shippingCurrency = "AUD";

      if (isUsd) {
        fpName = "Spadas Standard US Shipping";
        fpDesc = "Standard shipping via USPS Ground Advantage with tracking.";
        carrierCode = "USPS";
        serviceCode = "USPSGroundAdvantage";
        shippingCostVal = "5.00";
        shippingCurrency = "USD";
      } else if (isGbp) {
        fpName = "Spadas Standard UK Shipping";
        fpDesc = "Standard delivery via Royal Mail with tracking.";
        carrierCode = "RoyalMail";
        serviceCode = "UK_RoyalMail48";
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
  const rawBrand = (listing.brand || "Unbranded").trim();
  const brand = ["authentic", "genuine", "original", "guaranteed", "coa"].includes(rawBrand.toLowerCase())
    ? "Unbranded"
    : rawBrand || "Unbranded";
  const text = `${listing.product || ""} ${listing.category || ""} ${listing.description || ""}`.toLowerCase();

  const aspects: Record<string, string[]> = {
    Brand: [brand],
    MPN: ["Does Not Apply"],
    UPC: ["Does Not Apply"],
  };

  // 1. Fragrances, Perfumes & Cologne (e.g., Tous H2O, Chanel, Dior, Creed)
  if (/\b(perfume|fragrance|cologne|eau de toilette|eau de parfum|edt|edp|parfum|scent|aftershave)\b/i.test(text)) {
    let type = "Eau de Toilette";
    if (/\b(eau de parfum|edp)\b/i.test(text)) type = "Eau de Parfum";
    else if (/\b(eau de toilette|edt)\b/i.test(text)) type = "Eau de Toilette";
    else if (/\b(cologne|aftershave)\b/i.test(text)) type = "Cologne";
    else if (/\b(parfum|pure perfume)\b/i.test(text)) type = "Parfum";
    else if (/\b(perfume|body mist)\b/i.test(text)) type = "Perfume";

    let formulation = "Spray";
    if (/\b(rollerball|roll-on)\b/i.test(text)) formulation = "Rollerball";
    else if (/\b(splash|liquid|pour)\b/i.test(text)) formulation = "Liquid";
    else if (/\b(solid|balm)\b/i.test(text)) formulation = "Solid";

    let volume = "100 ml / 3.4 fl oz";
    const volumeMatch = text.match(/(\d+(?:\.\d+)?)\s*(ml|fl\s*oz|oz)\b/i);
    if (volumeMatch) {
      const num = volumeMatch[1];
      const unit = volumeMatch[2].toLowerCase().replace(/\s+/, " ");
      volume = `${num} ${unit}`;
    }

    let department = "Unisex";
    if (/\b(women|ladies|pour femme|femme|her)\b/i.test(text)) department = "Women";
    else if (/\b(men|pour homme|homme|his)\b/i.test(text)) department = "Men";

    let fragName = listing.product;
    if (brand !== "Unbranded") {
      fragName = fragName.replace(new RegExp(brand, "gi"), "");
    }
    fragName = fragName
      .replace(/\b(eau de toilette|eau de parfum|edt|edp|parfum|cologne|spray|perfume|fragrance|vaporisateur|for men|for women|natural spray)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    aspects["Type"] = [type];
    aspects["Fragrance Name"] = [fragName || listing.product];
    aspects["Volume"] = [volume];
    aspects["Formulation"] = [formulation];
    aspects["Department"] = [department];

    if (/\b(citrus|fresh|aquatic|water|ocean|h2o)\b/i.test(text)) aspects["Scent"] = ["Fresh / Aquatic"];
    else if (/\b(floral|rose|jasmine)\b/i.test(text)) aspects["Scent"] = ["Floral"];
    else if (/\b(woody|cedar|sandalwood|oud)\b/i.test(text)) aspects["Scent"] = ["Woody"];
    else if (/\b(oriental|amber|vanilla|spicy)\b/i.test(text)) aspects["Scent"] = ["Warm & Spicy"];

    return aspects;
  }

  // 2. DVDs / Blu-ray / 4K UHD / Movies / VHS (DO NOT add clothing aspects!)
  if (/\b(dvd|dvds|blu-ray|bluray|4k uhd|movie|movies|steelbook|criterion|vhs|film|films|cinema|box set|boxset)\b/i.test(text)) {
    const isBluRay = /\b(blu-ray|bluray)\b/i.test(text);
    const is4K = /\b(4k|4k uhd|ultra hd)\b/i.test(text);
    const isVhs = /\b(vhs)\b/i.test(text);
    const format = is4K ? "4K UHD" : isBluRay ? "Blu-ray" : isVhs ? "VHS" : "DVD";

    aspects["Format"] = [format];
    aspects["Type"] = [/\b(season|series|tv)\b/i.test(text) ? "TV Series" : "Movie"];
    aspects["Movie/TV Title"] = [listing.product];
    aspects["Language"] = ["English"];
    return aspects;
  }

  // 3. Music (Vinyl, CDs, Cassettes)
  if (/\b(vinyl|record|cd|compact disc|cassette|album)\b/i.test(text)) {
    const isVinyl = /\b(vinyl|record|lp)\b/i.test(text);
    const isCassette = /\b(cassette)\b/i.test(text);
    const format = isVinyl ? "Record" : isCassette ? "Cassette" : "CD";

    aspects["Format"] = [format];
    aspects["Type"] = ["Album"];
    aspects["Release Title"] = [listing.product];
    if (brand !== "Unbranded") aspects["Artist"] = [brand];
    return aspects;
  }

  // 4. Video Games
  if (/\b(video game|gamecube|ps5|ps4|ps3|ps2|ps1|playstation|xbox|nintendo|switch|n64|snes|nes|sega|game boy|gameboy)\b/i.test(text)) {
    let platform = "Multi-Platform";
    if (/ps5|playstation 5/i.test(text)) platform = "Sony PlayStation 5";
    else if (/ps4|playstation 4/i.test(text)) platform = "Sony PlayStation 4";
    else if (/ps3/i.test(text)) platform = "Sony PlayStation 3";
    else if (/ps2/i.test(text)) platform = "Sony PlayStation 2";
    else if (/ps1|playstation/i.test(text)) platform = "Sony PlayStation 1";
    else if (/switch/i.test(text)) platform = "Nintendo Switch";
    else if (/gamecube/i.test(text)) platform = "Nintendo GameCube";
    else if (/n64/i.test(text)) platform = "Nintendo 64";
    else if (/game boy|gameboy/i.test(text)) platform = "Nintendo Game Boy";
    else if (/xbox series/i.test(text)) platform = "Microsoft Xbox Series X|S";
    else if (/xbox one/i.test(text)) platform = "Microsoft Xbox One";
    else if (/xbox 360/i.test(text)) platform = "Microsoft Xbox 360";
    else if (/xbox/i.test(text)) platform = "Microsoft Xbox";

    aspects["Platform"] = [platform];
    aspects["Game Name"] = [listing.product];
    aspects["Genre"] = ["Action & Adventure"];
    return aspects;
  }

  // 5. Books & Comics
  if (/\b(book|novel|comic|manga|textbook)\b/i.test(text)) {
    aspects["Book Title"] = [listing.product];
    aspects["Format"] = [/\b(hardcover|hardback)\b/i.test(text) ? "Hardcover" : "Paperback"];
    aspects["Language"] = ["English"];
    if (brand !== "Unbranded") aspects["Author"] = [brand];
    return aspects;
  }

  // 6. Trading Cards
  if (/\b(pokemon|pokémon|mtg|magic|yugioh|tcg|trading card)\b/i.test(text)) {
    aspects["Game"] = [/\b(pokemon|pokémon)\b/i.test(text) ? "Pokémon TCG" : /\b(magic|mtg)\b/i.test(text) ? "Magic: The Gathering" : "Trading Card Game"];
    aspects["Card Name"] = [listing.product];
    aspects["Graded"] = ["No"];
    return aspects;
  }

  // 7. Watches
  if (/\b(watch|timepiece|chronograph)\b/i.test(text)) {
    aspects["Type"] = ["Wristwatch"];
    aspects["Department"] = [/\b(women|ladies)\b/i.test(text) ? "Women" : /\b(men)\b/i.test(text) ? "Men" : "Unisex Adults"];
    return aspects;
  }

  // 8. Mobile Phones & Smartphones
  if (/\b(iphone|smartphone|cell phone|galaxy s\d+|pixel \d+)\b/i.test(text)) {
    let model = listing.product;
    if (/\b(iphone\s*\d*(?:\s*pro(?:\s*max)?)?)\b/i.test(text)) {
      const m = text.match(/\b(iphone\s*\d+(?:\s*pro(?:\s*max)?)?)\b/i);
      if (m) model = m[1].toUpperCase();
    } else if (/\b(galaxy\s*s\d+(?:\s*ultra|\s*\+)?)\b/i.test(text)) {
      const m = text.match(/\b(galaxy\s*s\d+(?:\s*ultra|\s*\+)?)\b/i);
      if (m) model = `Samsung ${m[1]}`;
    }

    let storage = "128 GB";
    const storageMatch = text.match(/\b(64|128|256|512|1000|1tb|2tb)\s*(gb|tb)\b/i);
    if (storageMatch) storage = `${storageMatch[1]} ${storageMatch[2].toUpperCase()}`;

    aspects["Model"] = [model];
    aspects["Storage Capacity"] = [storage];
    aspects["Network"] = ["Unlocked"];
    aspects["Lock Status"] = ["Factory Unlocked"];
    return aspects;
  }

  // 9. Consumer Electronics & Cameras
  if (/\b(camera|lens|dslr|camcorder|digicam|headphone|headphones|earbuds|walkman|turntable|receiver|amplifier|speaker)\b/i.test(text)) {
    let type = "Electronics";
    if (/\b(headphone|headphones)\b/i.test(text)) type = "Headphones";
    else if (/\b(earbuds|airpods)\b/i.test(text)) type = "Earbuds";
    else if (/\b(camera|dslr|digicam)\b/i.test(text)) type = "Digital Camera";
    else if (/\b(walkman|cassette player)\b/i.test(text)) type = "Portable Cassette Player";
    else if (/\b(turntable|record player)\b/i.test(text)) type = "Turntable";
    else if (/\b(receiver|amplifier)\b/i.test(text)) type = "Receiver/Amplifier";

    let connectivity = "Wired";
    if (/\b(bluetooth|wireless)\b/i.test(text)) connectivity = "Bluetooth";

    aspects["Type"] = [type];
    aspects["Connectivity"] = [connectivity];
    aspects["Model"] = [listing.product];
    return aspects;
  }

  // 10. Toys, Action Figures & LEGO
  if (/\b(action figure|funko|lego|hot wheels|hasbro|mattel|transformers|star wars toy|marvel toy|plush)\b/i.test(text)) {
    let type = "Action Figure";
    if (/\b(lego|building set|blocks)\b/i.test(text)) type = "Building Toy Set";
    else if (/\b(funko|pop figure|vinyl figure)\b/i.test(text)) type = "Vinyl Figure";
    else if (/\b(hot wheels|diecast|die-cast|car)\b/i.test(text)) type = "Diecast Vehicle";
    else if (/\b(plush|stuffed animal)\b/i.test(text)) type = "Plush";

    let theme = "Collectibles";
    if (/\b(star wars)\b/i.test(text)) theme = "Star Wars";
    else if (/\b(marvel|avengers|spider-man|spiderman|iron man)\b/i.test(text)) theme = "Marvel";
    else if (/\b(dc|batman|superman)\b/i.test(text)) theme = "DC Comics";
    else if (/\b(pokemon|pokémon)\b/i.test(text)) theme = "Pokémon";

    aspects["Type"] = [type];
    aspects["Theme"] = [theme];
    aspects["Franchise"] = [theme];
    return aspects;
  }

  // 11. Jewelry & Precious Metals
  if (/\b(ring|necklace|pendant|jewelry|jewellery|bracelet|earring|earrings|chain|brooch|gold|silver|diamond|\.925|14k|18k)\b/i.test(text)) {
    let type = "Necklace";
    if (/\b(ring|bands)\b/i.test(text)) type = "Ring";
    else if (/\b(bracelet|bangle)\b/i.test(text)) type = "Bracelet";
    else if (/\b(earring|earrings|studs)\b/i.test(text)) type = "Earrings";
    else if (/\b(pendant|charm)\b/i.test(text)) type = "Pendant";

    let metal = "Sterling Silver";
    if (/\b(14k|18k|10k|24k|yellow gold|solid gold)\b/i.test(text)) metal = "Yellow Gold";
    else if (/\b(white gold)\b/i.test(text)) metal = "White Gold";
    else if (/\b(rose gold)\b/i.test(text)) metal = "Rose Gold";
    else if (/\b(stainless steel)\b/i.test(text)) metal = "Stainless Steel";

    let stone = "No Stone";
    if (/\b(diamond|diamonds)\b/i.test(text)) stone = "Diamond";
    else if (/\b(crystal|cubic zirconia|cz)\b/i.test(text)) stone = "Cubic Zirconia";
    else if (/\b(pearl|pearls)\b/i.test(text)) stone = "Pearl";
    else if (/\b(amethyst|quartz|gemstone|emerald|ruby|sapphire)\b/i.test(text)) stone = "Gemstone";

    aspects["Type"] = [type];
    aspects["Metal"] = [metal];
    aspects["Main Stone"] = [stone];
    aspects["Metal Purity"] = [/\b(18k)\b/i.test(text) ? "18k" : /\b(14k)\b/i.test(text) ? "14k" : /\b(925)\b/i.test(text) ? "925" : "Not Applicable"];
    return aspects;
  }

  // 12. Clothing, Shoes, Bags & Fashion (ONLY here do we add Department, Material, Color, Style, Size)
  const isFashion = /\b(jacket|coat|windbreaker|hoodie|sweater|sweatshirt|shirt|t-shirt|tee|pants|jeans|dress|skirt|shorts|sneaker|shoe|shoes|boots|bag|handbag|tote|crossbody|backpack|wallet|purse)\b/i.test(text);

  if (isFashion) {
    let department = "Unisex Adults";
    if (text.includes("men's") || text.includes("mens") || text.includes(" men ")) department = "Men";
    else if (text.includes("women's") || text.includes("womens") || text.includes(" women ") || text.includes("ladies") || text.includes("dress")) department = "Women";
    else if (text.includes("kid") || text.includes("boy") || text.includes("girl") || text.includes("youth")) department = "Kids";

    let material = "Cotton";
    if (text.includes("leather") || text.includes("saffiano")) material = "Leather";
    else if (text.includes("cotton") || text.includes("denim")) material = "Cotton";
    else if (text.includes("canvas")) material = "Canvas";
    else if (text.includes("nylon") || text.includes("polyester")) material = "Synthetic";
    else if (text.includes("wool") || text.includes("cashmere")) material = "Wool";
    else if (text.includes("gold")) material = "Gold";
    else if (text.includes("silver")) material = "Silver";
    else material = "Mixed Materials";

    let colour = "Multicoloured";
    const knownColours = ["black", "white", "blue", "red", "green", "brown", "grey", "gray", "pink", "purple", "yellow", "orange", "gold", "silver", "beige", "navy", "cream", "tan"];
    for (const c of knownColours) {
      if (text.includes(c)) {
        colour = c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }

    let style = "Classic";
    if (text.includes("tote")) style = "Tote";
    else if (text.includes("shoulder")) style = "Shoulder Bag";
    else if (text.includes("crossbody")) style = "Crossbody";
    else if (text.includes("backpack")) style = "Backpack";
    else if (text.includes("wallet")) style = "Wallet";
    else if (text.includes("sneaker") || text.includes("shoe")) style = "Sneaker";
    else if (text.includes("jacket") || text.includes("coat")) style = "Jacket";
    else if (text.includes("hoodie")) style = "Hoodie";
    else if (text.includes("t-shirt") || text.includes("shirt")) style = "T-Shirt";

    let size = "M";
    const sizeMatch = text.match(/\b(xxxl|xxl|xl|l|m|s|xs|xxs|\d{1,2}(?:\s*us|\s*uk)?)\b/i);
    if (sizeMatch) size = sizeMatch[1].toUpperCase();

    aspects["Department"] = [department];
    aspects["Color"] = [colour];
    aspects["Colour"] = [colour];
    aspects["Material"] = [material];
    aspects["Style"] = [style];
    aspects["Size"] = [size];
    aspects["Size Type"] = ["Regular"];
  }

  // Vintage & Era tagging (cross-cutting)
  if (/\b(vintage|retro|antique|y2k|90s|80s|70s|60s|50s)\b/i.test(text)) {
    aspects["Vintage"] = ["Yes"];
    let era = "1990s (90s)";
    if (/\b(80s|1980s)\b/i.test(text)) era = "1980s (80s)";
    else if (/\b(70s|1970s)\b/i.test(text)) era = "1970s (70s)";
    else if (/\b(y2k|2000s)\b/i.test(text)) era = "2000s (Y2K)";
    aspects["Era"] = [era];
  }

  return aspects;
}

/**
 * Maps item category and title to eBay leaf category IDs (universal across AU, US, UK)
 */
export function resolveEbayCategoryId(category?: string, title?: string): string {
  const text = `${category || ""} ${title || ""}`.toLowerCase();

  // 1. Fragrances & Perfumes (e.g. Tous H2O, Chanel, Dior)
  if (/\b(perfume|fragrance|cologne|eau de toilette|eau de parfum|edt|edp|parfum|aftershave)\b/i.test(text)) {
    if (/\b(men|homme|pour homme|his)\b/i.test(text)) return "29585"; // Men's Fragrances
    return "11848"; // Women's / Unisex Fragrances
  }

  // 2. DVDs, Blu-rays, Movies, VHS
  if (/\b(dvd|dvds|blu-ray|bluray|4k uhd|movie|movies|steelbook|criterion|film|films|cinema|box set|boxset)\b/i.test(text)) return "617";
  if (/\b(vhs|tape)\b/i.test(text)) return "309";

  // 3. Music (Vinyl, CDs, Cassettes)
  if (/\b(vinyl|record|lp|12"|7"|33 rpm|45 rpm)\b/i.test(text)) return "176985";
  if (/\b(cd|compact disc|audio cd)\b/i.test(text)) return "176984";
  if (/\b(cassette)\b/i.test(text)) return "176983";

  // 4. Video Games & Consoles
  if (/\b(ps5|ps4|ps3|ps2|ps1|playstation|xbox|nintendo|switch|gamecube|n64|snes|nes|sega|game boy|gameboy|wii|atari)\b/i.test(text)) {
    if (/\b(console|system|hardware|bundle)\b/i.test(text)) return "139971";
    return "139973"; // Video Games
  }
  if (/\b(video game|cartridge)\b/i.test(text)) return "139973";

  // 5. Books, Comic Books & Manga
  if (/\b(comic|manga|graphic novel)\b/i.test(text)) return "63";
  if (/\b(book|novel|hardcover|paperback|textbook|author|isbn)\b/i.test(text)) return "267";

  // 6. Trading Cards & Sports Cards
  if (/\b(pokemon|pokémon|magic the gathering|mtg|yugioh|yu-gi-oh|tcg|charizard|booster|cardfight)\b/i.test(text)) return "183454";
  if (/\b(trading card|baseball card|basketball card|football card|soccer card|sports card|panini|topps)\b/i.test(text)) return "213";

  // 7. Watches & Timepieces
  if (/\b(watch|timepiece|rolex|omega|seiko|casio|chronograph|g-shock|tag heuer|breitling|tudor)\b/i.test(text)) return "31387";

  // 8. Jewelry & Precious Metals
  if (/\b(ring|necklace|pendant|jewelry|jewellery|bracelet|earring|earrings|chain|brooch|gold|silver|diamond|\.925|14k|18k)\b/i.test(text)) return "164344";

  // 9. Crystals & Minerals
  if (/\b(crystal|mineral|gemstone|quartz|geode|amethyst|agate|cluster|crystals_gems)\b/i.test(text)) return "3225";

  // 10. Consumer Electronics & Cameras
  if (/\b(iphone|smartphone|cell phone|samsung galaxy|pixel)\b/i.test(text)) return "9355";
  if (/\b(camera|lens|dslr|camcorder|digicam)\b/i.test(text)) return "31388";
  if (/\b(headphone|headphones|earbuds|airpods)\b/i.test(text)) return "112529";
  if (/\b(receiver|amplifier|turntable|speaker|vintage audio)\b/i.test(text)) return "14993";

  // 11. Toys & Action Figures
  if (/\b(action figure|funko|lego|hot wheels|hasbro|mattel|transformers|star wars toy)\b/i.test(text)) return "246";

  // 12. Shoes & Sneakers
  if (/\b(sneaker|sneakers|shoe|shoes|athletic|jordan|nike|dunk|boots|heels|sandals|loafers|cleats)\b/i.test(text)) return "15709";

  // 13. Clothing & Apparel
  if (/\b(jacket|coat|windbreaker|hoodie|sweater|sweatshirt|shirt|t-shirt|tee|pants|jeans|dress|skirt|shorts|blazer|fleece|parka|vest)\b/i.test(text)) {
    if (/\b(women|ladies|dress|skirt)\b/i.test(text)) return "15724"; // Women's Clothing
    return "1059"; // Men's Clothing
  }

  // 14. Bags, Wallets & Handbags
  if (/\b(wallet|cardholder|bifold|coin purse)\b/i.test(text)) return "45258";
  if (/\b(backpack|briefcase|messenger bag)\b/i.test(text)) return "52357";
  if (/\b(bag|handbag|tote|crossbody|shoulder bag|clutch|purse)\b/i.test(text)) return "169291";

  // 15. Neutral Fallback for General Collectibles & Household Goods (NOT clothing!)
  return "1"; // Collectibles
}

/**
 * Asks eBay's Taxonomy API for a LEAF category that fits the listing title on the seller's
 * marketplace. The Inventory API rejects non-leaf categories, and category trees differ between
 * EBAY_US / EBAY_AU / EBAY_GB, so a hard-coded ID is not reliable. Returns null on any failure
 * so callers can fall back to resolveEbayCategoryId().
 */
export async function fetchEbayLeafCategoryId(
  apiHost: string,
  accessToken: string,
  marketplaceId: string,
  query: string
): Promise<string | null> {
  const q = (query || "").trim().slice(0, 100);
  if (!q) return null;

  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    const treeRes = await fetch(
      `https://${apiHost}/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${marketplaceId}`,
      { headers }
    );
    if (!treeRes.ok) return null;
    const treeData = await treeRes.json().catch(() => null);
    const treeId = treeData?.categoryTreeId;
    if (!treeId) return null;

    const sugRes = await fetch(
      `https://${apiHost}/commerce/taxonomy/v1/category_tree/${treeId}/get_category_suggestions?q=${encodeURIComponent(q)}`,
      { headers }
    );
    if (!sugRes.ok) return null;
    const sugData = await sugRes.json().catch(() => null);
    const id = sugData?.categorySuggestions?.[0]?.category?.categoryId;
    return id ? String(id) : null;
  } catch (err) {
    console.warn("eBay Taxonomy category lookup failed:", err);
    return null;
  }
}

/**
 * Publish Spadas AI Listing to eBay Inventory & Offer REST API
 */
export const EBAY_RESTRICTION_NOTICE =
  "Listing Blocked: Your eBay account currently has selling restrictions or pending verification. Please check eBay Seller Hub.";

export function isEbayAccountRestrictedError(errorData: any, rawText?: string): boolean {
  const combinedText = [
    typeof rawText === "string" ? rawText : "",
    errorData?.message || "",
    ...(errorData?.errors || []).map((e: any) => `${e?.errorId || ""} ${e?.message || ""} ${e?.longMessage || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  // ONLY authentic account suspension or trading limit error codes from eBay Sell API
  // NOTE: Never include 21919301 (MPN required), 21916328 (Category aspects), 21919158 (Shipping service),
  // 21919188 (Return policy), or 21919067 (Payment method) as they are normal listing parameter errors!
  const restrictionErrorIds = [
    "25019", // Seller account has restrictions
    "25008", // Seller account suspended
    "25010", // Seller not allowed to list
    "25007", // Selling limit reached
    "25001", // Restricted from selling
    "25006", // Trading limit exceeded
    "121",   // Account not allowed to list
    "17",    // Account payout verification required
  ];

  const hasRestrictionId = (errorData?.errors || []).some((e: any) =>
    restrictionErrorIds.includes(String(e?.errorId))
  );

  const restrictionPhrases = [
    "account is restricted",
    "restricted from selling",
    "account has restrictions",
    "seller account is suspended",
    "account is suspended",
    "selling limit reached",
    "trading limit reached",
  ];

  const hasRestrictionPhrase = restrictionPhrases.some((phrase) => combinedText.includes(phrase));
  return hasRestrictionId || hasRestrictionPhrase;
}

/**
 * Publishes an inventory item and either creates a live offer or a draft offer on eBay.
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
  const isProduction = apiHost === "api.ebay.com";
  const rawCurrency = (listing.currency || "").toUpperCase().trim();
  const isAud = rawCurrency === "AUD";
  const isGbp = rawCurrency === "GBP";

  let currencyCode = "USD";
  let marketplaceId = "EBAY_US";
  let contentLanguage = "en-US";
  let ebayDomain = "ebay.com";
  let merchantLocationKey = "spadas_store_us";
  let region: EbayRegion = "USD";

  if (isAud) {
    currencyCode = "AUD";
    marketplaceId = "EBAY_AU";
    contentLanguage = "en-AU";
    ebayDomain = "ebay.com.au";
    merchantLocationKey = "spadas_store_au";
    region = "AUD";
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
    throw new Error(
      "Cannot publish listing to eBay without at least one valid public image URL. Please attach or capture a photo before publishing."
    );
  }

  const condition = mapToEbayCondition(listing.condition || "Used");
  const aspects = buildEbayAspects({
    product: listing.product,
    brand: listing.brand,
    category: listing.category,
    description: listing.description,
  });

  const compliantTitle = generateOptimizedEbayTitle(listing.product, listing.brand);
  const compliantDescription = buildEbayPolicyCompliantDescription({
    title: compliantTitle,
    brand: listing.brand,
    condition: listing.condition,
    category: listing.category,
    rawNotes: listing.description,
  });

  const itemPayload: Record<string, unknown> = {
    product: {
      title: compliantTitle,
      description: compliantDescription,
      aspects,
      imageUrls: validHttpImageUrls,
    },
    condition,
    ...(condition !== "NEW" ? { conditionDescription: "Pre-owned in working condition. Carefully inspected." } : {}),
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
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(errText);
      if (parsedJson.errors?.[0]?.message) {
        parsedMsg = parsedJson.errors[0].message;
      }
    } catch {}

    if (isEbayAccountRestrictedError(parsedJson, errText)) {
      return {
        success: false,
        sku,
        offerId: null,
        isLive: false,
        listingId: null,
        accountRestricted: true,
        error: EBAY_RESTRICTION_NOTICE,
        message: EBAY_RESTRICTION_NOTICE,
        listingUrl: `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sh/ovw`,
      };
    }

    throw new Error(`eBay Inventory API error (${res.status}): ${parsedMsg}`);
  }

  // 4. Resolve default business policies and category ID
  const suggestedCategoryId = await fetchEbayLeafCategoryId(
    apiHost,
    accessToken,
    marketplaceId,
    listing.product
  );
  const categoryId = suggestedCategoryId || resolveEbayCategoryId(listing.category, listing.product);
  const policies = await ensureUserDefaultPolicies(apiHost, accessToken, marketplaceId);

  // 5. Create an Offer for this inventory item
  let offerId: string | null = null;

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
      listingDescription: compliantDescription,
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
      const isRestricted = isEbayAccountRestrictedError(errJson, errMsg);
      return {
        success: false,
        sku,
        offerId: null,
        isLive: false,
        listingId: null,
        accountRestricted: isRestricted,
        error: isRestricted ? EBAY_RESTRICTION_NOTICE : errMsg,
        message: isRestricted ? EBAY_RESTRICTION_NOTICE : `Could not create offer: ${errMsg}.`,
        listingUrl: isRestricted
          ? `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sh/ovw`
          : null,
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
        const isRestricted = isEbayAccountRestrictedError(pubErrJson, errMsg);

        return {
          success: false,
          sku,
          offerId,
          isLive: false,
          listingId: null,
          accountRestricted: isRestricted,
          error: isRestricted ? EBAY_RESTRICTION_NOTICE : errMsg,
          message: isRestricted ? EBAY_RESTRICTION_NOTICE : `Could not publish live to eBay: ${errMsg}.`,
          listingUrl: isRestricted
            ? `https://${isProduction ? "www" : "sandbox"}.${ebayDomain}/sh/ovw`
            : null,
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
      message: `Error: ${offerErr?.message || "Offer failed"}.`,
      listingUrl: null,
    };
  }

  return {
    success: false,
    sku,
    offerId,
    isLive: false,
    listingId: null,
    error: "No offer ID created",
    message: "Could not create offer.",
    listingUrl: null,
  };
}



