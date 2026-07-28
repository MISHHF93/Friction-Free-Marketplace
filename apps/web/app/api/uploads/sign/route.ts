export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertCanUseConversation, MessagingPermissionError } from "@/lib/messaging/permissions";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

const LISTING_BUCKET = "listing-images";
const MESSAGE_BUCKET = "message-attachments";
const listingTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const messageTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "video/mp4"]);

const requestSchema = z.object({
  purpose: z.enum(["listing", "message"]),
  conversationId: z.string().uuid().optional(),
  existingCount: z.number().int().min(0).max(12).default(0),
  files: z.array(z.object({
    name: z.string().trim().min(1).max(255),
    type: z.string().trim().min(1).max(100),
    size: z.number().int().positive()
  })).min(1).max(12)
});

function extensionFor(name: string, fallback: string) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || fallback;
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const maxFiles = input.purpose === "listing" ? 12 : 5;
  const maxBytes = input.purpose === "listing" ? 8 * 1024 * 1024 : 25 * 1024 * 1024;
  const allowedTypes = input.purpose === "listing" ? listingTypes : messageTypes;
  if (input.files.length > maxFiles || (input.purpose === "listing" && input.files.length + input.existingCount > maxFiles)) {
    return NextResponse.json({ error: `Upload up to ${maxFiles} files.` }, { status: 400 });
  }
  for (const file of input.files) {
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: `${file.name} has an unsupported file type.` }, { status: 400 });
    if (file.size > maxBytes) return NextResponse.json({ error: `${file.name} exceeds the size limit.` }, { status: 400 });
  }

  if (input.purpose === "message") {
    if (!input.conversationId) return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    try {
      await assertCanUseConversation(supabase as any, input.conversationId, user.id, { requireOpen: true });
    } catch (error) {
      const status = error instanceof MessagingPermissionError ? error.status : 400;
      return NextResponse.json({ error: error instanceof Error ? error.message : "Conversation access denied." }, { status });
    }
  }

  const admin = createAdminClient();
  const bucket = input.purpose === "listing" ? LISTING_BUCKET : MESSAGE_BUCKET;
  const uploads = [];
  for (const [index, file] of input.files.entries()) {
    const folder = input.purpose === "listing" ? `${user.id}/drafts` : `${user.id}/${input.conversationId}`;
    const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file.name, input.purpose === "listing" ? "jpg" : "bin")}`;
    const { data: signedUpload, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: "Unable to authorize file upload." }, { status: 502 });

    const publicUrl = input.purpose === "listing"
      ? admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : "";

    uploads.push({
      path,
      token: signedUpload.token,
      publicUrl,
      fileName: file.name,
      contentType: file.type,
      byteSize: file.size,
      sortOrder: input.existingCount + index
    });
  }

  return NextResponse.json({ bucket, uploads }, { headers: { "Cache-Control": "no-store" } });
}
