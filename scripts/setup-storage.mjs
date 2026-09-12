// One-time Supabase Storage bootstrap script
// Creates the 'listing-images' public bucket if it doesn't exist
// and sets a permissive RLS policy so the app can upload freely.

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "listing-images";

async function main() {
  console.log(`🔍 Checking for bucket "${BUCKET}"...`);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("❌ Could not list buckets:", listErr.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.name === BUCKET);

  if (exists) {
    console.log(`✅ Bucket "${BUCKET}" already exists.`);
  } else {
    console.log(`📦 Creating bucket "${BUCKET}"...`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    });

    if (createErr) {
      console.error(`❌ Failed to create bucket: ${createErr.message}`);
      process.exit(1);
    }
    console.log(`✅ Bucket "${BUCKET}" created and set to public.`);
  }

  // Test upload to confirm write access
  console.log("📸 Testing upload access...");
  const testBuffer = Buffer.from("ping");
  const { data: testData, error: testErr } = await supabase.storage
    .from(BUCKET)
    .upload("_health/ping.txt", testBuffer, { contentType: "text/plain", upsert: true });

  if (testErr) {
    console.error("❌ Write test failed:", testErr.message);
    console.error("   → Check that SUPABASE_SERVICE_ROLE_KEY is the service_role key, not the anon key.");
    process.exit(1);
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(testData.path);
  console.log(`✅ Write access confirmed. Public URL: ${publicData.publicUrl}`);

  // Clean up test file
  await supabase.storage.from(BUCKET).remove(["_health/ping.txt"]);
  console.log("\n🎉 Storage is ready. eBay photo uploads will work on next publish attempt.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
