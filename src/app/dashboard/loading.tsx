export default function DashboardLoading() {
  return (
    <div
      className="space-y-3 sm:space-y-4 max-w-7xl mx-auto pb-32 sm:pb-36 p-3 sm:p-4 md:p-6 animate-fade-in text-zinc-100"
      role="status"
      aria-busy="true"
    >
      {/* Portfolio Header skeleton */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#0F1117] border border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 rounded bg-white/[0.05] animate-pulse" />
              <div className="h-5 w-20 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-7 w-48 rounded bg-white/[0.07] animate-pulse" />
            <div className="h-3.5 w-64 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-32 rounded-lg bg-white/[0.08] animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-white/[0.05] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Hero Net Profit card skeleton */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#0F1117] border border-white/[0.08] shadow-sm space-y-2">
        <div className="h-3.5 w-24 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-12 w-44 rounded-lg bg-white/[0.07] animate-pulse" />
        <div className="flex items-center gap-3 pt-1">
          <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-28 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>

      {/* Compact 4-Metric Grid (2x2 on mobile, 4-col on tablet/desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.08] shadow-sm space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-6 w-6 rounded-lg bg-white/[0.05] animate-pulse" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="h-7 w-20 rounded bg-white/[0.07] animate-pulse" />
              <div className="h-4 w-12 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 3 Core Operational Modules skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.08] shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/[0.05] animate-pulse" />
              <div className="space-y-1">
                <div className="h-3.5 w-20 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Grid Table skeleton */}
      <div className="p-4 sm:p-6 rounded-xl bg-[#0F1117] border border-white/[0.08] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="h-4 w-28 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-48 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-16 rounded bg-white/[0.05] animate-pulse" />
            <div className="h-7 w-24 rounded bg-white/[0.05] animate-pulse" />
            <div className="h-7 w-20 rounded bg-white/[0.05] animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-full max-w-sm rounded bg-white/[0.04] animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-white/[0.03] border border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
