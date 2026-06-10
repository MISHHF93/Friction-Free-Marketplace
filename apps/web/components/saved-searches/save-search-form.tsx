import { Bell } from "lucide-react";
import { createSavedSearchFormAction } from "@/actions/saved-searches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { discoveryParamEntries } from "@/lib/search/filters";
import type { DiscoverySearchParams } from "@/lib/search/schema";

export function SaveSearchForm({ params }: { params: DiscoverySearchParams }) {
  const defaultName = params.q ? `${params.q} alerts` : params.category ? `${params.category} alerts` : "Marketplace search alerts";

  return (
    <form action={createSavedSearchFormAction} className="space-y-3">
      <Input name="name" defaultValue={defaultName} aria-label="Saved search name" />
      {discoveryParamEntries(params, ["limit", "page"]).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Alert cadence
        <select name="alertFrequency" defaultValue="instant" className="h-10 rounded-lg border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground">
          <option value="instant">Instant</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
          <option value="never">Save only</option>
        </select>
      </label>
      <input type="hidden" name="alertEnabled" value="true" />
      <Button type="submit" variant="outline" className="w-full"><Bell className="h-4 w-4" /> Create alert</Button>
    </form>
  );
}
