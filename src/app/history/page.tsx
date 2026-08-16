import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ScanRecord {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
  result_json: any;
  token_count: number;
  status: "completed" | "failed";
}

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const pageSize = 25;
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/history");
  }

  console.log('[History Feed] Fetching scans for user ID:', user.id, 'page:', page, 'range:', fromIndex, 'to', toIndex);

  const { data: scansData, count, error } = await supabase
    .from("scans")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  if (error) {
    console.error('[History Feed] Supabase query error:', error);
  }

  const scans: ScanRecord[] = (scansData as ScanRecord[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  console.log('[History Feed] Retrieved scans count:', scans.length, 'totalCount:', totalCount, 'totalPages:', totalPages);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <Camera className="w-4 h-4" />
              <span>SPADAS LENS AR PERSISTENCE</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Scan History Feed</h1>
            <p className="text-slate-400 text-sm mt-1">
              Showing page {page} of {totalPages} ({totalCount} total scans recorded)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/lens"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Camera className="w-4 h-4" />
              <span>Launch AR Scanner</span>
            </Link>
          </div>
        </div>

        {/* Database Error Banner Fallback */}
        {error && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <div className="font-semibold text-amber-200">Database Scan History Table Status</div>
              <div className="text-xs text-amber-400/80 mt-0.5">
                {error.message || "Unable to retrieve scan history records."}
              </div>
            </div>
          </div>
        )}

        {/* Scan List */}
        {scans.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
            <Camera className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">No scan history recorded yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Scans executed in Spadas Lens will automatically persist to your account history feed.
            </p>
            <Link
              href="/lens"
              className="inline-block mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors"
            >
              Scan Your First Item
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => {
              const res = scan.result_json || {};
              const title =
                res?.analysis?.product_name ||
                res?.detected_objects?.[0]?.product_name ||
                res?.product_name ||
                res?.item_title ||
                (scan.status === "failed" ? "Failed Scan Attempt" : "Scanned Item");

              const brand = res?.analysis?.brand || res?.brand || "Generic";
              const category = res?.analysis?.category || res?.category || "Resale Item";
              const minPrice = res?.suggested_price_min || 0;
              const maxPrice = res?.suggested_price_max || 0;
              const isFailed = scan.status === "failed";
              const formattedDate = new Date(scan.created_at).toLocaleString("en-AU", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div
                  key={scan.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isFailed
                      ? "bg-rose-950/20 border-rose-900/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                        isFailed ? "bg-rose-900/40 text-rose-400" : "bg-emerald-950 text-emerald-400"
                      }`}
                    >
                      {isFailed ? <AlertTriangle className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-100 text-base">{title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
                            isFailed
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {isFailed ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>FAILED</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>COMPLETED</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>Brand: {brand}</span>
                        <span>•</span>
                        <span>Category: {category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {!isFailed && minPrice > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Resale Value</div>
                        <div className="text-emerald-400 font-bold text-lg">
                          ${minPrice} - ${maxPrice} AUD
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 font-mono">
                      Tokens: {scan.token_count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <Link
              href={`/history?page=${Math.max(1, page - 1)}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-800 transition-colors flex items-center gap-2 ${
                page <= 1
                  ? "pointer-events-none opacity-40 text-slate-600 bg-slate-900"
                  : "bg-slate-900 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Page</span>
            </Link>

            <span className="text-xs text-slate-400 font-medium">
              Page {page} of {totalPages}
            </span>

            <Link
              href={`/history?page=${Math.min(totalPages, page + 1)}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-800 transition-colors flex items-center gap-2 ${
                page >= totalPages
                  ? "pointer-events-none opacity-40 text-slate-600 bg-slate-900"
                  : "bg-slate-900 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span>Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
