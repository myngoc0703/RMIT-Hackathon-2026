import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { isOwner, requests, setRequestStatus } from "@/lib/store";

const ACTIONS = { approve: "approved", reject: "rejected", revoke: "revoked" } as const;

// Only the artwork's owner (the Tide identity that uploaded it) can decide on access to it.
export const POST = withVerified(async (req: NextRequest, jwt) => {
  const id = req.nextUrl.pathname.split("/").pop() ?? "";
  const body = await req.json().catch(() => ({}));
  const status = ACTIONS[body.action as keyof typeof ACTIONS];
  if (!status) return Response.json({ error: "Unknown action" }, { status: 400 });
  const r = requests().find((x) => x.id === id);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isOwner(r.artworkId, String(jwt.sub))) return Response.json({ error: "Only the artist who owns this artwork can do that." }, { status: 403 });
  return Response.json({ request: setRequestStatus(id, status) });
});
