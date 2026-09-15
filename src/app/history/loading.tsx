export default function HistoryLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-32 animate-fade-in p-3 sm:p-4 md:p-6" role="status" aria-busy="true">
      {/* Header skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0F1117] border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-36 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-56 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-white/[0.05] animate-pulse" />
        </div>
      </div>

      {/* Filter and Search Bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-8 w-16 rounded-lg bg-white/[0.05] animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-white/[0.05] animate-pulse" />
          <div className="h-8 w-16 rounded-lg bg-white/[0.05] animate-pulse" />
        </div>
        <div className="h-8 w-full sm:w-64 rounded-lg bg-white/[0.05] animate-pulse" />
      </div>

      {/* History List: Card-shaped grey rectangles with photo thumb and meta rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-3.5 sm:p-4 rounded-xl bg-[#0F1117] border border-white/[0.08] flex items-center gap-3.5 shadow-sm"
          >
            {/* Checkbox placeholder */}
            <div className="h-4 w-4 rounded bg-white/[0.04] shrink-0" />

            {/* Thumbnail square */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-white/[0.06] shrink-0 animate-pulse" />

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3.5 w-12 rounded-full bg-white/[0.05] animate-pulse" />
              </div>
              <div className="h-4 w-3/4 rounded bg-white/[0.07] animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-14 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>

            {/* Value & Actions */}
            <div className="text-right space-y-1.5 shrink-0 hidden xs:block">
              <div className="h-5 w-16 rounded bg-white/[0.08] ml-auto animate-pulse" />
              <div className="h-3 w-12 rounded bg-white/[0.04] ml-auto animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
