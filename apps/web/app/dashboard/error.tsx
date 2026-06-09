"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/10" role="alert">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Dashboard is unavailable
        </CardTitle>
        <CardDescription>{error.message || "We could not load your dashboard. Try again, or sign in again if the issue continues."}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={reset}>Try again</Button>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      </CardContent>
    </Card>
  );
}
