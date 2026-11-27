import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading admin workspace">
      <div className="h-36 animate-pulse rounded-3xl bg-secondary" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Card key={item}>
            <CardHeader><div className="h-5 w-36 animate-pulse rounded bg-secondary" /></CardHeader>
            <CardContent><div className="h-20 animate-pulse rounded bg-secondary" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
