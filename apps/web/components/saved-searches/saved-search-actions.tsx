import { deleteSavedSearchFormAction, updateSavedSearchFormAction } from "@/actions/saved-searches";
import { Button } from "@/components/ui/button";

export function SavedSearchActions({ id, alertEnabled, alertFrequency }: { id: string; alertEnabled: boolean; alertFrequency: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={updateSavedSearchFormAction} className="flex gap-2">
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
