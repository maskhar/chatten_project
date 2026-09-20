// A21: every admin segment is `force-dynamic` and several pages await two or
// three Supabase round-trips, so without a loading boundary the browser showed
// the previous screen with no feedback until the new one was ready. This is a
// skeleton rather than a spinner so the page does not visibly reflow when the
// real content arrives.
export default function AdminLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-24 rounded bg-[#e2e6dd]" />
      <div className="mt-4 h-10 w-72 max-w-full rounded bg-[#e2e6dd]" />
      <div className="mt-4 h-4 w-96 max-w-full rounded bg-[#e9ece5]" />
      <div className="mt-10 grid gap-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-20 rounded border border-[#e2e6dd] bg-white" />
        ))}
      </div>
    </section>
  );
}
