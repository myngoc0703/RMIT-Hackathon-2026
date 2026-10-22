import { NextRequest } from "next/server";
import { optionalAuth } from "@/lib/auth/protect";
import { findArtwork, recordView } from "@/lib/store";


// Public: records a view and issues the code that ArtCanvas hides in this viewer's copy.
// Signed-in viewers are labelled with their Tide-verified username; visitors get a number.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const art = findArtwork(String(body.artworkId ?? ""));
  if (!art) return Response.json({ error: "Not found" }, { status: 404 });
  const jwt = await optionalAuth(req);
  const rec = recordView(art.id, jwt ? String(jwt.preferred_username ?? jwt.sub) : null);
  return Response.json({ code: rec.code, viewer: rec.viewer, at: rec.at });
}
