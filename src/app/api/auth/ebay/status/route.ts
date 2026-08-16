import { NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/app/lib/marketplaces/ebay";

export async function GET() {
  const clientId = (process.env.EBAY_CLIENT_ID || "").trim();
  const ruName = (process.env.EBAY_RU_NAME || "").trim();
  const explicitEnv = (process.env.EBAY_ENVIRONMENT || "").trim().toLowerCase();

  const isConfigured = !!clientId && !!ruName && !clientId.startsWith("DEMO_") && !ruName.startsWith("DEMO_");
  const keyType = clientId.includes("-PRD-") ? "Production (-PRD-)" : clientId.includes("-SBX-") ? "Sandbox (-SBX-)" : "Unknown / Custom";
  const targetHost = explicitEnv === "production" || clientId.includes("-PRD-") ? "auth.ebay.com" : "auth.sandbox.ebay.com";

  let generatedAuthUrl: string | null = null;
  let urlError: string | null = null;

  if (isConfigured) {
    try {
      generatedAuthUrl = getEbayAuthUrl("status_test_state");
    } catch (err: any) {
      urlError = err?.message || "Failed to construct auth URL";
    }
  }

  return NextResponse.json({
    status: isConfigured ? "CONFIGURED" : "DEMO_MODE_ACTIVE",
    isConfigured,
    detectedKeyType: keyType,
    explicitEnvironment: explicitEnv || "auto-detect",
    targetHost,
    clientIdConfigured: !!clientId,
    ruNameConfigured: !!ruName,
    generatedAuthUrl,
    urlError,
    guidance: {
      step1: "Verify that EBAY_CLIENT_ID matches your eBay Developer App ID.",
      step2: "Verify that EBAY_RU_NAME is your official RuName string (e.g. Denie_Dae-Spadas-SBX-123456) and NOT a URL.",
      step3: "Ensure Sandbox keys (-SBX-) target auth.sandbox.ebay.com and Production keys (-PRD-) target auth.ebay.com.",
      portalUrl: "https://developer.ebay.com/my/keys",
    },
  });
}
