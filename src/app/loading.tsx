export default function Loading() {
  return <main id="main-content" className="grid min-h-screen place-content-center text-center" aria-busy="true">
    <div className="mx-auto size-9 animate-pulse rounded-full border-2 border-clay/30 border-t-clay" />
    <p className="mt-5 text-sm text-muted">Getting the plan ready…</p>
  </main>;
}
