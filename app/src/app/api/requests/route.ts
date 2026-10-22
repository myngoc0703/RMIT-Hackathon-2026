import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { ARTIST_ROLE } from "@/lib/roles";
import { artworkById } from "@/lib/gallery";
import { addRequest, requests } from "@/lib/store";

// Any signed-in collector can ask for the original or a licence; the identity comes from the Tide token.
export const POST = withVerified(async (req: NextRequest, jwt) => {
  const body = await req.json().catch(() => ({}));
  const art = artworkById(String(body.artworkId ?? ""));
  if (!art) return Response.json({ error: "Not found" }, { status: 404 });
  if (!art.licence) return Response.json({ error: "The artist doesn't offer this work" }, { status: 400 });
  const r = addRequest(art.id, String(jwt.preferred_username ?? jwt.sub), String(jwt.sub));
  return Response.json({ request: r });
});

// Artists see every request; collectors see their own.
export const GET = withVerified(async (_req: NextRequest, jwt) => {
  const { hasRole } = await import("@/lib/auth/tideJWT");
  const all = requests();
  const list = hasRole(jwt, ARTIST_ROLE) ? all : all.filter((r) => r.requesterSub === jwt.sub);
  return Response.json({ requests: list.map((r) => ({ ...r, title: artworkById(r.artworkId)?.title })) });
});

