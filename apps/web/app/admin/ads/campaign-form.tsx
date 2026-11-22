"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";
import { Label } from "@/components/ui/label";
import { AD_PLACEMENTS, AD_PLACEMENT_KEYS, type AdPlacementKey } from "@/lib/ads/placements";
import { adCreativeSrc } from "@/lib/ads/creative-url";
import type { AdCampaign } from "@/lib/ads/types";
import { createAdCampaign, updateAdCampaign, type AdCampaignFormState } from "@/app/admin/ads/actions";

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdCampaignForm({ campaign }: { campaign?: AdCampaign }) {
  const action = campaign ? updateAdCampaign : createAdCampaign;
  const [state, formAction, pending] = useActionState(action, { error: null } satisfies AdCampaignFormState);
  const [imagePath, setImagePath] = useState(campaign?.image_path ?? "");
  const [preview, setPreview] = useState(campaign ? adCreativeSrc(campaign.image_path) : null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/uploads/ad-creative", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.path !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Upload failed.");
      }
      setImagePath(payload.path);
      if (typeof payload.publicUrl === "string") setPreview(payload.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{campaign ? "Edit campaign" : "New campaign"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
          <input type="hidden" name="image_path" value={imagePath} />
          <div className="grid gap-2">
            <Label htmlFor="placement">Placement</Label>
            <select id="placement" name="placement" defaultValue={campaign?.placement ?? "home_top_banner"} className="form-control" required>
              {AD_PLACEMENT_KEYS.map((key: AdPlacementKey) => (
                <option key={key} value={key}>{AD_PLACEMENTS[key].name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={campaign?.title ?? ""} required maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="advertiser_name">Advertiser</Label>
            <Input id="advertiser_name" name="advertiser_name" defaultValue={campaign?.advertiser_name ?? ""} required maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="alt_text">Image alt text</Label>
            <Input id="alt_text" name="alt_text" defaultValue={campaign?.alt_text ?? ""} required maxLength={200} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="target_url">Destination URL</Label>
            <Input id="target_url" name="target_url" defaultValue={campaign?.target_url ?? "/search"} required placeholder="/search or https://example.com" />
            <p className="text-xs text-muted-foreground">Internal paths or https URLs only. Clicks are counted before redirect.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="creative">Creative</Label>
            <Input id="creative" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onFile(event.target.files?.[0])} />
            {uploading ? <p className="text-sm text-muted-foreground">Uploading…</p> : null}
            {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
            {preview ? (
              <span className="relative mt-2 block w-full overflow-hidden rounded-2xl border border-border" style={{ aspectRatio: "16 / 9" }}>
                {/* preview is a local object URL or public storage URL */}
                <RemoteImage src={preview} alt="Campaign creative preview" className="h-full w-full object-cover" />
              </span>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a JPG, PNG, or WebP up to 2 MB.</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toLocalInput(campaign?.starts_at ?? new Date().toISOString())} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ends_at">Ends (optional)</Label>
              <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toLocalInput(campaign?.ends_at)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Input id="priority" name="priority" type="number" defaultValue={campaign?.priority ?? 0} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" name="weight" type="number" min={1} max={1000} defaultValue={campaign?.weight ?? 1} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category_slug">Category slug (optional)</Label>
              <Input id="category_slug" name="category_slug" defaultValue={campaign?.category_slug ?? ""} placeholder="electronics" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="is_active" defaultChecked={campaign?.is_active ?? true} className="h-4 w-4" />
            Active
          </label>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending || uploading || !imagePath}>{pending ? "Saving…" : "Save campaign"}</Button>
            <Button asChild variant="outline"><Link href="/admin/ads">Cancel</Link></Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
