import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AccountLoading() {
  return (
    <section className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6 lg:px-8" aria-label="Loading account settings">
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
        <div className="h-9 w-56 animate-pulse rounded bg-secondary" />
        <div className="h-5 max-w-2xl animate-pulse rounded bg-secondary" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader><div className="h-6 w-36 animate-pulse rounded bg-secondary" /></CardHeader>
          <CardContent><div className="h-72 animate-pulse rounded bg-secondary" /></CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><div className="h-6 w-24 animate-pulse rounded bg-secondary" /></CardHeader>
          <CardContent><div className="h-11 animate-pulse rounded bg-secondary" /></CardContent>
        </Card>
      </div>
    </section>
  );
}
