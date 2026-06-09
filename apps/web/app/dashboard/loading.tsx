import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading dashboard">
      <div className="h-32 animate-pulse rounded-3xl bg-secondary" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardHeader><div className="h-5 w-32 animate-pulse rounded bg-secondary" /></CardHeader>
            <CardContent><div className="h-16 animate-pulse rounded bg-secondary" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
