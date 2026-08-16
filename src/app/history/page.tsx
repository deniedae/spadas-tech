import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HistoryFeedView } from "./history-feed-view";

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
export const revalidate = 0;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const activeStatus = resolvedParams.status || "all";
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

  console.log('[History Feed] Fetching scans for user ID:', user.id, 'page:', page, 'status:', activeStatus, 'range:', fromIndex, 'to', toIndex);

  let query = supabase
    .from("scans")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (activeStatus === "completed" || activeStatus === "failed") {
    query = query.eq("status", activeStatus);
  }

  const { data: scansData, count, error } = await query.range(fromIndex, toIndex);

  if (error) {
    console.error('[History Feed] Supabase query error:', error);
  }

  const scans: ScanRecord[] = (scansData as ScanRecord[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  console.log('[History Feed] Retrieved scans count:', scans.length, 'totalCount:', totalCount, 'totalPages:', totalPages);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <HistoryFeedView
          initialScans={scans}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
          activeStatus={activeStatus}
          error={error ? { message: error.message } : null}
        />
      </div>
    </div>
  );
}
