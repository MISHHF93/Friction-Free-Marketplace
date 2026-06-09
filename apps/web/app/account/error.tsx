"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Card className="border-destructive/40 bg-destructive/10" role="alert">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Account settings are unavailable
          </CardTitle>
          <CardDescription>{error.message || "We could not load your profile or notification preferences. Please try again."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </section>
  );
}
