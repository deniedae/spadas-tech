import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Background / Retry Scan Save Endpoint
 * Uploads image to Supabase Storage 'listing-images' bucket and persists record in 'scans' table.
 * Used for background sync, offline reconnects, and retry queues without blocking client valuation rendering.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scanId, imageUrl, resultJson, tokenCount = 2600 } = body;

    if (!resultJson) {
      return NextResponse.json({ error: "Missing resultJson payload" }, { status: 400 });
    }

    // 1. Authenticate user from session cookies
    const cookieStore = await cookies();
    const supabaseUserClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    let { data: { user } } = await supabaseUserClient.auth.getUser();

    // 2. Check Bearer token in Authorization header as fallback (PWA / WebView support)
    if (!user) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const { data: tokenUser } = await supabaseUserClient.auth.getUser(token);
        if (tokenUser?.user) {
          user = tokenUser.user;
        }
      }
    }

    // 3. Initialize Service Role client to bypass RLS and write to storage/scans safely
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = (supabaseUrl && serviceRoleKey)
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : supabaseUserClient;

    let finalImageUrl = imageUrl || "";

    // 4. If base64, upload to Supabase Storage 'listing-images' bucket
    if (finalImageUrl.startsWith("data:")) {
      try {
        const matches = finalImageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = mimeType.split("/")[1] || "jpeg";
          const filename = `scans/${user?.id || "guest"}-${Date.now()}.${ext}`;

          const { data: uploadData, error: uploadErr } = await dbClient.storage
            .from("listing-images")
            .upload(filename, buffer, {
              contentType: mimeType,
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = dbClient.storage
              .from("listing-images")
              .getPublicUrl(filename);
            if (publicUrlData?.publicUrl) {
              finalImageUrl = publicUrlData.publicUrl;
            }
          } else if (uploadErr) {
            console.warn("[scans/save] Storage upload error:", uploadErr.message);
          }
        }
      } catch (storageErr) {
        console.warn("[scans/save] Storage upload exception:", storageErr);
      }
    }

    // 5. Persist record to public.scans table
    if (user?.id) {
      // Check if record already exists to prevent duplicate rows
      if (scanId) {
        const { data: existing } = await dbClient
          .from("scans")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", scanId)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ success: true, scanId: existing.id, imageUrl: finalImageUrl, updated: false });
        }
      }

      const { data: inserted, error: insertErr } = await dbClient
        .from("scans")
        .insert([
          {
            user_id: user.id,
            image_url: finalImageUrl,
            result_json: resultJson,
            token_count: tokenCount,
            status: "completed",
          },
        ])
        .select()
        .single();

      if (insertErr) {
        console.error("[scans/save] DB insert error:", insertErr.message);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        scanId: inserted?.id || scanId,
        imageUrl: finalImageUrl,
      });
    }

    return NextResponse.json({
      success: true,
      scanId,
      imageUrl: finalImageUrl,
      guest: true,
    });
  } catch (err: any) {
    console.error("[scans/save] Handler failure:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
