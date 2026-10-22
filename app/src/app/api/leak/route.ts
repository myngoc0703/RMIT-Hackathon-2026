import { NextRequest } from "next/server";
import { withVerifiedRole } from "@/lib/auth/protect";
import { ARTIST_ROLE } from "@/lib/roles";
import { findView } from "@/lib/store";
import { artworkById } from "@/lib/gallery";

// Artists only: look up who was shown the copy carrying a decoded watermark code.
export const GET = withVerifiedRole(ARTIST_ROLE, async (req: NextRequest) => {
  const code = Number(req.nextUrl.searchParams.get("code"));
  const view = Number.isFinite(code) ? findView(code) : undefined;
  if (!view) return Response.json({ error: "No view with that mark" }, { status: 404 });
  return Response.json({ view, artwork: artworkById(view.artworkId)?.title });
});
