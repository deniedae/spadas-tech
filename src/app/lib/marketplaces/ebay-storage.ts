import { createClient } from "@supabase/supabase-js";

/**
 * High-resolution fallback placeholder so eBay API never rejects with
 * error 25002 ("Add at least 1 photo"). Only used when upload truly fails
 * AND we have no other valid https:// URL.
 */
const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&auto=format&fit=crop&q=80";

const PRIMARY_BUCKET = "listing-images";

/**
 * Converts Base64 data URLs to publicly accessible Supabase Storage HTTPS URLs
 * so eBay Inventory API can retrieve and process the images.
 *
 * Returns { urls, allUploaded } so the publish route knows whether conversion
 * succeeded — it should surface an error rather than silently using a fallback.
 */
export async function convertBase64ToPublicUrls(
  images: string[],
  userId = "user_default",
  itemId = "item_default"
): Promise<{ urls: string[]; allUploaded: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Separate already-public URLs from base64 blobs
  const alreadyPublic = images.filter(
    (img) =>
      typeof img === "string" &&
      (img.startsWith("http://") || img.startsWith("https://"))
  );

  const base64Images = images.filter(
    (img) => typeof img === "string" && img.startsWith("data:")
  );

  // Nothing to convert — return as-is
  if (base64Images.length === 0) {
    const result = alreadyPublic.length > 0 ? alreadyPublic : [DEFAULT_FALLBACK_IMAGE];
    return { urls: result, allUploaded: true };
  }

  // Supabase not configured
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[ebay-storage] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — cannot upload base64 images."
    );
    const result = alreadyPublic.length > 0 ? alreadyPublic : [DEFAULT_FALLBACK_IMAGE];
    return { urls: result, allUploaded: false };
  }

  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (clientErr) {
    console.error("[ebay-storage] Supabase client init failed:", clientErr);
    const result = alreadyPublic.length > 0 ? alreadyPublic : [DEFAULT_FALLBACK_IMAGE];
    return { urls: result, allUploaded: false };
  }

  // Auto-create the bucket if it doesn't exist
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === PRIMARY_BUCKET);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(PRIMARY_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      });
      if (createErr) {
        console.error(`[ebay-storage] Failed to create bucket "${PRIMARY_BUCKET}":`, createErr.message);
      } else {
        console.log(`[ebay-storage] Created bucket "${PRIMARY_BUCKET}"`);
      }
    }
  } catch (bucketErr) {
    console.warn("[ebay-storage] Bucket check/create warning:", bucketErr);
  }

  const publicUrls: string[] = [...alreadyPublic];
  let failCount = 0;

  for (let i = 0; i < base64Images.length; i++) {
    const img = base64Images[i];

    const matches = img.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.warn(`[ebay-storage] Image ${i}: not a valid base64 data URL — skipping.`);
      failCount++;
      continue;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filePath = `listings/${userId}/${itemId}/photo_${i}_${Date.now()}.${ext}`;

    try {
      const { data, error } = await supabase.storage
        .from(PRIMARY_BUCKET)
        .upload(filePath, buffer, { contentType: mimeType, upsert: true });

      if (error || !data) {
        console.error(`[ebay-storage] Upload failed for image ${i}:`, error?.message);
        failCount++;
        continue;
      }

      const { data: publicData } = supabase.storage
        .from(PRIMARY_BUCKET)
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        console.log(`[ebay-storage] Image ${i} uploaded → ${publicData.publicUrl}`);
        publicUrls.push(publicData.publicUrl);
      } else {
        console.error(`[ebay-storage] No public URL returned for image ${i}.`);
        failCount++;
      }
    } catch (uploadErr) {
      console.error(`[ebay-storage] Exception on image ${i}:`, uploadErr);
      failCount++;
    }
  }

  if (publicUrls.length === 0) {
    console.warn("[ebay-storage] All uploads failed — using fallback placeholder.");
    return { urls: [DEFAULT_FALLBACK_IMAGE], allUploaded: false };
  }

  return { urls: publicUrls, allUploaded: failCount === 0 };
}
