import { updateLocaleAction } from "@/app/account/actions";

const shippedLocales = [{ value: "en", label: "English" }] as const;

export function LocaleForm({ locale }: { locale: string }) {
  return (
    <form action={updateLocaleAction} className="grid gap-3 rounded-2xl border border-border p-4">
      <h2 className="text-lg font-bold">Language</h2>
      <label className="grid gap-1 text-sm font-semibold" htmlFor="profile-locale">Locale</label>
      <select id="profile-locale" name="locale" defaultValue={shippedLocales.some((item) => item.value === locale) ? locale : "en"} className="min-h-11 rounded-xl border border-border bg-background px-3">
        {shippedLocales.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <button className="min-h-11 rounded-xl bg-[#0c3f66] px-4 font-bold text-white" type="submit">Save locale</button>
    </form>
  );
}
