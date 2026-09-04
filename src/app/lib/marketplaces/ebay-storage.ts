import { createClient } from "@supabase/supabase-js";

/**
 * Converts Base64 data URLs to publicly accessible HTTPS URLs via Supabase Storage
 * so eBay's Inventory & Trading APIs can retrieve and process the images.
 */
export async function convertBase64ToPublicUrls(
  images: string[],
  userId = "user_default",
  itemId = "item_default"
): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const publicUrls: string[] = [];

  // If Supabase is not configured, pass through existing http/https URLs
  if (!supabaseUrl || !serviceRoleKey) {
    return images.filter(
      (img) => typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))
    );
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (clientErr) {
    console.warn("Could not instantiate Supabase Storage client:", clientErr);
    return images.filter(
      (img) => typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))
    );
  }

  const bucketName = "marketplace_images";

  // Attempt to verify or auto-create bucket if missing
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = (buckets || []).some((b) => b.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  } catch {
    // If bucket creation is restricted, continue to upload attempt
  }

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (typeof img !== "string") continue;

    // Already public URL
    if (img.startsWith("http://") || img.startsWith("https://")) {
      publicUrls.push(img);
      continue;
    }

    // Parse Data URL
    const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      continue;
    }

    try {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const filePath = `listings/${userId}/${itemId}/photo_${i}_${Date.now()}.${extension}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path);

        if (publicData?.publicUrl) {
          publicUrls.push(publicData.publicUrl);
        }
      } else if (error) {
        console.warn(`Storage upload warning for image ${i}:`, error.message);
      }
    } catch (uploadErr) {
      console.warn(`Error converting base64 image ${i}:`, uploadErr);
    }
  }

  return publicUrls;
}
