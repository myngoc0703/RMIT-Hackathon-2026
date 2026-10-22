import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { countLeakTraced, findArtwork, findView, isOwner } from "@/lib/store";

// Artists can trace leaks of their own artworks only.
export const GET = withVerified(async (req: NextRequest, jwt) => {
  const code = Number(req.nextUrl.searchParams.get("code"));
  const view = Number.isFinite(code) ? findView(code) : undefined;
  if (!view) return Response.json({ error: "No view with that mark" }, { status: 404 });
  if (!isOwner(view.artworkId, String(jwt.sub))) return Response.json({ error: "That copy is of an artwork you don't own." }, { status: 403 });
  countLeakTraced(String(jwt.sub));
  return Response.json({ view, artwork: findArtwork(view.artworkId)?.title });
});
