export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { AD_CREATIVES_BUCKET } from "@/lib/ads/placements";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function extensionFor(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName === "jpg" || fromName === "jpeg" || fromName === "png" || fromName === "webp") return fromName === "jpeg" ? "jpg" : fromName;
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminPermission("ads.manage");
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 2 MB or smaller." }, { status: 400 });
  }
  const contentType = allowedTypes.has(file.type) ? file.type : null;
  if (!contentType) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  }

  const path = `campaigns/${crypto.randomUUID()}.${extensionFor(file.name, contentType)}`;
  const admin = createAdminClient();
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(AD_CREATIVES_BUCKET).upload(path, body, { contentType, upsert: false });
  if (error) return NextResponse.json({ error: "Unable to upload that image. Please try again." }, { status: 502 });

  return NextResponse.json({
    bucket: AD_CREATIVES_BUCKET,
    path,
    publicUrl: admin.storage.from(AD_CREATIVES_BUCKET).getPublicUrl(path).data.publicUrl
  }, { headers: { "Cache-Control": "no-store" } });
}
