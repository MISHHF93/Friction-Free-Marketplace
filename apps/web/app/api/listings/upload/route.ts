export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "listing-images";
const MAX_FILES = 12;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to upload listing photos." }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    if (files.length === 0) return NextResponse.json({ error: "Choose at least one image." }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload up to ${MAX_FILES} photos per listing.` }, { status: 400 });

    const admin = createAdminClient();
    const uploaded = [];

    for (const [index, file] of files.entries()) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: `${file.name} must be a JPEG, PNG, WebP, HEIC, or HEIF image.` }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `${file.name} is larger than 8MB.` }, { status: 400 });
      }

      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `${user.id}/drafts/${crypto.randomUUID()}.${extension}`;
      const bytes = await file.arrayBuffer();
      const { error } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false
      });
      if (error) throw error;

      const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
      uploaded.push({
        storagePath,
        publicUrl: publicData.publicUrl,
        altText: file.name.replace(/\.[^.]+$/, ""),
        sortOrder: index
      });
    }

    return NextResponse.json({ images: uploaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload listing photos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
