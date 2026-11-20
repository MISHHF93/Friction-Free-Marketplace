export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

const LISTING_BUCKET = "listing-images";
const listingTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_FILES = 12;
const MAX_BYTES = 8 * 1024 * 1024;

function extensionFor(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName;
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  return "jpg";
}

function contentTypeFor(file: File) {
  if (file.type && listingTypes.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return file.type;
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const formData = await request.formData();
  const existingCount = Number(formData.get("existingCount") ?? 0);
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose at least one photo." }, { status: 400 });
  if (!Number.isInteger(existingCount) || existingCount < 0 || files.length + existingCount > MAX_FILES) {
    return NextResponse.json({ error: `Upload up to ${MAX_FILES} files.` }, { status: 400 });
  }

  const admin = createAdminClient();
  const uploads = [];
  for (const [index, file] of files.entries()) {
    const contentType = contentTypeFor(file);
    if (!listingTypes.has(contentType)) return NextResponse.json({ error: `${file.name} has an unsupported file type.` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} exceeds the size limit.` }, { status: 400 });
    const path = `${user.id}/drafts/${crypto.randomUUID()}.${extensionFor(file.name, contentType)}`;
    const body = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from(LISTING_BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) return NextResponse.json({ error: "Unable to upload that photo. Please try again." }, { status: 502 });
    uploads.push({
      path,
      publicUrl: admin.storage.from(LISTING_BUCKET).getPublicUrl(path).data.publicUrl,
      sortOrder: existingCount + index
    });
  }

  return NextResponse.json({ bucket: LISTING_BUCKET, uploads }, { headers: { "Cache-Control": "no-store" } });
}
