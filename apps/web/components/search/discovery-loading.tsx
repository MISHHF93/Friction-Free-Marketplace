export function DiscoveryLoadingSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-label="Loading marketplace listings">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
        <div className="bg-premium-dark p-6 sm:p-8">
          <div className="h-6 w-32 animate-pulse rounded-full bg-white/15" />
          <div className="mt-5 h-12 max-w-2xl animate-pulse rounded-2xl bg-white/15" />
          <div className="mt-4 h-5 max-w-3xl animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_12rem_10rem_auto]">
          <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden space-y-4 lg:block">
          <div className="h-[34rem] animate-pulse rounded-3xl border border-border bg-card/80" />
          <div className="h-56 animate-pulse rounded-3xl border border-border bg-card/80" />
        </div>
        <div className="space-y-6">
          <div className="h-16 animate-pulse rounded-3xl border border-border bg-card/80" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm" key={index}>
                <div className="h-44 animate-pulse bg-secondary" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-20 animate-pulse rounded-full bg-secondary" />
                  <div className="h-6 animate-pulse rounded-full bg-secondary" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-secondary" />
                  <div className="h-11 animate-pulse rounded-xl bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
