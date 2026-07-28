import { NextResponse } from "next/server";

export async function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (fingerprints.length === 0) {
    return NextResponse.json({ error: "Android app association is not configured." }, { status: 503 });
  }
  return NextResponse.json([{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.frictionfreemarketplace.app",
      sha256_cert_fingerprints: fingerprints
    }
  }], { headers: { "Cache-Control": "public, max-age=3600" } });
}
