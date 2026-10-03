#!/usr/bin/env node

/**
 * Script: verify_existing_gplay_subs.js
 *
 * Scans all `gplay_` subscription records in Supabase `user_subscriptions`.
 * Verifies every purchaseToken with Google Play Developer API (purchases.subscriptionsv2.get).
 * - Acknowledges valid subscriptions that are still unacknowledged (protects against 3-day refund).
 * - Updates `current_period_end` to the real expiry timestamp from Google.
 * - Flags fake or nonexistent tokens, marks status as 'fake_rejected', and revokes Pro.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// 1. Load environment variables from .env.local if present
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const PACKAGE_NAME = "com.spadas.ai";
const PRODUCT_ID = "spadas_pro_monthly";

async function main() {
  console.log("==========================================================");
  console.log("  Spadas AI — Google Play Subscription Audit & Verification ");
  console.log("==========================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("✗ Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Check Google Play API credentials
  const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let androidpublisher = null;
  if (saJson || saPath) {
    try {
      const auth = saJson
        ? new google.auth.GoogleAuth({
            credentials: typeof saJson === "string" ? JSON.parse(saJson) : saJson,
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
          })
        : new google.auth.GoogleAuth({
            keyFile: saPath,
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
          });

      androidpublisher = google.androidpublisher({ version: "v3", auth });
      console.log("✓ Google Play Service Account authenticated successfully.\n");
    } catch (authErr) {
      console.error("✗ Warning: Failed to parse Google Play credentials:", authErr.message);
    }
  } else {
    console.warn("⚠️  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured yet.");
    console.warn("   Will inspect existing Supabase rows and list tokens requiring verification.\n");
  }

  // 2. Query all existing gplay rows in user_subscriptions
  console.log("--- Querying Supabase user_subscriptions for gplay_ records ---");
  const { data: rows, error: queryError } = await supabase
    .from("user_subscriptions")
    .select("*")
    .or("stripe_customer_id.ilike.gplay_%,stripe_subscription_id.ilike.gplay_sub_%");

  if (queryError) {
    console.error("✗ Database query error:", queryError);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("✓ No gplay_ subscription records found in user_subscriptions. Database is clean.");
    return;
  }

  console.log(`Found ${rows.length} Google Play subscription record(s):\n`);

  let validCount = 0;
  let fakeCount = 0;
  let ackCount = 0;
  let pendingCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const token = (row.stripe_subscription_id || "").replace(/^gplay_sub_/, "") ||
                  (row.stripe_customer_id || "").replace(/^gplay_/, "");

    console.log(`[Record ${i + 1}/${rows.length}] User: ${row.user_id}`);
    console.log(`  Sub ID:    ${row.stripe_subscription_id}`);
    console.log(`  Cust ID:   ${row.stripe_customer_id}`);
    console.log(`  Status:    ${row.status}`);
    console.log(`  DB Expiry: ${row.current_period_end}`);
    console.log(`  Token:     ${token ? token.slice(0, 20) + "..." : "NONE"}`);

    if (!token || token.length < 10) {
      console.log("  ⚠️ Token is empty or truncated. Flagging as fake.");
      fakeCount++;
      await flagFakeSubscription(supabase, row, "Malformed or missing token");
      continue;
    }

    if (!androidpublisher) {
      console.log("  -> Pending Google API credentials check.\n");
      pendingCount++;
      continue;
    }

    try {
      console.log("  -> Querying Google Play Developer API (purchases.subscriptionsv2.get)...");
      const res = await androidpublisher.purchases.subscriptionsv2.get({
        packageName: PACKAGE_NAME,
        token,
      });

      const data = res.data;
      const state = data.subscriptionState;
      const lineItem = data.lineItems?.[0];
      const expiryTime = lineItem?.expiryTime;
      const isAcknowledged = data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
      const productId = lineItem?.productId;

      console.log(`  ✓ Google Play Response:`);
      console.log(`    State:          ${state}`);
      console.log(`    Product:        ${productId}`);
      console.log(`    Acknowledged:   ${isAcknowledged}`);
      console.log(`    Google Expiry:  ${expiryTime}`);

      const isActive = state === "SUBSCRIPTION_STATE_ACTIVE" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
      const isSkuMatch = productId === PRODUCT_ID;
      const isNotExpired = expiryTime ? new Date(expiryTime).getTime() > Date.now() : false;

      if (isActive && isSkuMatch && isNotExpired) {
        validCount++;
        // Check if acknowledgement is needed
        if (!isAcknowledged) {
          console.log("    ⚡ Subscription is unacknowledged! Acknowledging now to prevent automatic refund...");
          try {
            await androidpublisher.purchases.subscriptions.acknowledge({
              packageName: PACKAGE_NAME,
              subscriptionId: PRODUCT_ID,
              token,
              requestBody: {},
            });
            console.log("    ✓ Successfully acknowledged with Google Play!");
            ackCount++;
          } catch (ackErr) {
            console.error("    ✗ Acknowledge error:", ackErr.message);
          }
        }

        // Update database with true expiry from Google
        const realExpiryIso = new Date(expiryTime).toISOString();
        await supabase
          .from("user_subscriptions")
          .update({
            status: "active",
            price_id: productId,
            current_period_end: realExpiryIso,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        await supabase.auth.admin.updateUserById(row.user_id, {
          app_metadata: { is_pro: true, plan: "pro" },
          user_metadata: { is_pro: true, plan: "pro" },
        });

        console.log(`    ✓ Updated DB with verified status and real expiry: ${realExpiryIso}\n`);
      } else {
        console.log(`  ✗ Subscription is not active (state=${state}, match=${isSkuMatch}, notExpired=${isNotExpired}). Flagging.`);
        fakeCount++;
        await flagFakeSubscription(supabase, row, `Google state=${state}, expired=${!isNotExpired}`);
      }
    } catch (googleErr) {
      console.error(`  ✗ Google Play API rejected token: ${googleErr.message}`);
      fakeCount++;
      await flagFakeSubscription(supabase, row, `Google API rejected: ${googleErr.message}`);
    }
  }

  console.log("==========================================================");
  console.log("  Audit Summary");
  console.log("==========================================================");
  console.log(`• Total Rows Checked:   ${rows.length}`);
  console.log(`• Valid Active Subs:    ${validCount}`);
  console.log(`• Tokens Acknowledged:  ${ackCount}`);
  console.log(`• Fake / Invalid Subs:  ${fakeCount}`);
  if (pendingCount > 0) {
    console.log(`• Pending Verification: ${pendingCount} (Requires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)`);
  }
  console.log("==========================================================\n");
}

async function flagFakeSubscription(supabase, row, reason) {
  try {
    await supabase
      .from("user_subscriptions")
      .update({
        status: "fake_rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await supabase.auth.admin.updateUserById(row.user_id, {
      app_metadata: { is_pro: false, plan: "free" },
      user_metadata: { is_pro: false, plan: "free" },
    });
    console.log(`  ✓ Flagged row ${row.id} as fake_rejected and revoked Pro access (Reason: ${reason})\n`);
  } catch (err) {
    console.error(`  ✗ Failed to update row ${row.id}:`, err.message);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
