import { google } from "googleapis";

export const GOOGLE_PLAY_PACKAGE_NAME = "com.spadas.ai";
export const GOOGLE_PLAY_PRODUCT_ID = "spadas_pro_monthly";

export interface GooglePlaySubscriptionVerification {
  isValid: boolean;
  state: string;
  productId: string;
  expiryTime: string;
  isAcknowledged: boolean;
  orderId?: string;
  raw: any;
}

/**
 * Returns an authenticated Google Play AndroidPublisher client using a Service Account.
 * The Service Account credentials can be provided via GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
 * (stringified JSON content) or standard GOOGLE_APPLICATION_CREDENTIALS file path.
 */
export function getGooglePlayAuth() {
  const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (saJson) {
    try {
      const credentials = typeof saJson === "string" ? JSON.parse(saJson) : saJson;
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });
    } catch (err: any) {
      throw new Error(`Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: ${err.message}`);
    }
  }

  if (saPath) {
    return new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
  }

  throw new Error(
    "Missing Google Play service account credentials. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in environment variables."
  );
}

/**
 * Verifies a purchase token with the Google Play Developer API using purchases.subscriptionsv2.get.
 */
export async function verifySubscriptionTokenWithGoogle(
  purchaseToken: string,
  expectedSku: string = GOOGLE_PLAY_PRODUCT_ID,
  packageName: string = GOOGLE_PLAY_PACKAGE_NAME
): Promise<GooglePlaySubscriptionVerification> {
  const auth = getGooglePlayAuth();
  const androidpublisher = google.androidpublisher({
    version: "v3",
    auth,
  });

  const response = await androidpublisher.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  const data = response.data;
  const state = data.subscriptionState || "SUBSCRIPTION_STATE_UNSPECIFIED";
  const lineItem = data.lineItems?.[0];
  const productId = lineItem?.productId || "";
  const expiryTime = lineItem?.expiryTime || "";
  const isAcknowledged =
    data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";

  // Only SUBSCRIPTION_STATE_ACTIVE or SUBSCRIPTION_STATE_IN_GRACE_PERIOD indicate valid Pro status
  const isActiveState =
    state === "SUBSCRIPTION_STATE_ACTIVE" ||
    state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";

  // Verify expiry is in the future
  const expiryDate = expiryTime ? new Date(expiryTime) : null;
  const isNotExpired = expiryDate ? expiryDate.getTime() > Date.now() : false;

  const isSkuMatch = productId === expectedSku;

  const isValid = isActiveState && isNotExpired && isSkuMatch;

  return {
    isValid,
    state,
    productId,
    expiryTime,
    isAcknowledged,
    orderId: (data as any).latestOrderId || undefined,
    raw: data,
  };
}

/**
 * Acknowledges a purchase token with Google Play.
 * Subscriptions must be acknowledged within 3 days or Google automatically refunds them.
 */
export async function acknowledgeSubscriptionWithGoogle(
  purchaseToken: string,
  subscriptionId: string = GOOGLE_PLAY_PRODUCT_ID,
  packageName: string = GOOGLE_PLAY_PACKAGE_NAME
): Promise<boolean> {
  const auth = getGooglePlayAuth();
  const androidpublisher = google.androidpublisher({
    version: "v3",
    auth,
  });

  try {
    await androidpublisher.purchases.subscriptions.acknowledge({
      packageName,
      subscriptionId,
      token: purchaseToken,
      requestBody: {},
    });
    return true;
  } catch (err: any) {
    // If already acknowledged, Google Play returns 400 or "already acknowledged" message
    if (err?.message?.includes("already acknowledged") || err?.status === 204) {
      return true;
    }
    throw err;
  }
}
