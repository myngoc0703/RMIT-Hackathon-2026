import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { addRequest, findArtwork, isOwner, requests } from "@/lib/store";

// Members ask an artist for an original or a licence; the identity comes from the Tide token.
export const POST = withVerified(async (req: NextRequest, jwt) => {
  const body = await req.json().catch(() => ({}));
  const art = findArtwork(String(body.artworkId ?? ""));
  if (!art) return Response.json({ error: "Not found" }, { status: 404 });
  if (isOwner(art.id, String(jwt.sub))) return Response.json({ error: "You own this artwork already." }, { status: 400 });
  if (!art.licence) return Response.json({ error: "The artist doesn't offer this work" }, { status: 400 });
  const r = addRequest(art.id, String(jwt.preferred_username ?? jwt.sub), String(jwt.sub));
  return Response.json({ request: r });
});

// Each member sees requests they made, and requests for artworks they own. Nothing else.
export const GET = withVerified(async (_req: NextRequest, jwt) => {
  const sub = String(jwt.sub);
  const list = requests()
    .filter((r) => r.requesterSub === sub || isOwner(r.artworkId, sub))
    .map((r) => ({ ...r, requesterSub: undefined, title: findArtwork(r.artworkId)?.title, mine: r.requesterSub === sub, forMyArt: isOwner(r.artworkId, sub) }));
  return Response.json({ requests: list });
});
