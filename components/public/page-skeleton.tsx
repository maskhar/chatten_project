// A45: every public route is force-dynamic, so a slow database left the user
// on the previous page with no feedback at all. A route-level loading.tsx
// renders this instantly while the server work runs.
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="min-h-screen bg-cream">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="bg-forest py-20 sm:py-32 lg:py-44">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="h-3 w-40 animate-pulse rounded bg-white/20" />
          <div className="mt-6 h-12 w-3/4 animate-pulse rounded bg-white/15 sm:h-20" />
          <div className="mt-7 h-4 w-2/3 max-w-2xl animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto grid max-w-7xl gap-5 px-6 py-20 md:grid-cols-2 lg:px-12">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="animate-pulse bg-sand">
            <div className="h-64 bg-line-soft" />
            <div className="p-7">
              <div className="h-7 w-1/2 rounded bg-line-soft" />
              <div className="mt-4 h-4 w-3/4 rounded bg-line-soft" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
