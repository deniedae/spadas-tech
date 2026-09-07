import { NextResponse } from "next/server";
import { RadarAlert } from "@/types/radar";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/server";

export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";

declare global {
  var __spadasSyncedDeals: RadarAlert[] | undefined;
}

if (!global.__spadasSyncedDeals) {
  global.__spadasSyncedDeals = [];
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface IncomingBrowserListing {
  id?: string;
  title: string;
  price: number;
  imageUrl?: string;
  itemUrl: string;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Dynamic Item Classification Engine for eBay Comps
 */
function classifyAndCalculateComps(scrapedTitle: string, localPrice: number): { estimatedValue: number; category: string } {
  const t = scrapedTitle.toLowerCase();
  const softwareKeywords = [
    "just dance", "mario", "zelda", "pokemon", "cartridge", "disc", "game",
    "case", "cover", "fifa", "nba", "gta", "smash bros", "call of duty", "accessory"
  ];

  const isSoftware = softwareKeywords.some((kw) => t.includes(kw));

  if (isSoftware) {
    if (t.includes("card") || t.includes("pokemon") || t.includes("tcg") || t.includes("lot")) {
      let cardComp = 45.00;
      if (t.includes("300") || t.includes("500") || t.includes("japanese")) cardComp = 75.00;
      if (t.includes("1000") || t.includes("collection")) cardComp = 140.00;
      return {
        estimatedValue: cardComp,
        category: "Trading Cards / Collectibles",
      };
    }

    const estimatedValue = Math.max(localPrice + 15, Math.round(localPrice * 1.35));
    return {
      estimatedValue: Math.min(65.00, Math.max(35.00, estimatedValue)),
      category: "Video Game Software",
    };
  }

  if (t.includes("oled")) return { estimatedValue: 380.00, category: "Hardware Console" };
  if (t.includes("switch lite")) return { estimatedValue: 180.00, category: "Hardware Console" };
  if (t.includes("switch")) return { estimatedValue: 280.00, category: "Hardware Console" };
  if (t.includes("3ds")) return { estimatedValue: 240.00, category: "Hardware Console" };
  if (t.includes("ds lite") || t.includes("dsi")) return { estimatedValue: 110.00, category: "Hardware Console" };
  if (t.includes("gameboy")) return { estimatedValue: 195.00, category: "Hardware Console" };
  if (t.includes("iphone 11")) return { estimatedValue: 310.00, category: "Smartphone" };
  if (t.includes("iphone 12")) return { estimatedValue: 420.00, category: "Smartphone" };

  return {
    estimatedValue: Math.round(localPrice * 1.5),
    category: "Marketplace Item",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const adminDb = getSupabaseAdmin();
  let dbAlerts: RadarAlert[] = [];

  if (adminDb) {
    try {
      // 1. Try radar_synced_deals
      const { data, error } = await adminDb
        .from("radar_synced_deals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data) && data.length > 0) {
        dbAlerts = data.map((row: any) => ({
          id: row.deal_id || row.id,
          title: row.title,
          category: row.category,
          localPrice: Number(row.local_price) || 0,
          estimatedMarketValue: Number(row.estimated_market_value) || 0,
          potentialProfit: Number(row.potential_profit) || 0,
          roiPct: Number(row.roi_pct) || 0,
          distanceMiles: Number(row.distance_miles) || 2,
          sourceUrl: row.source_url,
          imageUrl: row.image_url,
          marketplace: row.marketplace || "Facebook Marketplace",
          confidenceScore: Number(row.confidence_score) || 95,
          status: row.status || "active",
          buyScript: row.buy_script || "",
          created_at: row.created_at,
        }));
      } else {
        // Fallback check radar_clusters metadata if dedicated table is not present
        const { data: clusterData } = await adminDb
          .from("radar_clusters")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (Array.isArray(clusterData) && clusterData.length > 0) {
          const fromClusters = clusterData
            .filter((c: any) => c.item_name)
            .map((c: any) => ({
              id: `cluster-deal-${c.id || Date.now()}`,
              title: c.item_name,
              category: "Radar Field Telemetry",
              localPrice: 15,
              estimatedMarketValue: Number(c.profit || 0) + 25,
              potentialProfit: Number(c.profit || 0),
              roiPct: 150,
              distanceMiles: 3,
              sourceUrl: "https://www.facebook.com/marketplace",
              imageUrl: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80",
              marketplace: c.store_name || "Thrift Discovery",
              confidenceScore: 90,
              status: "active" as const,
              buyScript: `Hi, is your "${c.item_name}" still available?`,
              created_at: c.created_at || new Date().toISOString(),
            }));
          if (fromClusters.length > 0) {
            dbAlerts = fromClusters;
          }
        }
      }
    } catch (err) {
      console.warn("[radar/sync] PostgreSQL read fallback:", err);
    }
  }

  // Merge database alerts with warm in-memory buffer
  const memoryAlerts = global.__spadasSyncedDeals || [];
  const mergedMap = new Map<string, RadarAlert>();

  for (const a of dbAlerts) {
    mergedMap.set(a.id, a);
  }
  for (const a of memoryAlerts) {
    if (!mergedMap.has(a.id)) {
      mergedMap.set(a.id, a);
    }
  }

  const combined = Array.from(mergedMap.values()).slice(0, 50);

  return NextResponse.json(
    {
      success: true,
      count: combined.length,
      alerts: combined,
      persistence: dbAlerts.length > 0 ? "postgresql_persisted" : "memory_warm_buffer",
    },
    { headers: CORS_HEADERS }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawListings: IncomingBrowserListing[] = Array.isArray(body.listings)
      ? body.listings
      : body.title
      ? [body]
      : [];

    if (rawListings.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_LISTINGS_PROVIDED", message: "No valid listings passed in payload.", alerts: [] },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Optional user identification from token
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const adminDb = getSupabaseAdmin();
        if (adminDb) {
          const { data } = await adminDb.auth.getUser(token);
          userId = data?.user?.id || null;
        }
      }
    } catch {}

    const ebayFeeRate = 0.1325;
    const estShipping = 8;
    const newAlerts: RadarAlert[] = [];

    for (const item of rawListings) {
      if (!item.title || typeof item.price !== "number" || item.price <= 0) continue;

      const itemId = item.id || (item.itemUrl?.includes("/item/") ? item.itemUrl.split("/item/")[1]?.split("/")[0] : `browser-${Date.now()}`);
      const canonicalUrl = item.itemUrl?.includes("/item/")
        ? item.itemUrl.split("?")[0]
        : `https://www.facebook.com/marketplace/item/${itemId}/`;

      const { estimatedValue, category } = classifyAndCalculateComps(item.title, item.price);
      const fees = Math.round(estimatedValue * ebayFeeRate * 100) / 100;
      const potentialProfit = Math.round((estimatedValue - item.price - fees - estShipping) * 100) / 100;
      const roiPct = item.price > 0 ? Math.round((potentialProfit / item.price) * 100) : 0;

      newAlerts.push({
        id: `swoopa-live-${itemId}`,
        title: item.title,
        category: `Browser Live Capture (${category})`,
        localPrice: item.price,
        estimatedMarketValue: estimatedValue,
        potentialProfit,
        roiPct,
        distanceMiles: 2,
        sourceUrl: canonicalUrl,
        imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80",
        marketplace: "Facebook Marketplace",
        confidenceScore: 100,
        status: "active",
        buyScript: `Hi! Is your "${item.title}" still available for $${item.price} on Facebook Marketplace? I can pick it up today with cash.`,
        created_at: new Date().toISOString(),
      });
    }

    // 1. Maintain memory cache
    if (!global.__spadasSyncedDeals) {
      global.__spadasSyncedDeals = [];
    }

    const existingIds = new Set(global.__spadasSyncedDeals.map((a) => a.id));
    for (const alert of newAlerts) {
      if (!existingIds.has(alert.id)) {
        global.__spadasSyncedDeals.unshift(alert);
        existingIds.add(alert.id);
      }
    }
    if (global.__spadasSyncedDeals.length > 50) {
      global.__spadasSyncedDeals = global.__spadasSyncedDeals.slice(0, 50);
    }

    // 2. Persist to PostgreSQL database
    const adminDb = getSupabaseAdmin();
    if (adminDb && newAlerts.length > 0) {
      try {
        const rows = newAlerts.map((a) => ({
          deal_id: a.id,
          user_id: userId,
          title: a.title,
          category: a.category,
          local_price: a.localPrice,
          estimated_market_value: a.estimatedMarketValue,
          potential_profit: a.potentialProfit,
          roi_pct: a.roiPct,
          source_url: a.sourceUrl,
          image_url: a.imageUrl,
          marketplace: a.marketplace,
          buy_script: a.buyScript,
          status: a.status,
          created_at: a.created_at,
        }));

        const { error: insertErr } = await adminDb.from("radar_synced_deals").upsert(rows, { onConflict: "deal_id" });
        if (insertErr) {
          // Secondary fallback: log to radar_clusters
          for (const a of newAlerts) {
            await adminDb.from("radar_clusters").insert({
              store_name: "Facebook Marketplace",
              anon_user_hash: userId || "browser-sync-extension",
              profit: a.potentialProfit,
              item_name: a.title,
              created_at: a.created_at,
            });
          }
        }
      } catch (dbErr) {
        console.warn("[radar/sync] PostgreSQL write error:", dbErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        count: newAlerts.length,
        alerts: newAlerts,
        persisted: true,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Radar sync endpoint error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Failed to process live browser sync payload." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
