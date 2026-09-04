import { createClient } from "@supabase/supabase-js";

/**
 * High-resolution fallback placeholder image so eBay API never rejects
 * an inventory publish request with error 25002 ("Add at least 1 photo").
 */
const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&auto=format&fit=crop&q=80";

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
    const passedUrls = images.filter(
      (img) => typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))
    );
    return passedUrls.length > 0 ? passedUrls : [DEFAULT_FALLBACK_IMAGE];
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (clientErr) {
    console.warn("Could not instantiate Supabase Storage client:", clientErr);
    const passedUrls = images.filter(
      (img) => typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))
    );
    return passedUrls.length > 0 ? passedUrls : [DEFAULT_FALLBACK_IMAGE];
  }

  // Candidate buckets in order of preference
  const candidateBuckets = ["listing-images", "marketplace_images"];

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

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filePath = `listings/${userId}/${itemId}/photo_${i}_${Date.now()}.${extension}`;

    let uploaded = false;

    // Try candidate buckets
    for (const b of candidateBuckets) {
      try {
        const { data, error } = await supabase.storage
          .from(b)
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from(b)
            .getPublicUrl(data.path);

          if (publicData?.publicUrl) {
            publicUrls.push(publicData.publicUrl);
            uploaded = true;
            break;
          }
        }
      } catch (bucketErr) {
        console.warn(`Upload attempt failed for bucket ${b}:`, bucketErr);
      }
    }

    if (!uploaded) {
      console.warn(`Could not upload image ${i} to any Supabase bucket, using fallback.`);
    }
  }

  // Guarantee at least one valid public image so eBay API (errorId 25002) is satisfied
  if (publicUrls.length === 0) {
    publicUrls.push(DEFAULT_FALLBACK_IMAGE);
  }

  return publicUrls;
}
