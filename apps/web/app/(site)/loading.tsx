export default function Loading() {
  return (
    <section
      className="app-container py-16"
      aria-busy="true"
      aria-live="polite"
      data-ffm-route-loading="true"
    >
      <h1 className="text-2xl font-black tracking-tight">Loading</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Preparing this page.</p>
    </section>
  );
}
