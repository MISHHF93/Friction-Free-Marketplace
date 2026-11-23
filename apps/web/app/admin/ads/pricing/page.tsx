import Link from "next/link";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { updateAdPricingAction } from "@/app/admin/ads/actions";
import { AD_PLACEMENTS } from "@/lib/ads/placements";
import { normalizePricingRows } from "@/lib/ads/self-serve";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function AdPricingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads/pricing", deniedPath: "/admin" });
  const params = (await searchParams) ?? {};
  const { data } = await (auth.supabase as any).from("ad_pricing").select("*");
  const rows = normalizePricingRows(Array.isArray(data) ? data : []);
  const placeholders = rows.filter((row) => row.is_placeholder).length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Self-serve ad pricing</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Price per placement per day. New checkouts use these prices; ads already paid keep the price they paid.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/ads">Back to ads</Link></Button>
      </div>
      {placeholders ? <p role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{placeholders} of {rows.length} prices are still placeholders. Set real prices before launch.</p> : null}
      {params.saved ? <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Price saved.</p> : null}
      {typeof params.error === "string" ? <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">{params.error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.placement}>
            <CardHeader><CardTitle>{AD_PLACEMENTS[row.placement].name}{row.is_placeholder ? " · placeholder" : ""}</CardTitle></CardHeader>
            <CardContent>
              <form action={updateAdPricingAction} className="grid gap-3">
                <input type="hidden" name="placement" value={row.placement} />
                <div className="grid gap-2">
                  <Label htmlFor={`price-${row.placement}`}>Price per day ({row.currency.toUpperCase()})</Label>
                  <Input id={`price-${row.placement}`} name="price_per_day" type="number" min="1" step="0.01" defaultValue={(row.price_cents_per_day / 100).toFixed(2)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`min-${row.placement}`}>Min days</Label>
                    <Input id={`min-${row.placement}`} name="min_days" type="number" min="1" max="90" defaultValue={row.min_days} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`max-${row.placement}`}>Max days</Label>
                    <Input id={`max-${row.placement}`} name="max_days" type="number" min="1" max="90" defaultValue={row.max_days} required />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="self_serve_enabled" defaultChecked={row.self_serve_enabled} /> Open for self-serve
                </label>
                <div><Button type="submit" size="sm">Save</Button></div>
              </form>
            </CardContent>
          </Card>
        ))}
        {!rows.length ? <p className="text-sm text-muted-foreground">No pricing rows. Apply the r12 migration.</p> : null}
      </div>
    </div>
  );
}
