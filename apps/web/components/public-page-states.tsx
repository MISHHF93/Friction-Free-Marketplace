"use client";

import { ErrorMessage, LoadingSpinner } from "@/components/marketplace-design-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PublicPageLoadingProps = {
  label: string;
  helperText?: string;
};

export function PublicPageLoading({ label, helperText = "Fetching live marketplace data and preparing responsive page sections." }: PublicPageLoadingProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8 lg:p-10">
        <LoadingSpinner label={label} size="lg" />
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{helperText}</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 rounded-full" />
            <Skeleton className="h-5 w-full rounded-full" />
            <Skeleton className="h-5 w-5/6 rounded-full" />
          </div>
          <Card className="bg-secondary/60">
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-1/2 rounded-full bg-background" />
              <Skeleton className="h-4 w-4/5 rounded-full bg-background" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 bg-background" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <Skeleton className="aspect-[4/3] rounded-b-none rounded-t-2xl" />
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

type PublicPageErrorProps = {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
};

export function PublicPageError({ title, error, reset }: PublicPageErrorProps) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <ErrorMessage
        title={title}
        message={error.message || "Refresh the page or try again in a moment."}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
