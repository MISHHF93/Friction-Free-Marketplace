"use client";

import { ErrorMessage, LoadingSpinner } from "@/components/marketplace-design-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
            <div className="h-10 w-3/4 animate-pulse rounded-full bg-secondary" />
            <div className="h-5 w-full animate-pulse rounded-full bg-secondary" />
            <div className="h-5 w-5/6 animate-pulse rounded-full bg-secondary" />
          </div>
          <Card className="bg-secondary/60">
            <CardHeader className="space-y-3">
              <div className="h-5 w-1/2 animate-pulse rounded-full bg-background" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-background" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-background" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <div className="aspect-[4/3] animate-pulse rounded-t-2xl bg-secondary" />
            <CardContent className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-secondary" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-secondary" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-secondary" />
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
