import { deleteSavedSearchFormAction, updateSavedSearchFormAction } from "@/actions/saved-searches";
import { Button } from "@/components/ui/button";

const alertCadences = [
  { value: "instant", label: "Instant" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "never", label: "Save only" }
];

export function SavedSearchActions({ id, alertEnabled, alertFrequency }: { id: string; alertEnabled: boolean; alertFrequency: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={updateSavedSearchFormAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="alertEnabled" value="true" />
        <select name="alertFrequency" defaultValue={alertFrequency} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
          {alertCadences.map((cadence) => <option key={cadence.value} value={cadence.value}>{cadence.label}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Update cadence</Button>
      </form>
      <form action={updateSavedSearchFormAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="alertEnabled" value={String(!alertEnabled)} />
        <input type="hidden" name="alertFrequency" value={alertFrequency} />
        <Button type="submit" variant="outline" size="sm">{alertEnabled ? "Pause alerts" : "Resume alerts"}</Button>
      </form>
      <form action={deleteSavedSearchFormAction}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="destructive" size="sm">Delete</Button>
      </form>
    </div>
  );
}
