import { NextResponse } from "next/server";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json({ error: "Apple app association is not configured." }, { status: 503 });
  }
  return NextResponse.json({
    applinks: {
      details: [{
        appIDs: [`${teamId}.com.frictionfreemarketplace.app`],
        components: [{ "/": "/*", comment: "Open marketplace links in the installed app." }]
      }]
    },
    webcredentials: { apps: [`${teamId}.com.frictionfreemarketplace.app`] }
  }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
