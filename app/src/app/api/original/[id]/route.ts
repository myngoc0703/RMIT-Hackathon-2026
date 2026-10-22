import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { findArtwork, hasApproval, isOwner, originalOf } from "@/lib/store";

// The full-quality original: only its owner, or a member the owner approved (licensed collector).
export const GET = withVerified(async (req: NextRequest, jwt) => {
  const id = req.nextUrl.pathname.split("/").pop() ?? "";
  const sub = String(jwt.sub);
  if (!findArtwork(id) || !originalOf(id)) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isOwner(id, sub) && !hasApproval(id, sub)) return Response.json({ error: "Only the artist or an approved collector can open the original." }, { status: 403 });
  return Response.json({ original: originalOf(id), role: isOwner(id, sub) ? "owner" : "licensed" });
});
