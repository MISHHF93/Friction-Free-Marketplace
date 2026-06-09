"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/10" role="alert">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" /> Admin workspace is unavailable
        </CardTitle>
        <CardDescription>{error.message || "We could not load the admin workspace. Your permissions may have changed, or the service may be unavailable."}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
