export default function Loading() {
  return (
    <main
      className="space-y-8 animate-fade-in p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading content…</span>

      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-card border border-border shadow-sm animate-pulse"
          />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-96 rounded-2xl bg-card border border-border shadow-sm animate-pulse" />
    </main>
  );
}
