import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExperiencePage } from "@/lib/page-data";

export function PageIndex({ title, pages }: { title: string; pages: ExperiencePage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {pages.map((page) => (
          <Link className="group flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm font-semibold hover:bg-accent" href={page.route} key={page.key}>
            <span>{page.title}</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
